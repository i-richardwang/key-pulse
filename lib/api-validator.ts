/**
 * API Key 验证核心逻辑
 * 服务端代码，用于验证 API Key 有效性
 */

import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { ValidationConfig, ValidationResult, ValidationStatus, ProxyConfig } from '@/types';
import { maskKey } from './key-utils';

/**
 * 创建代理 Agent
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
 * 根据错误和状态码分类错误类型
 */
function classifyError(error: unknown, statusCode?: number): ValidationStatus {
  // HTTP 状态码分类
  if (statusCode === 401 || statusCode === 403) {
    return 'invalid';
  }
  if (statusCode === 429) {
    return 'rate_limited';
  }

  // 错误类型分类
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
 * 从错误响应中提取错误信息
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
 * 验证单个 API Key
 */
export async function validateSingleKey(
  key: string,
  config: ValidationConfig,
  signal?: AbortSignal
): Promise<ValidationResult> {
  const startTime = Date.now();
  const maskedKey = maskKey(key);

  try {
    // 创建代理 agent
    const agent = createProxyAgent(config.proxy);

    // 构建请求 URL
    const baseUrl = config.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/v1/chat/completions`;

    // 构建请求体
    const requestBody = {
      model: config.model,
      messages: [
        { role: 'user', content: 'Hi' }
      ],
      max_tokens: 20,
    };

    // 创建超时信号
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), config.timeout);

    // 合并外部信号和超时信号
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    // 发送请求
    const fetchOptions: RequestInit & { agent?: unknown } = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(requestBody),
      signal: combinedSignal,
    };

    // 如果有代理，添加 agent
    if (agent) {
      fetchOptions.agent = agent;
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    // 检查响应状态
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

    // 处理错误响应
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
        // 检查是超时还是用户取消
        if (responseTime >= config.timeout - 100) {
          return {
            key,
            maskedKey,
            status: 'timeout',
            responseTime,
            errorMessage: '请求超时',
            timestamp: Date.now(),
          };
        }
        // 用户取消
        return {
          key,
          maskedKey,
          status: 'error',
          responseTime,
          errorMessage: '请求已取消',
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
 * 并发验证多个 Key
 * 使用信号量控制并发数
 */
export async function* validateKeys(
  keys: string[],
  config: ValidationConfig,
  signal?: AbortSignal
): AsyncGenerator<{ index: number; result: ValidationResult }> {
  const concurrency = Math.max(1, Math.min(10, config.concurrency));

  // 创建任务队列
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

  // 初始化并发任务
  while (currentIndex < keys.length && currentIndex < concurrency) {
    startTask(currentIndex);
    currentIndex++;
  }

  // 处理任务完成
  while (inProgress.size > 0) {
    // 等待任意一个任务完成
    const completed = await Promise.race(inProgress.values());
    inProgress.delete(completed.index);

    // 返回结果
    yield completed;

    // 如果还有待处理的 key，启动新任务
    if (currentIndex < keys.length && !signal?.aborted) {
      startTask(currentIndex);
      currentIndex++;
    }
  }
}
