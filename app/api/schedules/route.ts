import { NextRequest, NextResponse } from 'next/server';
import { db, schedules, providers } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import cron from 'node-cron';
import type { ScheduleInfo } from '@/types';

// Validation schema for creating/updating schedules
const scheduleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  cron: z.string().min(1, 'Cron expression is required').refine(
    (val) => cron.validate(val),
    { message: 'Invalid cron expression' }
  ),
  providerId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().optional().default(true),
});

// GET /api/schedules - Get all schedules
export async function GET() {
  try {
    const result = await db
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
      .orderBy(desc(schedules.createdAt));

    const data: ScheduleInfo[] = result.map((row) => ({
      id: row.id,
      name: row.name,
      cron: row.cron,
      providerId: row.providerId,
      providerName: row.providerName,
      enabled: row.enabled,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      nextRunAt: row.nextRunAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/schedules - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { name, cron: cronExpr, providerId, enabled } = parsed.data;

    // Validate provider exists if provided
    if (providerId) {
      const [provider] = await db
        .select({ id: providers.id })
        .from(providers)
        .where(eq(providers.id, providerId));

      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 400 });
      }
    }

    const [created] = await db.insert(schedules).values({
      name,
      cron: cronExpr,
      providerId: providerId ?? null,
      enabled: enabled ?? true,
    }).returning();

    return NextResponse.json({
      id: created.id,
      name: created.name,
      cron: created.cron,
      providerId: created.providerId,
      providerName: null,
      enabled: created.enabled,
      lastRunAt: null,
      nextRunAt: null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    } satisfies ScheduleInfo, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
