'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Proxy } from '@/db/schema';

interface ProxyWithCount extends Proxy {
  keyCount: number;
}

export function useProxies() {
  const [data, setData] = useState<ProxyWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProxies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/proxies');
      if (!res.ok) {
        throw new Error('Failed to fetch proxies');
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
    fetchProxies();
  }, [fetchProxies]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchProxies,
  };
}

export function useCreateProxy() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProxy = useCallback(async (data: {
    name: string;
    type: 'http' | 'socks5';
    host: string;
    port: number;
    username?: string;
    password?: string;
    description?: string;
    isDefault?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createProxy, isLoading, error };
}

export function useUpdateProxy() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProxy = useCallback(async (data: {
    id: string;
    name?: string;
    type?: 'http' | 'socks5';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    description?: string;
    isDefault?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateProxy, isLoading, error };
}

export function useDeleteProxies() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProxies = useCallback(async (ids: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteProxies, isLoading, error };
}
