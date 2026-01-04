'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ScheduleDialog } from './schedule-dialog';
import { ScheduleLogsDialog } from './schedule-logs-dialog';
import {
  useSchedules,
  useDeleteSchedule,
  useUpdateSchedule,
  useTriggerSchedule,
} from '@/hooks/use-schedules';
import type { ScheduleInfo } from '@/types';
import {
  PlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  HistoryIcon,
  Loader2Icon,
} from 'lucide-react';
import { toast } from 'sonner';

function formatCron(cron: string): string {
  // Simple cron description
  const presets: Record<string, string> = {
    '0 * * * *': 'Every hour',
    '0 */6 * * *': 'Every 6 hours',
    '0 3 * * *': 'Daily at 3:00 AM',
    '0 3 * * 1': 'Weekly on Monday',
  };
  return presets[cron] || cron;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

export function SchedulesPanel() {
  const { data: schedules, isLoading, refetch } = useSchedules();
  const { deleteSchedule } = useDeleteSchedule();
  const { updateSchedule } = useUpdateSchedule();
  const { triggerSchedule, isLoading: isTriggering } = useTriggerSchedule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<ScheduleInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleInfo | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [logsScheduleId, setLogsScheduleId] = useState<string | undefined>();
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditSchedule(null);
    setDialogOpen(true);
  };

  const handleEdit = (schedule: ScheduleInfo) => {
    setEditSchedule(schedule);
    setDialogOpen(true);
  };

  const handleDeleteClick = (schedule: ScheduleInfo) => {
    setDeleteTarget(schedule);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      await deleteSchedule(deleteTarget.id);
      toast.success('Schedule deleted');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleToggleEnabled = async (schedule: ScheduleInfo) => {
    try {
      await updateSchedule({
        id: schedule.id,
        enabled: !schedule.enabled,
      });
      toast.success(schedule.enabled ? 'Schedule disabled' : 'Schedule enabled');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleTrigger = async (schedule: ScheduleInfo) => {
    setTriggeringId(schedule.id);
    try {
      const result = await triggerSchedule(schedule.id);
      if (result.status === 'completed') {
        toast.success(
          `Validation complete: ${result.summary?.valid ?? 0} valid, ${result.summary?.invalid ?? 0} invalid`
        );
      } else {
        toast.error(`Validation failed: ${result.error}`);
      }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Trigger failed');
    } finally {
      setTriggeringId(null);
    }
  };

  const handleViewLogs = (scheduleId?: string) => {
    setLogsScheduleId(scheduleId);
    setLogsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    refetch();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleAdd}>
            <PlusIcon data-icon="inline-start" />
            Add Schedule
          </Button>
          <Button variant="outline" onClick={() => handleViewLogs()}>
            <HistoryIcon data-icon="inline-start" />
            View All Logs
          </Button>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground">
          Schedules run in a separate process. Start the scheduler with:{' '}
          <code className="bg-muted px-1 py-0.5 rounded">pnpm run scheduler</code>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Enabled</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No schedules yet. Click &quot;Add Schedule&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={() => handleToggleEnabled(schedule)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {formatCron(schedule.cron)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {schedule.providerName ? (
                        <Badge variant="outline">{schedule.providerName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">All Providers</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(schedule.lastRunAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTrigger(schedule)}
                            disabled={triggeringId === schedule.id}
                          >
                            {triggeringId === schedule.id ? (
                              <Loader2Icon className="animate-spin" />
                            ) : (
                              <PlayIcon />
                            )}
                            Run Now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewLogs(schedule.id)}>
                            <HistoryIcon />
                            View Logs
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDeleteClick(schedule)}
                          >
                            <TrashIcon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editSchedule={editSchedule}
        onSuccess={handleDialogSuccess}
      />

      {/* Logs Dialog */}
      <ScheduleLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        scheduleId={logsScheduleId}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Schedule"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all execution logs.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
