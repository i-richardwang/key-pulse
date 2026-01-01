import { NextRequest, NextResponse } from 'next/server';
import { db, providers, apiKeys } from '@/db';
import { eq, inArray, sql, desc } from 'drizzle-orm';

// GET /api/providers - List all providers
export async function GET() {
  try {
    // Get providers with key count
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

// POST /api/providers - Create a new provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, baseUrl, model, description, isDefault } = body;

    if (!name || !baseUrl || !model) {
      return NextResponse.json(
        { error: 'name, baseUrl, and model are required' },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db.update(providers)
        .set({ isDefault: false })
        .where(eq(providers.isDefault, true));
    }

    const [inserted] = await db.insert(providers)
      .values({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        description: description?.trim() || null,
        isDefault: isDefault || false,
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
    const body = await request.json();
    const { id, name, baseUrl, model, description, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl.trim();
    if (model !== undefined) updateData.model = model.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    // Handle default toggle
    if (isDefault !== undefined) {
      if (isDefault) {
        // Unset other defaults
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
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    // Check if any provider has associated keys
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
