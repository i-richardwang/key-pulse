import cron, { ScheduledTask } from 'node-cron';
import { db, schedules, scheduleLogs, type Schedule } from '@/db';
import { eq } from 'drizzle-orm';
import { runValidation } from './validation-runner';
import type { ScheduleLogInfo } from '@/types';

class Scheduler {
  private jobs: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  async init(): Promise<void> {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Initializing...');

    const activeSchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.enabled, true));

    console.log(`[Scheduler] Found ${activeSchedules.length} active schedule(s)`);

    for (const schedule of activeSchedules) {
      this.addJob(schedule);
    }

    this.isRunning = true;
    console.log('[Scheduler] Initialized successfully');
  }

  addJob(schedule: Schedule): void {
    // Remove existing job if any
    this.removeJob(schedule.id);

    // Validate cron expression
    if (!cron.validate(schedule.cron)) {
      console.error(`[Scheduler] Invalid cron expression for schedule ${schedule.id}: ${schedule.cron}`);
      return;
    }

    console.log(`[Scheduler] Adding job: ${schedule.name} (${schedule.cron})`);

    const task = cron.schedule(schedule.cron, async () => {
      console.log(`[Scheduler] Executing: ${schedule.name}`);
      await this.executeValidation(schedule);
    });

    this.jobs.set(schedule.id, task);
  }

  removeJob(scheduleId: string): void {
    const existingJob = this.jobs.get(scheduleId);
    if (existingJob) {
      existingJob.stop();
      this.jobs.delete(scheduleId);
      console.log(`[Scheduler] Removed job: ${scheduleId}`);
    }
  }

  async executeValidation(schedule: Schedule): Promise<ScheduleLogInfo> {
    const startTime = new Date();

    const [log] = await db.insert(scheduleLogs).values({
      scheduleId: schedule.id,
      startedAt: startTime,
      status: 'running',
    }).returning();

    console.log(`[Scheduler] Started validation for: ${schedule.name}`);

    try {
      const summary = await runValidation(schedule.providerId);
      const finishedAt = new Date();

      await db.update(scheduleLogs)
        .set({
          finishedAt,
          status: 'completed',
          summary: summary as unknown as Record<string, unknown>,
        })
        .where(eq(scheduleLogs.id, log.id));

      await db.update(schedules)
        .set({
          lastRunAt: startTime,
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, schedule.id));

      console.log(`[Scheduler] Completed: ${schedule.name} - Valid: ${summary.valid}, Invalid: ${summary.invalid}`);

      return {
        id: log.id,
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        startedAt: startTime.toISOString(),
        finishedAt: finishedAt.toISOString(),
        status: 'completed',
        summary,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const finishedAt = new Date();

      await db.update(scheduleLogs)
        .set({
          finishedAt,
          status: 'failed',
          error: errorMessage,
        })
        .where(eq(scheduleLogs.id, log.id));

      await db.update(schedules)
        .set({
          lastRunAt: startTime,
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, schedule.id));

      console.error(`[Scheduler] Failed: ${schedule.name} - ${errorMessage}`);

      return {
        id: log.id,
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        startedAt: startTime.toISOString(),
        finishedAt: finishedAt.toISOString(),
        status: 'failed',
        summary: null,
        error: errorMessage,
      };
    }
  }

  async triggerManual(scheduleId: string): Promise<ScheduleLogInfo> {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    return this.executeValidation(schedule);
  }

  async reloadSchedule(scheduleId: string): Promise<void> {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));

    if (!schedule) {
      this.removeJob(scheduleId);
      return;
    }

    if (schedule.enabled) {
      this.addJob(schedule);
    } else {
      this.removeJob(scheduleId);
    }
  }

  shutdown(): void {
    console.log('[Scheduler] Shutting down...');
    for (const [id, job] of this.jobs) {
      job.stop();
      console.log(`[Scheduler] Stopped job: ${id}`);
    }
    this.jobs.clear();
    this.isRunning = false;
    console.log('[Scheduler] Shutdown complete');
  }

  getActiveJobCount(): number {
    return this.jobs.size;
  }
}

export const scheduler = new Scheduler();
