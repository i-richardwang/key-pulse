import { NextResponse } from 'next/server';
import { db, providers, apiKeys, proxies } from '@/db';
import { eq, and } from 'drizzle-orm';
import {
  fetchBifrostProviders,
  fetchBifrostModels,
  isBifrostConfigured,
  parseProxyUrl,
} from '@/lib/bifrost-client';
import type { BifrostProvider } from '@/types/bifrost';
import { fetchBifrostKeys, isBifrostDbConfigured } from '@/lib/bifrost-db';
import { maskKey } from '@/lib/key-utils';
import { encrypt } from '@/lib/crypto';

// GET /api/sync - Check Bifrost connection status
export async function GET() {
  return NextResponse.json({
    configured: isBifrostConfigured() && isBifrostDbConfigured(),
    apiUrl: process.env.BIFROST_API_URL || null,
    hasDbConnection: isBifrostDbConfigured(),
  });
}

// POST /api/sync - Sync providers and keys from Bifrost
export async function POST() {
  if (!isBifrostConfigured()) {
    return NextResponse.json(
      { error: 'Bifrost API is not configured. Set BIFROST_API_URL.' },
      { status: 400 }
    );
  }
  if (!isBifrostDbConfigured()) {
    return NextResponse.json(
      { error: 'Bifrost database is not configured. Set BIFROST_DATABASE_URL.' },
      { status: 400 }
    );
  }

  try {
    const [bifrostProviders, bifrostModels, bifrostKeys] = await Promise.all([
      fetchBifrostProviders(),
      fetchBifrostModels(),
      fetchBifrostKeys(),
    ]);

    const modelsByProvider = new Map(bifrostModels.map(m => [m.provider, m.name]));
    const keysByProvider = Map.groupBy(bifrostKeys, k => k.provider);

    const stats = { providers: 0, keys: 0, skipped: 0, updated: 0 };

    for (const provider of bifrostProviders) {
      const baseUrl = provider.network_config?.base_url;
      const model = modelsByProvider.get(provider.name);

      if (!baseUrl || !model) {
        stats.skipped++;
        continue;
      }

      // Find or create proxy for this provider
      let proxyId: string | null = null;
      const proxyConfig = provider.proxy_config;

      if (proxyConfig && proxyConfig.type !== 'none' && proxyConfig.type !== 'environment' && proxyConfig.url) {
        const parsed = parseProxyUrl(proxyConfig.url);
        if (parsed && (proxyConfig.type === 'http' || proxyConfig.type === 'socks5')) {
          // Check if proxy with same host + port + type exists
          const [existingProxy] = await db
            .select({ id: proxies.id })
            .from(proxies)
            .where(
              and(
                eq(proxies.host, parsed.host),
                eq(proxies.port, parsed.port),
                eq(proxies.type, proxyConfig.type)
              )
            )
            .limit(1);

          if (existingProxy) {
            proxyId = existingProxy.id;
            // Update proxy with new fields
            await db.update(proxies)
              .set({
                username: proxyConfig.username || null,
                password: proxyConfig.password || null,
                updatedAt: new Date(),
              })
              .where(eq(proxies.id, existingProxy.id));
          } else {
            // Create new proxy
            const [newProxy] = await db.insert(proxies)
              .values({
                name: `${provider.name} Proxy`,
                type: proxyConfig.type,
                host: parsed.host,
                port: parsed.port,
                username: proxyConfig.username || null,
                password: proxyConfig.password || null,
              })
              .returning({ id: proxies.id });
            proxyId = newProxy.id;
          }
        }
      }

      // Build provider data with all Bifrost fields
      const providerData = buildProviderData(provider, baseUrl, model, proxyId);

      // Check if provider with same name exists
      const [existingProvider] = await db
        .select({ id: providers.id })
        .from(providers)
        .where(eq(providers.name, provider.name))
        .limit(1);

      let providerId: string;

      if (existingProvider) {
        // Update existing provider
        await db.update(providers)
          .set({
            ...providerData,
            updatedAt: new Date(),
          })
          .where(eq(providers.id, existingProvider.id));

        // Delete existing keys for this provider (will be replaced)
        await db.delete(apiKeys).where(eq(apiKeys.providerId, existingProvider.id));

        providerId = existingProvider.id;
        stats.updated++;
      } else {
        // Insert new provider
        const [inserted] = await db.insert(providers)
          .values({
            name: provider.name,
            ...providerData,
          })
          .returning({ id: providers.id });

        providerId = inserted.id;
        stats.providers++;
      }

      // Insert keys for this provider
      const keys = keysByProvider.get(provider.name) || [];
      for (const key of keys) {
        if (!key.value) continue;

        await db.insert(apiKeys).values({
          key: encrypt(key.value),
          maskedKey: maskKey(key.value),
          name: key.name || null,
          bifrostKeyId: key.id,
          providerId,
          status: 'pending',
          // Bifrost key fields
          models: key.models,
          weight: key.weight,
          enabled: key.enabled,
          useForBatchApi: key.useForBatchApi,
        });
        stats.keys++;
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `Synced ${stats.providers} new, ${stats.updated} updated providers, ${stats.keys} keys`,
    });
  } catch (error) {
    console.error('Bifrost sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

// Helper function to build provider data from Bifrost provider
function buildProviderData(
  provider: BifrostProvider,
  baseUrl: string,
  model: string,
  proxyId: string | null
) {
  const networkConfig = provider.network_config;
  const concurrencyConfig = provider.concurrency_and_buffer_size;
  const customConfig = provider.custom_provider_config;

  return {
    baseUrl,
    model,
    proxyId,
    // Bifrost status
    bifrostStatus: provider.status,
    // Network config
    extraHeaders: networkConfig?.extra_headers || null,
    requestTimeout: networkConfig?.default_request_timeout_in_seconds ?? 30,
    maxRetries: networkConfig?.max_retries ?? 0,
    retryBackoffInitial: networkConfig?.retry_backoff_initial ?? 500,
    retryBackoffMax: networkConfig?.retry_backoff_max ?? 5000,
    // Concurrency config
    concurrency: concurrencyConfig?.concurrency ?? 1000,
    bufferSize: concurrencyConfig?.buffer_size ?? 5000,
    // Debug options
    sendBackRawRequest: provider.send_back_raw_request ?? false,
    sendBackRawResponse: provider.send_back_raw_response ?? false,
    // Custom provider config
    baseProviderType: customConfig?.base_provider_type || null,
    allowedRequests: customConfig?.allowed_requests || null,
    requestPathOverrides: customConfig?.request_path_overrides || null,
  };
}
