'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Provider } from '@/db/schema';

interface ProviderWithCount extends Provider {
  keyCount: number;
}

export function useProviders() {
  const [data, setData] = useState<ProviderWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/providers');
      if (!res.ok) {
        throw new Error('Failed to fetch providers');
      }

      const result = await res.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchProviders,
  };
}

export function useCreateProvider() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProvider = useCallback(async (data: {
    name: string;
    baseUrl: string;
    model: string;
    description?: string;
    isDefault?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createProvider, isLoading, error };
}

export function useUpdateProvider() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProvider = useCallback(async (data: {
    id: string;
    name?: string;
    baseUrl?: string;
    model?: string;
    description?: string;
    isDefault?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateProvider, isLoading, error };
}

export function useDeleteProviders() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProviders = useCallback(async (ids: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteProviders, isLoading, error };
}
