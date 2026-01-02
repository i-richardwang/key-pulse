import { NextResponse } from 'next/server';
import { db, providers, apiKeys } from '@/db';
import { eq, sql, desc } from 'drizzle-orm';

// GET /api/providers - List all providers (read-only)
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
        createdAt: providers.createdAt,
        updatedAt: providers.updatedAt,
        keyCount: sql<number>`count(${apiKeys.id})::int`,
      })
      .from(providers)
      .leftJoin(apiKeys, eq(providers.id, apiKeys.providerId))
      .groupBy(providers.id)
      .orderBy(desc(providers.isDefault), desc(providers.createdAt));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}
