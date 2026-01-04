import { NextRequest, NextResponse } from 'next/server';
import { db, scheduleLogs, schedules } from '@/db';
import { eq, desc } from 'drizzle-orm';
import type { ScheduleLogInfo, ValidationSummary } from '@/types';

// GET /api/schedules/logs - Get all schedule logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

    let query = db
      .select({
        id: scheduleLogs.id,
        scheduleId: scheduleLogs.scheduleId,
        scheduleName: schedules.name,
        startedAt: scheduleLogs.startedAt,
        finishedAt: scheduleLogs.finishedAt,
        status: scheduleLogs.status,
        summary: scheduleLogs.summary,
        error: scheduleLogs.error,
      })
      .from(scheduleLogs)
      .leftJoin(schedules, eq(scheduleLogs.scheduleId, schedules.id))
      .orderBy(desc(scheduleLogs.startedAt))
      .limit(limit);

    if (scheduleId) {
      query = query.where(eq(scheduleLogs.scheduleId, scheduleId)) as typeof query;
    }

    const result = await query;

    const data: ScheduleLogInfo[] = result.map((row) => ({
      id: row.id,
      scheduleId: row.scheduleId,
      scheduleName: row.scheduleName ?? undefined,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
      status: row.status as 'running' | 'completed' | 'failed',
      summary: row.summary as ValidationSummary | null,
      error: row.error,
    }));

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
