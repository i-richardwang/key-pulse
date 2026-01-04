'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScheduleInfo, ScheduleLogInfo } from '@/types';

export const scheduleQueryKeys = {
  all: ['schedules'] as const,
  list: () => [...scheduleQueryKeys.all, 'list'] as const,
  logs: () => [...scheduleQueryKeys.all, 'logs'] as const,
  logsForSchedule: (scheduleId: string) => [...scheduleQueryKeys.logs(), scheduleId] as const,
};

// Fetch all schedules
async function fetchSchedules(): Promise<ScheduleInfo[]> {
  const res = await fetch('/api/schedules');
  if (!res.ok) throw new Error('Failed to fetch schedules');
  return res.json();
}

// Fetch schedule logs
async function fetchScheduleLogs(scheduleId?: string): Promise<ScheduleLogInfo[]> {
  const url = scheduleId
    ? `/api/schedules/logs?scheduleId=${scheduleId}`
    : '/api/schedules/logs';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch schedule logs');
  return res.json();
}

// Get all schedules
export function useSchedules() {
  const query = useQuery({
    queryKey: scheduleQueryKeys.list(),
    queryFn: fetchSchedules,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// Get schedule logs
export function useScheduleLogs(scheduleId?: string) {
  const query = useQuery({
    queryKey: scheduleId
      ? scheduleQueryKeys.logsForSchedule(scheduleId)
      : scheduleQueryKeys.logs(),
    queryFn: () => fetchScheduleLogs(scheduleId),
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// Create schedule input
interface CreateScheduleInput {
  name: string;
  cron: string;
  providerId?: string | null;
  enabled?: boolean;
}

// Create a new schedule
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: CreateScheduleInput) => {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to create schedule');
      }
      return res.json() as Promise<ScheduleInfo>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all });
    },
  });

  return {
    createSchedule: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

// Update schedule input
interface UpdateScheduleInput {
  id: string;
  name?: string;
  cron?: string;
  providerId?: string | null;
  enabled?: boolean;
}

// Update a schedule
export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateScheduleInput) => {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to update schedule');
      }
      return res.json() as Promise<ScheduleInfo>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all });
    },
  });

  return {
    updateSchedule: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

// Delete a schedule
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to delete schedule');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all });
    },
  });

  return {
    deleteSchedule: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

// Manually trigger a schedule
export function useTriggerSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to trigger schedule');
      }
      return res.json() as Promise<ScheduleLogInfo>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all });
    },
  });

  return {
    triggerSchedule: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}
