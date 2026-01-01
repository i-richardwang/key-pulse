/**
 * API Key 验证 SSE 接口
 * POST /api/validate
 */

import { NextRequest } from 'next/server';
import { db, apiKeys, providers, proxies } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { validateSingleKey } from '@/lib/api-validator';
import type { SSEEvent, ValidationSummary, ValidationConfig } from '@/types';

/**
 * 发送 SSE 事件
 */
function sendEvent(controller: ReadableStreamDefaultController, event: SSEEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

/**
 * 发送日志事件
 */
function sendLog(
  controller: ReadableStreamDefaultController,
  level: 'info' | 'warn' | 'error',
  message: string
) {
  sendEvent(controller, {
    type: 'log',
    level,
    message,
    timestamp: Date.now(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyIds } = body as { keyIds: string[] };

    // 验证请求
    if (!keyIds || !Array.isArray(keyIds) || keyIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No key IDs provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (keyIds.length > 1000) {
      return new Response(JSON.stringify({ error: 'Too many keys (max 1000)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 从数据库获取 keys 及其关联的 provider 和 proxy
    const keys = await db
      .select({
        id: apiKeys.id,
        key: apiKeys.key,
        maskedKey: apiKeys.maskedKey,
        providerId: apiKeys.providerId,
        proxyId: apiKeys.proxyId,
        // Provider info
        providerBaseUrl: providers.baseUrl,
        providerModel: providers.model,
        // Proxy info
        proxyType: proxies.type,
        proxyHost: proxies.host,
        proxyPort: proxies.port,
        proxyUsername: proxies.username,
        proxyPassword: proxies.password,
      })
      .from(apiKeys)
      .leftJoin(providers, eq(apiKeys.providerId, providers.id))
      .leftJoin(proxies, eq(apiKeys.proxyId, proxies.id))
      .where(inArray(apiKeys.id, keyIds));

    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: 'No keys found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 创建 AbortController 用于处理客户端断开
    const abortController = new AbortController();

    // 创建 SSE 流
    const stream = new ReadableStream({
      async start(controller) {
        const startTime = Date.now();

        // 发送开始事件
        sendEvent(controller, { type: 'start', total: keys.length });
        sendLog(controller, 'info', `开始验证 ${keys.length} 个 Key...`);

        // 初始化统计
        const summary: ValidationSummary = {
          total: keys.length,
          valid: 0,
          invalid: 0,
          rateLimited: 0,
          timeout: 0,
          error: 0,
          duration: 0,
        };

        try {
          // 逐个验证
          for (let i = 0; i < keys.length; i++) {
            const keyRecord = keys[i];

            // 检查是否已中止
            if (abortController.signal.aborted) {
              break;
            }

            // 检查 provider 是否存在
            if (!keyRecord.providerBaseUrl || !keyRecord.providerModel) {
              sendLog(controller, 'error', `[${i + 1}/${keys.length}] Key ${keyRecord.maskedKey} 缺少 Provider 配置`);
              summary.error++;
              continue;
            }

            // 构建该 key 的配置（从关联的 provider 和 proxy 获取）
            const config: ValidationConfig = {
              baseUrl: keyRecord.providerBaseUrl,
              model: keyRecord.providerModel,
              timeout: 30000,
              concurrency: 1,
              proxy: keyRecord.proxyType ? {
                type: keyRecord.proxyType as 'http' | 'socks5',
                host: keyRecord.proxyHost!,
                port: keyRecord.proxyPort!,
                auth: keyRecord.proxyUsername ? {
                  username: keyRecord.proxyUsername,
                  password: keyRecord.proxyPassword || '',
                } : undefined,
              } : null,
            };

            // 验证 key
            const result = await validateSingleKey(keyRecord.key, config, abortController.signal);

            // 更新数据库
            await db.update(apiKeys)
              .set({
                status: result.status,
                lastValidatedAt: new Date(),
                responseTime: result.responseTime || null,
                errorMessage: result.errorMessage || null,
                updatedAt: new Date(),
              })
              .where(eq(apiKeys.id, keyRecord.id));

            // 更新统计
            switch (result.status) {
              case 'valid':
                summary.valid++;
                break;
              case 'invalid':
                summary.invalid++;
                break;
              case 'rate_limited':
                summary.rateLimited++;
                break;
              case 'timeout':
                summary.timeout++;
                break;
              default:
                summary.error++;
            }

            // 发送进度事件 (使用 keyId 而非 index)
            sendEvent(controller, {
              type: 'progress',
              index: i,
              result: {
                ...result,
                keyId: keyRecord.id,
              },
            });

            // 发送日志
            const statusText = {
              valid: '有效',
              invalid: '无效',
              rate_limited: '限流',
              timeout: '超时',
              error: '错误',
              pending: '等待中',
              validating: '验证中',
            }[result.status];

            const logLevel = result.status === 'valid' ? 'info' : 'warn';
            sendLog(
              controller,
              logLevel,
              `[${i + 1}/${keys.length}] ${result.maskedKey}: ${statusText}${
                result.errorMessage ? ` - ${result.errorMessage}` : ''
              }${result.responseTime ? ` (${result.responseTime}ms)` : ''}`
            );
          }

          // 计算总耗时
          summary.duration = Date.now() - startTime;

          // 发送完成事件
          sendEvent(controller, { type: 'complete', summary });
          sendLog(
            controller,
            'info',
            `验证完成! 有效: ${summary.valid}, 无效: ${summary.invalid}, 限流: ${summary.rateLimited}, 超时: ${summary.timeout}, 错误: ${summary.error}, 耗时: ${(summary.duration / 1000).toFixed(1)}s`
          );
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            sendLog(controller, 'warn', '验证已取消');
          } else {
            const message = error instanceof Error ? error.message : 'Unknown error';
            sendEvent(controller, { type: 'error', message });
            sendLog(controller, 'error', `验证出错: ${message}`);
          }
        }

        controller.close();
      },
      cancel() {
        // 客户端断开连接时中止验证
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用 nginx 缓冲
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
