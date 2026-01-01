import { NextRequest, NextResponse } from 'next/server';
import { db, proxies, apiKeys } from '@/db';
import { eq, inArray, sql, desc } from 'drizzle-orm';
import { parseBody } from '@/lib/api-utils';
import { proxySchema, proxyUpdateSchema, proxyDeleteSchema } from '@/lib/schemas';

// GET /api/proxies - List all proxies
export async function GET() {
  try {
    // Get proxies with key count
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
        keyCount: sql<number>`count(${apiKeys.id})::int`,
      })
      .from(proxies)
      .leftJoin(apiKeys, eq(proxies.id, apiKeys.proxyId))
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
        name: name.trim(),
        type,
        host: host.trim(),
        port,
        username: username?.trim() || null,
        password: password || null,
        description: description?.trim() || null,
        isDefault: isDefault || false,
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

    const { id, name, type, host, port, username, password, description, isDefault } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (host !== undefined) updateData.host = host.trim();
    if (port !== undefined) updateData.port = port;
    if (username !== undefined) updateData.username = username?.trim() || null;
    if (password !== undefined) updateData.password = password || null;
    if (description !== undefined) updateData.description = description?.trim() || null;

    // Handle default toggle
    if (isDefault !== undefined) {
      if (isDefault) {
        // Unset other defaults
        await db.update(proxies)
          .set({ isDefault: false })
          .where(eq(proxies.isDefault, true));
      }
      updateData.isDefault = isDefault;
    }

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

    // Check if any proxy has associated keys
    const keysUsingProxies = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(inArray(apiKeys.proxyId, ids));

    if (keysUsingProxies[0]?.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${keysUsingProxies[0].count} keys are using these proxies` },
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
