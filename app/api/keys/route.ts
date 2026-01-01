import { NextRequest, NextResponse } from 'next/server';
import { db, apiKeys } from '@/db';
import { eq, inArray, like, desc, asc, sql, and, SQL } from 'drizzle-orm';
import { maskKey } from '@/lib/key-utils';
import type { ApiKeyStatus } from '@/db/schema';

// GET /api/keys - List all keys with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') as ApiKeyStatus | null;
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions: SQL[] = [];
    if (status) {
      conditions.push(eq(apiKeys.status, status));
    }
    if (search) {
      conditions.push(like(apiKeys.maskedKey, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get sort column
    const sortColumn = sortBy === 'createdAt' ? apiKeys.createdAt
      : sortBy === 'updatedAt' ? apiKeys.updatedAt
      : sortBy === 'lastValidatedAt' ? apiKeys.lastValidatedAt
      : sortBy === 'status' ? apiKeys.status
      : sortBy === 'baseUrl' ? apiKeys.baseUrl
      : sortBy === 'model' ? apiKeys.model
      : apiKeys.createdAt;

    // Query keys
    const keys = await db.select()
      .from(apiKeys)
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      data: keys,
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
    const body = await request.json();

    // Support both single key and batch
    const keysToAdd: Array<{
      key: string;
      baseUrl?: string;
      model?: string;
      proxy?: {
        type: 'http' | 'socks5';
        host: string;
        port: number;
        username?: string;
        password?: string;
      };
    }> = Array.isArray(body) ? body : [body];

    if (keysToAdd.length === 0) {
      return NextResponse.json({ error: 'No keys provided' }, { status: 400 });
    }

    // Validate and prepare insert data
    const insertData = keysToAdd
      .filter(item => item.key && item.key.trim())
      .map(item => ({
        key: item.key.trim(),
        maskedKey: maskKey(item.key.trim()),
        baseUrl: item.baseUrl || process.env.DEFAULT_BASE_URL || 'https://api.openai.com',
        model: item.model || process.env.DEFAULT_MODEL || 'gpt-3.5-turbo',
        proxyType: item.proxy?.type || null,
        proxyHost: item.proxy?.host || null,
        proxyPort: item.proxy?.port || null,
        proxyUsername: item.proxy?.username || null,
        proxyPassword: item.proxy?.password || null,
        status: 'pending' as const,
      }));

    if (insertData.length === 0) {
      return NextResponse.json({ error: 'No valid keys provided' }, { status: 400 });
    }

    const inserted = await db.insert(apiKeys).values(insertData).returning();

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error) {
    console.error('Error adding keys:', error);
    return NextResponse.json({ error: 'Failed to add keys' }, { status: 500 });
  }
}

// PUT /api/keys - Batch update keys
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, updates } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'updates object required' }, { status: 400 });
    }

    // Build update data, only include allowed fields
    const allowedFields = ['baseUrl', 'model', 'proxyType', 'proxyHost', 'proxyPort', 'proxyUsername', 'proxyPassword'];
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    const updated = await db.update(apiKeys)
      .set(updateData)
      .where(inArray(apiKeys.id, ids))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating keys:', error);
    return NextResponse.json({ error: 'Failed to update keys' }, { status: 500 });
  }
}

// DELETE /api/keys - Delete keys
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    await db.delete(apiKeys).where(inArray(apiKeys.id, ids));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting keys:', error);
    return NextResponse.json({ error: 'Failed to delete keys' }, { status: 500 });
  }
}
