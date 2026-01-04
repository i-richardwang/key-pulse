'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useScheduleLogs } from '@/hooks/use-schedules';
import type { ScheduleLogInfo } from '@/types';

interface ScheduleLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return '-';
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const duration = end - start;
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(1)}s`;
}

function getStatusBadge(log: ScheduleLogInfo) {
  switch (log.status) {
    case 'running':
      return <Badge variant="secondary">Running</Badge>;
    case 'completed':
      return <Badge variant="default">Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{log.status}</Badge>;
  }
}

function getSummaryText(log: ScheduleLogInfo): string {
  if (log.status === 'running') return 'In progress...';
  if (log.status === 'failed') return log.error || 'Unknown error';
  if (!log.summary) return '-';

  const { valid, invalid, rateLimited, timeout, error } = log.summary;
  const parts = [];
  if (valid > 0) parts.push(`${valid} valid`);
  if (invalid > 0) parts.push(`${invalid} invalid`);
  if (rateLimited > 0) parts.push(`${rateLimited} rate limited`);
  if (timeout > 0) parts.push(`${timeout} timeout`);
  if (error > 0) parts.push(`${error} error`);
  return parts.join(', ') || 'No keys validated';
}

export function ScheduleLogsDialog({
  open,
  onOpenChange,
  scheduleId,
}: ScheduleLogsDialogProps) {
  const { data: logs, isLoading } = useScheduleLogs(scheduleId);

  const title = scheduleId ? 'Schedule Execution History' : 'All Execution Logs';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {!scheduleId && <TableHead>Schedule</TableHead>}
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={scheduleId ? 4 : 5} className="h-24 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={scheduleId ? 4 : 5} className="h-24 text-center text-muted-foreground">
                    No execution logs yet
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    {!scheduleId && (
                      <TableCell className="font-medium">
                        {log.scheduleName || 'Unknown'}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {formatDate(log.startedAt)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatDuration(log.startedAt, log.finishedAt)}
                    </TableCell>
                    <TableCell>{getStatusBadge(log)}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {getSummaryText(log)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
