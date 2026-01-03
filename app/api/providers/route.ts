import { NextRequest, NextResponse } from 'next/server';
import { db, providers, apiKeys, proxies } from '@/db';
import { eq, sql, desc, inArray } from 'drizzle-orm';
import { parseBody, stripUndefined } from '@/lib/api-utils';
import { providerSchema, providerUpdateSchema, providerDeleteSchema } from '@/lib/schemas';

// GET /api/providers - List all providers with proxy info
export async function GET() {
  try {
    const result = await db
      .select({
        id: providers.id,
        name: providers.name,
        baseUrl: providers.baseUrl,
        model: providers.model,
        description: providers.description,
        proxyId: providers.proxyId,
        // Bifrost fields
        extraHeaders: providers.extraHeaders,
        requestTimeout: providers.requestTimeout,
        maxRetries: providers.maxRetries,
        retryBackoffInitial: providers.retryBackoffInitial,
        retryBackoffMax: providers.retryBackoffMax,
        concurrency: providers.concurrency,
        bufferSize: providers.bufferSize,
        sendBackRawRequest: providers.sendBackRawRequest,
        sendBackRawResponse: providers.sendBackRawResponse,
        baseProviderType: providers.baseProviderType,
        allowedRequests: providers.allowedRequests,
        requestPathOverrides: providers.requestPathOverrides,
        bifrostStatus: providers.bifrostStatus,
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
      .orderBy(desc(providers.createdAt));

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

// POST /api/providers - Create a new provider
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, providerSchema);
    if ('error' in parsed) return parsed.error;

    const data = parsed.data;

    const [inserted] = await db.insert(providers)
      .values({
        name: data.name,
        baseUrl: data.baseUrl,
        model: data.model,
        description: data.description,
        proxyId: data.proxyId ?? null,
        // Bifrost fields
        extraHeaders: data.extraHeaders ?? null,
        requestTimeout: data.requestTimeout ?? 30,
        maxRetries: data.maxRetries ?? 0,
        retryBackoffInitial: data.retryBackoffInitial ?? 500,
        retryBackoffMax: data.retryBackoffMax ?? 5000,
        concurrency: data.concurrency ?? 1000,
        bufferSize: data.bufferSize ?? 5000,
        sendBackRawRequest: data.sendBackRawRequest ?? false,
        sendBackRawResponse: data.sendBackRawResponse ?? false,
        baseProviderType: data.baseProviderType,
        allowedRequests: data.allowedRequests ?? null,
        requestPathOverrides: data.requestPathOverrides ?? null,
        bifrostStatus: data.bifrostStatus ?? null,
      })
      .returning();

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error) {
    console.error('Error creating provider:', error);
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Provider name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}

// PUT /api/providers - Update a provider
export async function PUT(request: NextRequest) {
  try {
    const parsed = await parseBody(request, providerUpdateSchema);
    if ('error' in parsed) return parsed.error;

    const { id, ...data } = parsed.data;

    const updateData = stripUndefined({
      ...data,
      updatedAt: new Date(),
    });

    const [updated] = await db.update(providers)
      .set(updateData)
      .where(eq(providers.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating provider:', error);
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Provider name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}

// DELETE /api/providers - Delete providers
export async function DELETE(request: NextRequest) {
  try {
    const parsed = await parseBody(request, providerDeleteSchema);
    if ('error' in parsed) return parsed.error;

    const { ids } = parsed.data;

    // Check if any keys are using these providers
    const keysUsingProviders = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(inArray(apiKeys.providerId, ids));

    if (keysUsingProviders[0]?.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${keysUsingProviders[0].count} keys are using these providers` },
        { status: 409 }
      );
    }

    await db.delete(providers).where(inArray(providers.id, ids));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting providers:', error);
    return NextResponse.json({ error: 'Failed to delete providers' }, { status: 500 });
  }
}
