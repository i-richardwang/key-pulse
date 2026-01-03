'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Proxy } from '@/db/schema';

export interface ProxyWithCount extends Proxy {
  providerCount: number;
}

export const proxyQueryKeys = {
  all: ['proxies'] as const,
  list: () => [...proxyQueryKeys.all, 'list'] as const,
};

async function fetchProxies(): Promise<ProxyWithCount[]> {
  const res = await fetch('/api/proxies');
  if (!res.ok) throw new Error('Failed to fetch proxies');
  const result = await res.json();
  return result.data;
}

export function useProxies() {
  const query = useQuery({
    queryKey: proxyQueryKeys.list(),
    queryFn: fetchProxies,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

interface CreateProxyInput {
  name: string;
  type: 'http' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  description?: string;
  isDefault?: boolean;
}

export function useCreateProxy() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: CreateProxyInput) => {
      const res = await fetch('/api/proxies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to create proxy');
      }
      const result = await res.json();
      return result.data as Proxy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyQueryKeys.all });
    },
  });

  return {
    createProxy: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

interface UpdateProxyInput {
  id: string;
  name?: string;
  type?: 'http' | 'socks5';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  description?: string;
  isDefault?: boolean;
}

export function useUpdateProxy() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateProxyInput) => {
      const res = await fetch('/api/proxies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to update proxy');
      }
      const result = await res.json();
      return result.data as Proxy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyQueryKeys.all });
    },
  });

  return {
    updateProxy: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

export function useDeleteProxies() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/proxies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to delete proxies');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyQueryKeys.all });
    },
  });

  return {
    deleteProxies: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}
