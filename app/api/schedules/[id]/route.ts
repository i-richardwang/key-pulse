import { NextRequest, NextResponse } from 'next/server';
import { db, schedules, providers } from '@/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import cron from 'node-cron';
import { scheduler } from '@/lib/scheduler';
import type { ScheduleInfo } from '@/types';

// Validation schema for updating schedules
const updateScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cron: z.string().min(1).refine(
    (val) => cron.validate(val),
    { message: 'Invalid cron expression' }
  ).optional(),
  providerId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/schedules/[id] - Get a single schedule
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const [result] = await db
      .select({
        id: schedules.id,
        name: schedules.name,
        cron: schedules.cron,
        providerId: schedules.providerId,
        providerName: providers.name,
        enabled: schedules.enabled,
        lastRunAt: schedules.lastRunAt,
        nextRunAt: schedules.nextRunAt,
        createdAt: schedules.createdAt,
        updatedAt: schedules.updatedAt,
      })
      .from(schedules)
      .leftJoin(providers, eq(schedules.providerId, providers.id))
      .where(eq(schedules.id, id));

    if (!result) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const data: ScheduleInfo = {
      id: result.id,
      name: result.name,
      cron: result.cron,
      providerId: result.providerId,
      providerName: result.providerName,
      enabled: result.enabled,
      lastRunAt: result.lastRunAt?.toISOString() ?? null,
      nextRunAt: result.nextRunAt?.toISOString() ?? null,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/schedules/[id] - Update a schedule
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateScheduleSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    // Check if schedule exists
    const [existing] = await db
      .select({ id: schedules.id })
      .from(schedules)
      .where(eq(schedules.id, id));

    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Validate provider if provided
    if (parsed.data.providerId) {
      const [provider] = await db
        .select({ id: providers.id })
        .from(providers)
        .where(eq(providers.id, parsed.data.providerId));

      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 400 });
      }
    }

    const [updated] = await db.update(schedules)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id))
      .returning();

    // Get provider name
    let providerName: string | null = null;
    if (updated.providerId) {
      const [provider] = await db
        .select({ name: providers.name })
        .from(providers)
        .where(eq(providers.id, updated.providerId));
      providerName = provider?.name ?? null;
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      cron: updated.cron,
      providerId: updated.providerId,
      providerName,
      enabled: updated.enabled,
      lastRunAt: updated.lastRunAt?.toISOString() ?? null,
      nextRunAt: updated.nextRunAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    } satisfies ScheduleInfo);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/schedules/[id] - Delete a schedule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const [deleted] = await db.delete(schedules)
      .where(eq(schedules.id, id))
      .returning({ id: schedules.id });

    if (!deleted) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/schedules/[id] - Manually trigger a schedule
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await scheduler.triggerManual(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
