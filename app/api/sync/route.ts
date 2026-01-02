import { NextResponse } from 'next/server';
import { db, providers, apiKeys, proxies } from '@/db';
import { eq } from 'drizzle-orm';
import { fetchBifrostProviders, fetchBifrostModels, isBifrostConfigured } from '@/lib/bifrost-client';
import { fetchBifrostKeys, isBifrostDbConfigured, type BifrostKey } from '@/lib/bifrost-db';
import { maskKey } from '@/lib/key-utils';

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
    // Fetch data from Bifrost in parallel
    const [bifrostProviders, bifrostModels, bifrostKeys] = await Promise.all([
      fetchBifrostProviders(),
      fetchBifrostModels(),
      fetchBifrostKeys(),
    ]);

    // Build lookup maps
    const modelsByProvider = new Map(bifrostModels.map(m => [m.provider, m.name]));
    const keysByProvider = Map.groupBy(bifrostKeys, k => k.provider);

    // Get default proxy
    const [defaultProxy] = await db
      .select({ id: proxies.id })
      .from(proxies)
      .where(eq(proxies.isDefault, true))
      .limit(1);

    const stats = {
      providers: { created: 0, updated: 0, skipped: 0 },
      keys: { created: 0, updated: 0, skipped: 0 },
    };

    // Sync each provider and its keys
    for (const provider of bifrostProviders) {
      const baseUrl = provider.network_config?.base_url;
      const model = modelsByProvider.get(provider.name);

      // Skip providers without base_url or model
      if (!baseUrl || !model) {
        stats.providers.skipped++;
        continue;
      }

      const providerId = await upsertProvider(provider.name, baseUrl, model, stats);

      // Upsert keys for this provider
      const keys = keysByProvider.get(provider.name) || [];
      for (const key of keys) {
        await upsertKey(key, providerId, defaultProxy?.id || null, stats);
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `Synced ${stats.providers.created + stats.providers.updated} providers, ${stats.keys.created + stats.keys.updated} keys`,
    });
  } catch (error) {
    console.error('Bifrost sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

async function upsertProvider(
  name: string,
  baseUrl: string,
  model: string,
  stats: { providers: { created: number; updated: number; skipped: number } }
): Promise<string> {
  const [existing] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(eq(providers.name, name));

  if (existing) {
    await db.update(providers)
      .set({ baseUrl, model, updatedAt: new Date() })
      .where(eq(providers.id, existing.id));
    stats.providers.updated++;
    return existing.id;
  }

  const [inserted] = await db.insert(providers)
    .values({ name, baseUrl, model })
    .returning({ id: providers.id });
  stats.providers.created++;
  return inserted.id;
}

async function upsertKey(
  key: BifrostKey,
  providerId: string,
  proxyId: string | null,
  stats: { keys: { created: number; updated: number; skipped: number } }
) {
  if (!key.value) {
    stats.keys.skipped++;
    return;
  }

  const [existing] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.bifrostKeyId, key.id));

  const keyData = {
    key: key.value,
    maskedKey: maskKey(key.value),
    name: key.name || null,
    providerId,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(apiKeys).set(keyData).where(eq(apiKeys.id, existing.id));
    stats.keys.updated++;
  } else {
    await db.insert(apiKeys).values({
      ...keyData,
      proxyId,
      bifrostKeyId: key.id,
      status: 'pending',
    });
    stats.keys.created++;
  }
}
