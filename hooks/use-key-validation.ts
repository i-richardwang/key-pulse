'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  ValidationConfig,
  ValidationResult,
  ValidationSummary,
  SSEEvent,
  LogEntry,
} from '@/types';
import { generateId } from '@/lib/key-utils';

interface UseKeyValidationReturn {
  isRunning: boolean;
  progress: number;
  total: number;
  results: ValidationResult[];
  summary: ValidationSummary | null;
  logs: LogEntry[];
  startValidation: (keys: string[], config: ValidationConfig) => Promise<void>;
  stopValidation: () => void;
  clearResults: () => void;
  validKeys: ValidationResult[];
  invalidKeys: ValidationResult[];
  rateLimitedKeys: ValidationResult[];
  timeoutKeys: ValidationResult[];
  errorKeys: ValidationResult[];
}

export function useKeyValidation(): UseKeyValidationReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: generateId(),
        level,
        message,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const startValidation = useCallback(
    async (keys: string[], config: ValidationConfig) => {
      if (isRunning) return;

      setIsRunning(true);
      setProgress(0);
      setTotal(keys.length);
      setResults([]);
      setSummary(null);
      setLogs([]);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keys, config }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Validation failed');
        }

        const reader = response.body?.getReader();
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
                const event = JSON.parse(line.slice(6)) as SSEEvent;

                switch (event.type) {
                  case 'start':
                    setTotal(event.total);
                    break;

                  case 'progress':
                    setResults((prev) => {
                      const newResults = [...prev];
                      newResults[event.index] = event.result;
                      return newResults.filter(Boolean);
                    });
                    setProgress(event.index + 1);
                    break;

                  case 'complete':
                    setSummary(event.summary);
                    break;

                  case 'error':
                    addLog('error', event.message);
                    break;

                  case 'log':
                    setLogs((prev) => [
                      ...prev,
                      {
                        id: generateId(),
                        level: event.level,
                        message: event.message,
                        timestamp: event.timestamp,
                      },
                    ]);
                    break;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          addLog('warn', 'Validation cancelled');
        } else {
          const message = error instanceof Error ? error.message : 'Unknown error';
          addLog('error', `Validation failed: ${message}`);
        }
      } finally {
        setIsRunning(false);
        abortControllerRef.current = null;
      }
    },
    [isRunning, addLog]
  );

  const stopValidation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setSummary(null);
    setLogs([]);
    setProgress(0);
    setTotal(0);
  }, []);

  const validKeys = results.filter((r) => r.status === 'valid');
  const invalidKeys = results.filter((r) => r.status === 'invalid');
  const rateLimitedKeys = results.filter((r) => r.status === 'rate_limited');
  const timeoutKeys = results.filter((r) => r.status === 'timeout');
  const errorKeys = results.filter((r) => r.status === 'error');

  return {
    isRunning,
    progress,
    total,
    results,
    summary,
    logs,
    startValidation,
    stopValidation,
    clearResults,
    validKeys,
    invalidKeys,
    rateLimitedKeys,
    timeoutKeys,
    errorKeys,
  };
}
