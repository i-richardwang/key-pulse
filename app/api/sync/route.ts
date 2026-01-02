import { NextResponse } from 'next/server';
import { db, providers, apiKeys, proxies } from '@/db';
import { eq, and } from 'drizzle-orm';
import { fetchBifrostProviders, fetchBifrostModels, isBifrostConfigured, parseProxyUrl } from '@/lib/bifrost-client';
import { fetchBifrostKeys, isBifrostDbConfigured } from '@/lib/bifrost-db';
import { maskKey } from '@/lib/key-utils';

// GET /api/sync - Check Bifrost connection status
export async function GET() {
  return NextResponse.json({
    configured: isBifrostConfigured() && isBifrostDbConfigured(),
    apiUrl: process.env.BIFROST_API_URL || null,
    hasDbConnection: isBifrostDbConfigured(),
  });
}

// POST /api/sync - Sync providers and keys from Bifrost (full replace)
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

    // Clear existing data (keys first due to foreign key)
    await db.delete(apiKeys);
    await db.delete(providers);

    const stats = { providers: 0, keys: 0, skipped: 0 };

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

      if (proxyConfig && proxyConfig.type !== 'none' && proxyConfig.url) {
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

      const [inserted] = await db.insert(providers)
        .values({
          name: provider.name,
          baseUrl,
          model,
          proxyId,
        })
        .returning({ id: providers.id });

      stats.providers++;

      // Insert keys for this provider
      const keys = keysByProvider.get(provider.name) || [];
      for (const key of keys) {
        if (!key.value) continue;

        await db.insert(apiKeys).values({
          key: key.value,
          maskedKey: maskKey(key.value),
          name: key.name || null,
          bifrostKeyId: key.id,
          providerId: inserted.id,
          status: 'pending',
        });
        stats.keys++;
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `Synced ${stats.providers} providers, ${stats.keys} keys`,
    });
  } catch (error) {
    console.error('Bifrost sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
