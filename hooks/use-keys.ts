'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { SSEEvent, ProxyInfo, ProviderInfo } from '@/types';

export type { ProxyInfo, ProviderInfo };

export interface ApiKeyWithRelations {
  id: string;
  key: string;
  maskedKey: string;
  providerId: string;
  status: string;
  lastValidatedAt: string | null;
  responseTime: number | null;
  errorMessage: string | null;
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
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useKeys(options: UseKeysOptions = {}) {
  const [data, setData] = useState<ApiKeyWithRelations[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.page) params.set('page', String(options.page));
      if (options.limit) params.set('limit', String(options.limit));
      if (options.status) params.set('status', options.status);
      if (options.search) params.set('search', options.search);
      if (options.sortBy) params.set('sortBy', options.sortBy);
      if (options.sortOrder) params.set('sortOrder', options.sortOrder);

      const res = await fetch(`/api/keys?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch keys');
      }

      const result: KeysResponse = await res.json();
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [options.page, options.limit, options.status, options.search, options.sortBy, options.sortOrder]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Update a single key's data locally (for real-time validation updates)
  const updateKeyLocally = useCallback((keyId: string, updates: Partial<ApiKeyWithRelations>) => {
    setData(prev => prev.map(key =>
      key.id === keyId ? { ...key, ...updates } : key
    ));
  }, []);

  return {
    data,
    pagination,
    isLoading,
    error,
    refetch: fetchKeys,
    updateKeyLocally,
  };
}

export function useAddKeys() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addKeys = useCallback(async (
    keys: Array<{
      key: string;
      providerId: string;
    }>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add keys');
      }

      const result = await res.json();
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { addKeys, isLoading, error };
}

export function useUpdateKeys() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateKeys = useCallback(async (
    ids: string[],
    updates: {
      providerId?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update keys');
      }

      const result = await res.json();
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateKeys, isLoading, error };
}

export function useDeleteKeys() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteKeys = useCallback(async (ids: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteKeys, isLoading, error };
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

export function useValidateKeys() {
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateKeys = useCallback(async (keyIds: string[], callbacks?: ValidateKeysCallbacks) => {
    setIsValidating(true);
    setProgress(0);
    setTotal(0);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyIds }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to start validation');
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

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
                  // Call onProgress with the validation result
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
    }
  }, []);

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
