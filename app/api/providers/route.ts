import { NextRequest, NextResponse } from 'next/server';
import { db, providers, apiKeys, proxies } from '@/db';
import { eq, sql, desc, inArray } from 'drizzle-orm';
import { parseBody } from '@/lib/api-utils';
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
        isDefault: providers.isDefault,
        proxyId: providers.proxyId,
        // Bifrost fields
        bifrostProviderName: providers.bifrostProviderName,
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

// POST /api/providers - Create a new provider
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, providerSchema);
    if ('error' in parsed) return parsed.error;

    const data = parsed.data;

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db.update(providers)
        .set({ isDefault: false })
        .where(eq(providers.isDefault, true));
    }

    const [inserted] = await db.insert(providers)
      .values({
        name: data.name.trim(),
        baseUrl: data.baseUrl.trim(),
        model: data.model.trim(),
        description: data.description?.trim() || null,
        isDefault: data.isDefault || false,
        proxyId: data.proxyId || null,
        // Bifrost fields
        bifrostProviderName: data.bifrostProviderName?.trim() || null,
        extraHeaders: data.extraHeaders || null,
        requestTimeout: data.requestTimeout ?? 30,
        maxRetries: data.maxRetries ?? 0,
        retryBackoffInitial: data.retryBackoffInitial ?? 500,
        retryBackoffMax: data.retryBackoffMax ?? 5000,
        concurrency: data.concurrency ?? 1000,
        bufferSize: data.bufferSize ?? 5000,
        sendBackRawRequest: data.sendBackRawRequest ?? false,
        sendBackRawResponse: data.sendBackRawResponse ?? false,
        baseProviderType: data.baseProviderType?.trim() || null,
        allowedRequests: data.allowedRequests || null,
        requestPathOverrides: data.requestPathOverrides || null,
        bifrostStatus: data.bifrostStatus || null,
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

    const { id, isDefault, ...data } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Core fields
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl.trim();
    if (data.model !== undefined) updateData.model = data.model.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.proxyId !== undefined) updateData.proxyId = data.proxyId || null;

    // Bifrost fields
    if (data.bifrostProviderName !== undefined) updateData.bifrostProviderName = data.bifrostProviderName?.trim() || null;
    if (data.extraHeaders !== undefined) updateData.extraHeaders = data.extraHeaders || null;
    if (data.requestTimeout !== undefined) updateData.requestTimeout = data.requestTimeout;
    if (data.maxRetries !== undefined) updateData.maxRetries = data.maxRetries;
    if (data.retryBackoffInitial !== undefined) updateData.retryBackoffInitial = data.retryBackoffInitial;
    if (data.retryBackoffMax !== undefined) updateData.retryBackoffMax = data.retryBackoffMax;
    if (data.concurrency !== undefined) updateData.concurrency = data.concurrency;
    if (data.bufferSize !== undefined) updateData.bufferSize = data.bufferSize;
    if (data.sendBackRawRequest !== undefined) updateData.sendBackRawRequest = data.sendBackRawRequest;
    if (data.sendBackRawResponse !== undefined) updateData.sendBackRawResponse = data.sendBackRawResponse;
    if (data.baseProviderType !== undefined) updateData.baseProviderType = data.baseProviderType?.trim() || null;
    if (data.allowedRequests !== undefined) updateData.allowedRequests = data.allowedRequests || null;
    if (data.requestPathOverrides !== undefined) updateData.requestPathOverrides = data.requestPathOverrides || null;
    if (data.bifrostStatus !== undefined) updateData.bifrostStatus = data.bifrostStatus || null;

    // Handle default toggle
    if (isDefault !== undefined) {
      if (isDefault) {
        await db.update(providers)
          .set({ isDefault: false })
          .where(eq(providers.isDefault, true));
      }
      updateData.isDefault = isDefault;
    }

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
