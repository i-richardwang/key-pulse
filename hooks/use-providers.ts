'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Provider } from '@/db/schema';
import type { ProxyInfo } from '@/types';

export interface ProviderWithDetails extends Provider {
  keyCount: number;
  proxy: ProxyInfo | null;
}

export const providerQueryKeys = {
  all: ['providers'] as const,
  list: () => [...providerQueryKeys.all, 'list'] as const,
};

async function fetchProviders(): Promise<ProviderWithDetails[]> {
  const res = await fetch('/api/providers');
  if (!res.ok) throw new Error('Failed to fetch providers');
  const result = await res.json();
  return result.data;
}

export function useProviders() {
  const query = useQuery({
    queryKey: providerQueryKeys.list(),
    queryFn: fetchProviders,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

interface CreateProviderInput {
  name: string;
  baseUrl: string;
  model: string;
  description?: string | null;
  proxyId?: string | null;
  bifrostProviderName?: string | null;
  extraHeaders?: Record<string, string> | null;
  requestTimeout?: number | null;
  maxRetries?: number | null;
  retryBackoffInitial?: number | null;
  retryBackoffMax?: number | null;
  concurrency?: number | null;
  bufferSize?: number | null;
  sendBackRawRequest?: boolean | null;
  sendBackRawResponse?: boolean | null;
  baseProviderType?: string | null;
  allowedRequests?: Record<string, boolean> | null;
  requestPathOverrides?: Record<string, string> | null;
  bifrostStatus?: 'active' | 'error' | 'deleted' | null;
}

export function useCreateProvider() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: CreateProviderInput) => {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to create provider');
      }
      const result = await res.json();
      return result.data as Provider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerQueryKeys.all });
    },
  });

  return {
    createProvider: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

interface UpdateProviderInput extends Partial<CreateProviderInput> {
  id: string;
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateProviderInput) => {
      const res = await fetch('/api/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to update provider');
      }
      const result = await res.json();
      return result.data as Provider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerQueryKeys.all });
    },
  });

  return {
    updateProvider: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

export function useDeleteProviders() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to delete providers');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerQueryKeys.all });
    },
  });

  return {
    deleteProviders: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}
