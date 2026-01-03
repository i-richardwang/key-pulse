import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { ValidationConfig, ProxyConfig, KeyStatus } from '@/types';
import { maskKey } from './key-utils';

// Internal validation result (includes plaintext key for server-side use)
interface InternalValidationResult {
  key: string;
  maskedKey: string;
  status: KeyStatus;
  responseTime?: number;
  errorCode?: string;
  errorMessage?: string;
  timestamp: number;
  rawResponse?: unknown;
}

function createProxyAgent(proxy: ProxyConfig | null) {
  if (!proxy) return undefined;

  const auth = proxy.auth?.username && proxy.auth?.password
    ? `${encodeURIComponent(proxy.auth.username)}:${encodeURIComponent(proxy.auth.password)}@`
    : '';

  if (proxy.type === 'socks5') {
    return new SocksProxyAgent(`socks5://${auth}${proxy.host}:${proxy.port}`);
  } else {
    return new HttpsProxyAgent(`http://${auth}${proxy.host}:${proxy.port}`);
  }
}

function classifyError(error: unknown, statusCode?: number): KeyStatus {
  if (statusCode === 401 || statusCode === 403) {
    return 'invalid';
  }
  if (statusCode === 429) {
    return 'rate_limited';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('timeout') || message.includes('timed out') || message.includes('aborted')) {
      return 'timeout';
    }
  }

  return 'error';
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error?.message || data.message || `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
}

async function validateSingleKey(
  key: string,
  config: ValidationConfig,
  signal?: AbortSignal
): Promise<InternalValidationResult> {
  const startTime = Date.now();
  const maskedKey = maskKey(key);

  try {
    const agent = createProxyAgent(config.proxy);
    const baseUrl = config.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/v1/chat/completions`;

    const requestBody = {
      model: config.model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 20,
    };

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), config.timeout);

    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    const fetchOptions: RequestInit & { agent?: unknown } = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(requestBody),
      signal: combinedSignal,
    };

    if (agent) {
      fetchOptions.agent = agent;
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        key,
        maskedKey,
        status: 'valid',
        responseTime,
        timestamp: Date.now(),
        rawResponse: data,
      };
    }

    const errorMessage = await extractErrorMessage(response);
    const status = classifyError(null, response.status);

    return {
      key,
      maskedKey,
      status,
      responseTime,
      errorCode: String(response.status),
      errorMessage,
      timestamp: Date.now(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const status = classifyError(error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        const isTimeout = responseTime >= config.timeout - 100;
        return {
          key,
          maskedKey,
          status: isTimeout ? 'timeout' : 'error',
          responseTime,
          errorMessage: isTimeout ? 'Request timeout' : 'Request cancelled',
          timestamp: Date.now(),
        };
      }
      errorMessage = error.message;
    }

    return {
      key,
      maskedKey,
      status,
      responseTime,
      errorMessage,
      timestamp: Date.now(),
    };
  }
}

export interface ValidationTask {
  keyId: string;
  key: string;
  maskedKey: string;
  config: ValidationConfig;
}

type ValidationResult = { index: number; task: ValidationTask; result: InternalValidationResult };

/**
 * Validates multiple keys with semaphore-based concurrency control.
 * Yields results as soon as each validation completes, keeping concurrency slots filled.
 */
export async function* validateKeys(
  tasks: ValidationTask[],
  concurrency = 5,
  signal?: AbortSignal
): AsyncGenerator<ValidationResult> {
  const limit = Math.min(Math.max(1, concurrency), 10);
  const pending = new Map<number, Promise<ValidationResult>>();
  let next = 0;

  const enqueue = (i: number) => {
    const task = tasks[i];
    pending.set(i, validateSingleKey(task.key, task.config, signal).then(result => ({ index: i, task, result })));
  };

  while (next < limit && next < tasks.length) enqueue(next++);

  while (pending.size > 0) {
    const done = await Promise.race(pending.values());
    pending.delete(done.index);
    yield done;
    if (next < tasks.length && !signal?.aborted) enqueue(next++);
  }
}
