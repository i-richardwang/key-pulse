'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import type { SSEEvent, ProxyInfo, ProviderInfo, KeyFilters } from '@/types';

export interface ApiKeyWithRelations {
  id: string;
  maskedKey: string;
  name: string | null;
  providerId: string;
  status: string;
  lastValidatedAt: string | null;
  responseTime: number | null;
  errorMessage: string | null;
  models: string[] | null;
  weight: number | null;
  enabled: boolean | null;
  useForBatchApi: boolean | null;
  createdAt: string;
  updatedAt: string;
  provider: ProviderInfo | null;
  proxy: ProxyInfo | null;
}

interface KeysResponse {
  data: ApiKeyWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseKeysOptions {
  page?: number;
  limit?: number;
  status?: string;
  providerId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Query key factory for type safety and consistency
export const keyQueryKeys = {
  all: ['keys'] as const,
  lists: () => [...keyQueryKeys.all, 'list'] as const,
  list: (options: UseKeysOptions) => [...keyQueryKeys.lists(), options] as const,
};

async function fetchKeys(options: UseKeysOptions): Promise<KeysResponse> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.status) params.set('status', options.status);
  if (options.providerId) params.set('providerId', options.providerId);
  if (options.search) params.set('search', options.search);
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sortOrder) params.set('sortOrder', options.sortOrder);

  const res = await fetch(`/api/keys?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch keys');
  return res.json();
}

export function useKeys(options: UseKeysOptions = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: keyQueryKeys.list(options),
    queryFn: () => fetchKeys(options),
  });

  // Update a single key's data locally (for real-time validation updates)
  const updateKeyLocally = useCallback((keyId: string, updates: Partial<ApiKeyWithRelations>) => {
    queryClient.setQueryData<KeysResponse>(keyQueryKeys.list(options), (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map(key => key.id === keyId ? { ...key, ...updates } : key),
      };
    });
  }, [queryClient, options]);

  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 },
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    updateKeyLocally,
  };
}

interface AddKeyInput {
  key: string;
  providerId: string;
  name?: string | null;
  models?: string[] | null;
  weight?: number;
  enabled?: boolean;
  useForBatchApi?: boolean;
}

export function useAddKeys() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (keys: AddKeyInput[]) => {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add keys');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyQueryKeys.all });
    },
  });

  return {
    addKeys: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

interface UpdateKeysInput {
  name?: string | null;
  providerId?: string;
  models?: string[] | null;
  weight?: number | null;
  enabled?: boolean | null;
  useForBatchApi?: boolean | null;
}

export function useUpdateKeys() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: UpdateKeysInput }) => {
      const res = await fetch('/api/keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update keys');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyQueryKeys.all });
    },
  });

  return {
    updateKeys: (ids: string[], updates: UpdateKeysInput) => mutation.mutateAsync({ ids, updates }),
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

export function useDeleteKeys() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete keys');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyQueryKeys.all });
    },
  });

  return {
    deleteKeys: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

export interface ValidationProgressResult {
  keyId: string;
  status: string;
  responseTime?: number;
  errorMessage?: string;
  lastValidatedAt: string;
}

export interface ValidateKeysCallbacks {
  onProgress?: (result: ValidationProgressResult) => void;
  onComplete?: () => void;
}

// SSE-based validation hook (keeps imperative control)
export function useValidateKeys() {
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateKeys = useCallback(async (
    params: { keyIds?: string[]; filters?: KeyFilters },
    callbacks?: ValidateKeysCallbacks
  ) => {
    setIsValidating(true);
    setProgress(0);
    setTotal(0);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error('Failed to start validation');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'start':
                  setTotal(event.total);
                  break;
                case 'progress':
                  setProgress(event.index + 1);
                  if (callbacks?.onProgress && event.result.keyId) {
                    callbacks.onProgress({
                      keyId: event.result.keyId,
                      status: event.result.status,
                      responseTime: event.result.responseTime,
                      errorMessage: event.result.errorMessage,
                      lastValidatedAt: new Date().toISOString(),
                    });
                  }
                  break;
                case 'complete':
                  callbacks?.onComplete?.();
                  break;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Validation error:', err.message);
      }
    } finally {
      setIsValidating(false);
      abortControllerRef.current = null;
      // Invalidate keys cache after validation completes
      queryClient.invalidateQueries({ queryKey: keyQueryKeys.all });
    }
  }, [queryClient]);

  const stopValidation = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    validateKeys,
    stopValidation,
    isValidating,
    progress,
    total,
  };
}
