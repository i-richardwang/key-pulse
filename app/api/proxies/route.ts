import { NextRequest, NextResponse } from 'next/server';
import { db, proxies, providers } from '@/db';
import { eq, inArray, sql, desc } from 'drizzle-orm';
import { parseBody, stripUndefined } from '@/lib/api-utils';
import { proxySchema, proxyUpdateSchema, proxyDeleteSchema } from '@/lib/schemas';

// GET /api/proxies - List all proxies
export async function GET() {
  try {
    // Get proxies with provider count (proxy is now at provider level)
    const result = await db
      .select({
        id: proxies.id,
        name: proxies.name,
        type: proxies.type,
        host: proxies.host,
        port: proxies.port,
        username: proxies.username,
        password: proxies.password,
        description: proxies.description,
        isDefault: proxies.isDefault,
        createdAt: proxies.createdAt,
        updatedAt: proxies.updatedAt,
        providerCount: sql<number>`count(${providers.id})::int`,
      })
      .from(proxies)
      .leftJoin(providers, eq(proxies.id, providers.proxyId))
      .groupBy(proxies.id)
      .orderBy(desc(proxies.isDefault), desc(proxies.createdAt));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error fetching proxies:', error);
    return NextResponse.json({ error: 'Failed to fetch proxies' }, { status: 500 });
  }
}

// POST /api/proxies - Create a new proxy
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, proxySchema);
    if ('error' in parsed) return parsed.error;

    const { name, type, host, port, username, password, description, isDefault } = parsed.data;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db.update(proxies)
        .set({ isDefault: false })
        .where(eq(proxies.isDefault, true));
    }

    const [inserted] = await db.insert(proxies)
      .values({
        name,
        type,
        host,
        port,
        username,
        password,
        description,
        isDefault: isDefault ?? false,
      })
      .returning();

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error) {
    console.error('Error creating proxy:', error);
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Proxy name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create proxy' }, { status: 500 });
  }
}

// PUT /api/proxies - Update a proxy
export async function PUT(request: NextRequest) {
  try {
    const parsed = await parseBody(request, proxyUpdateSchema);
    if ('error' in parsed) return parsed.error;

    const { id, isDefault, ...data } = parsed.data;

    // Handle default toggle (must run before update)
    if (isDefault) {
      await db.update(proxies)
        .set({ isDefault: false })
        .where(eq(proxies.isDefault, true));
    }

    const updateData = stripUndefined({
      ...data,
      isDefault,
      updatedAt: new Date(),
    });

    const [updated] = await db.update(proxies)
      .set(updateData)
      .where(eq(proxies.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Proxy not found' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating proxy:', error);
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Proxy name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update proxy' }, { status: 500 });
  }
}

// DELETE /api/proxies - Delete proxies
export async function DELETE(request: NextRequest) {
  try {
    const parsed = await parseBody(request, proxyDeleteSchema);
    if ('error' in parsed) return parsed.error;

    const { ids } = parsed.data;

    // Check if any provider is using these proxies
    const providersUsingProxies = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(providers)
      .where(inArray(providers.proxyId, ids));

    if (providersUsingProxies[0]?.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${providersUsingProxies[0].count} providers are using these proxies` },
        { status: 409 }
      );
    }

    await db.delete(proxies).where(inArray(proxies.id, ids));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proxies:', error);
    return NextResponse.json({ error: 'Failed to delete proxies' }, { status: 500 });
  }
}
