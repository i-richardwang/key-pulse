/**
 * API Key Validation Core Logic
 * Server-side code for validating API Key validity
 */

import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { ValidationConfig, ValidationResult, ValidationStatus, ProxyConfig } from '@/types';
import { maskKey } from './key-utils';

/**
 * Create proxy agent
 */
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

/**
 * Classify error type based on error and status code
 */
function classifyError(error: unknown, statusCode?: number): ValidationStatus {
  // HTTP status code classification
  if (statusCode === 401 || statusCode === 403) {
    return 'invalid';
  }
  if (statusCode === 429) {
    return 'rate_limited';
  }

  // Error type classification
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('timeout') || message.includes('timed out') || message.includes('aborted')) {
      return 'timeout';
    }
    if (message.includes('econnrefused') || message.includes('enotfound')) {
      return 'error';
    }
  }

  return 'error';
}

/**
 * Extract error message from response
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data.error?.message) {
      return data.error.message;
    }
    if (data.message) {
      return data.message;
    }
    return `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
}

/**
 * Validate a single API Key
 */
export async function validateSingleKey(
  key: string,
  config: ValidationConfig,
  signal?: AbortSignal
): Promise<ValidationResult> {
  const startTime = Date.now();
  const maskedKey = maskKey(key);

  try {
    // Create proxy agent
    const agent = createProxyAgent(config.proxy);

    // Build request URL
    const baseUrl = config.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/v1/chat/completions`;

    // Build request body
    const requestBody = {
      model: config.model,
      messages: [
        { role: 'user', content: 'Hi' }
      ],
      max_tokens: 20,
    };

    // Create timeout signal
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), config.timeout);

    // Combine external signal and timeout signal
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    // Send request
    const fetchOptions: RequestInit & { agent?: unknown } = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(requestBody),
      signal: combinedSignal,
    };

    // Add agent if proxy configured
    if (agent) {
      fetchOptions.agent = agent;
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    // Check response status
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

    // Handle error response
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
        // Check if timeout or user cancelled
        if (responseTime >= config.timeout - 100) {
          return {
            key,
            maskedKey,
            status: 'timeout',
            responseTime,
            errorMessage: 'Request timeout',
            timestamp: Date.now(),
          };
        }
        // User cancelled
        return {
          key,
          maskedKey,
          status: 'error',
          responseTime,
          errorMessage: 'Request cancelled',
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

/**
 * Validate multiple keys concurrently
 * Uses semaphore to control concurrency
 */
export async function* validateKeys(
  keys: string[],
  config: ValidationConfig,
  signal?: AbortSignal
): AsyncGenerator<{ index: number; result: ValidationResult }> {
  const concurrency = Math.max(1, Math.min(10, config.concurrency));

  // Create task queue
  let currentIndex = 0;
  const inProgress = new Map<number, Promise<{ index: number; result: ValidationResult }>>();

  const startTask = (index: number) => {
    const promise = validateSingleKey(keys[index], config, signal).then((result) => ({
      index,
      result,
    }));
    inProgress.set(index, promise);
    return promise;
  };

  // Initialize concurrent tasks
  while (currentIndex < keys.length && currentIndex < concurrency) {
    startTask(currentIndex);
    currentIndex++;
  }

  // Handle task completion
  while (inProgress.size > 0) {
    // Wait for any task to complete
    const completed = await Promise.race(inProgress.values());
    inProgress.delete(completed.index);

    // Yield result
    yield completed;

    // If there are pending keys, start new task
    if (currentIndex < keys.length && !signal?.aborted) {
      startTask(currentIndex);
      currentIndex++;
    }
  }
}
