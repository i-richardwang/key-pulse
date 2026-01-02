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
