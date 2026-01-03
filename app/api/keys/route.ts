import { NextRequest, NextResponse } from 'next/server';
import { db, apiKeys, providers, proxies } from '@/db';
import { eq, inArray, like, desc, asc, sql, and, SQL } from 'drizzle-orm';
import { maskKey } from '@/lib/key-utils';
import { encrypt } from '@/lib/crypto';
import { parseBody } from '@/lib/api-utils';
import { keyBatchAddSchema, keyUpdateSchema, keyDeleteSchema } from '@/lib/schemas';
import type { ApiKeyStatus } from '@/db/schema';

// GET /api/keys - List all keys with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') as ApiKeyStatus | null;
    const providerId = searchParams.get('providerId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (status) {
      conditions.push(eq(apiKeys.status, status));
    }
    if (providerId) {
      conditions.push(eq(apiKeys.providerId, providerId));
    }
    if (search) {
      conditions.push(like(apiKeys.maskedKey, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn = sortBy === 'createdAt' ? apiKeys.createdAt
      : sortBy === 'updatedAt' ? apiKeys.updatedAt
      : sortBy === 'lastValidatedAt' ? apiKeys.lastValidatedAt
      : sortBy === 'status' ? apiKeys.status
      : apiKeys.createdAt;

    const keys = await db
      .select({
        id: apiKeys.id,
        maskedKey: apiKeys.maskedKey,
        name: apiKeys.name,
        providerId: apiKeys.providerId,
        status: apiKeys.status,
        lastValidatedAt: apiKeys.lastValidatedAt,
        responseTime: apiKeys.responseTime,
        errorMessage: apiKeys.errorMessage,
        // Bifrost key fields
        models: apiKeys.models,
        weight: apiKeys.weight,
        enabled: apiKeys.enabled,
        useForBatchApi: apiKeys.useForBatchApi,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
        provider: {
          id: providers.id,
          name: providers.name,
          baseUrl: providers.baseUrl,
          model: providers.model,
        },
        proxy: {
          id: proxies.id,
          name: proxies.name,
          type: proxies.type,
          host: proxies.host,
          port: proxies.port,
        },
      })
      .from(apiKeys)
      .leftJoin(providers, eq(apiKeys.providerId, providers.id))
      .leftJoin(proxies, eq(providers.proxyId, proxies.id))
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn))
      .limit(limit)
      .offset(offset);

    const transformedKeys = keys.map(row => ({
      id: row.id,
      maskedKey: row.maskedKey,
      name: row.name,
      providerId: row.providerId,
      status: row.status,
      lastValidatedAt: row.lastValidatedAt,
      responseTime: row.responseTime,
      errorMessage: row.errorMessage,
      models: row.models,
      weight: row.weight,
      enabled: row.enabled,
      useForBatchApi: row.useForBatchApi,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      provider: row.provider?.id ? row.provider : null,
      proxy: row.proxy?.id ? row.proxy : null,
    }));

    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      data: transformedKeys,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching keys:', error);
    return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 });
  }
}

// POST /api/keys - Add keys (single or batch)
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, keyBatchAddSchema);
    if ('error' in parsed) return parsed.error;

    const keysToAdd = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

    // Validate providerId exists
    const providerIds = [...new Set(keysToAdd.map(k => k.providerId))];

    const validProviders = await db
      .select({ id: providers.id })
      .from(providers)
      .where(inArray(providers.id, providerIds));

    if (validProviders.length !== providerIds.length) {
      return NextResponse.json({ error: 'Invalid providerId' }, { status: 400 });
    }

    const insertData = keysToAdd.map(item => {
      const plainKey = item.key.trim();
      return {
        key: encrypt(plainKey),
        maskedKey: maskKey(plainKey),
        providerId: item.providerId,
        status: 'pending' as const,
        name: item.name?.trim() || null,
        models: item.models || null,
        weight: item.weight ?? 1.0,
        enabled: item.enabled ?? true,
        useForBatchApi: item.useForBatchApi ?? false,
      };
    });

    const inserted = await db.insert(apiKeys).values(insertData).returning({
      id: apiKeys.id,
      maskedKey: apiKeys.maskedKey,
      providerId: apiKeys.providerId,
      status: apiKeys.status,
      createdAt: apiKeys.createdAt,
    });

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error) {
    console.error('Error adding keys:', error);
    return NextResponse.json({ error: 'Failed to add keys' }, { status: 500 });
  }
}

// PUT /api/keys - Update keys
export async function PUT(request: NextRequest) {
  try {
    const parsed = await parseBody(request, keyUpdateSchema);
    if ('error' in parsed) return parsed.error;

    const { ids, updates } = parsed.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.providerId !== undefined) {
      const [provider] = await db
        .select({ id: providers.id })
        .from(providers)
        .where(eq(providers.id, updates.providerId));

      if (!provider) {
        return NextResponse.json({ error: 'Invalid providerId' }, { status: 400 });
      }
      updateData.providerId = updates.providerId;
    }
    if (updates.models !== undefined) updateData.models = updates.models;
    if (updates.weight !== undefined) updateData.weight = updates.weight;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.useForBatchApi !== undefined) updateData.useForBatchApi = updates.useForBatchApi;

    await db.update(apiKeys)
      .set(updateData)
      .where(inArray(apiKeys.id, ids));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating keys:', error);
    return NextResponse.json({ error: 'Failed to update keys' }, { status: 500 });
  }
}

// DELETE /api/keys - Delete keys
export async function DELETE(request: NextRequest) {
  try {
    const parsed = await parseBody(request, keyDeleteSchema);
    if ('error' in parsed) return parsed.error;

    const { ids } = parsed.data;

    await db.delete(apiKeys).where(inArray(apiKeys.id, ids));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting keys:', error);
    return NextResponse.json({ error: 'Failed to delete keys' }, { status: 500 });
  }
}
