import { NextResponse } from 'next/server';
import { db, providers, apiKeys, proxies } from '@/db';
import { eq, sql, desc } from 'drizzle-orm';

// GET /api/providers - List all providers with proxy info (read-only)
export async function GET() {
  try {
    const result = await db
      .select({
        id: providers.id,
        name: providers.name,
        baseUrl: providers.baseUrl,
        model: providers.model,
        description: providers.description,
        isDefault: providers.isDefault,
        proxyId: providers.proxyId,
        createdAt: providers.createdAt,
        updatedAt: providers.updatedAt,
        keyCount: sql<number>`count(${apiKeys.id})::int`,
        proxy: {
          id: proxies.id,
          name: proxies.name,
          type: proxies.type,
          host: proxies.host,
          port: proxies.port,
        },
      })
      .from(providers)
      .leftJoin(apiKeys, eq(providers.id, apiKeys.providerId))
      .leftJoin(proxies, eq(providers.proxyId, proxies.id))
      .groupBy(providers.id, proxies.id)
      .orderBy(desc(providers.isDefault), desc(providers.createdAt));

    const transformed = result.map(row => ({
      ...row,
      proxy: row.proxy?.id ? row.proxy : null,
    }));

    return NextResponse.json({ data: transformed });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}
