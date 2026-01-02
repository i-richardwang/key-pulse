import { NextRequest } from 'next/server';
import { db, apiKeys, providers, proxies } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { validateKeys, type ValidationTask } from '@/lib/api-validator';
import { validateRequestSchema } from '@/lib/schemas';
import type { SSEEvent, ValidationSummary, ValidationConfig } from '@/types';

const DEFAULT_CONCURRENCY = 5;

function sendEvent(controller: ReadableStreamDefaultController, event: SSEEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

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

// POST /api/validate - Validate API keys via SSE stream
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request with Zod
    const parsed = validateRequestSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return new Response(JSON.stringify({ error: errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { keyIds } = parsed.data;

    // Fetch keys with associated provider and proxy from database
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

    // Build validation tasks with per-key configs
    const validTasks: ValidationTask[] = [];
    const invalidKeyIds: Array<{ id: string; maskedKey: string }> = [];

    for (const keyRecord of keys) {
      if (!keyRecord.providerBaseUrl || !keyRecord.providerModel) {
        invalidKeyIds.push({ id: keyRecord.id, maskedKey: keyRecord.maskedKey });
        continue;
      }

      const config: ValidationConfig = {
        baseUrl: keyRecord.providerBaseUrl,
        model: keyRecord.providerModel,
        timeout: 30000,
        concurrency: DEFAULT_CONCURRENCY,
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

      validTasks.push({
        keyId: keyRecord.id,
        key: keyRecord.key,
        maskedKey: keyRecord.maskedKey,
        config,
      });
    }

    // Create AbortController for handling client disconnect
    const abortController = new AbortController();

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const startTime = Date.now();
        const totalKeys = keys.length;
        let completedCount = 0;

        // Send start event
        sendEvent(controller, { type: 'start', total: totalKeys });
        sendLog(controller, 'info', `Starting validation of ${totalKeys} keys (concurrency: ${DEFAULT_CONCURRENCY})...`);

        // Initialize stats
        const summary: ValidationSummary = {
          total: totalKeys,
          valid: 0,
          invalid: 0,
          rateLimited: 0,
          timeout: 0,
          error: 0,
          duration: 0,
        };

        try {
          // Log keys with missing provider config
          for (const invalid of invalidKeyIds) {
            completedCount++;
            summary.error++;
            sendLog(controller, 'error', `[${completedCount}/${totalKeys}] Key ${invalid.maskedKey} missing Provider config`);
          }

          // Run concurrent validation
          for await (const { task, result } of validateKeys(validTasks, DEFAULT_CONCURRENCY, abortController.signal)) {
            if (abortController.signal.aborted) {
              break;
            }

            completedCount++;

            // Update database
            await db.update(apiKeys)
              .set({
                status: result.status,
                lastValidatedAt: new Date(),
                responseTime: result.responseTime || null,
                errorMessage: result.errorMessage || null,
                updatedAt: new Date(),
              })
              .where(eq(apiKeys.id, task.keyId));

            // Update stats
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

            // Send progress event
            sendEvent(controller, {
              type: 'progress',
              index: completedCount - 1,
              result: {
                ...result,
                keyId: task.keyId,
              },
            });

            // Send log
            const statusText = {
              valid: 'Valid',
              invalid: 'Invalid',
              rate_limited: 'Rate Limited',
              timeout: 'Timeout',
              error: 'Error',
              pending: 'Pending',
              validating: 'Validating',
            }[result.status];

            const logLevel = result.status === 'valid' ? 'info' : 'warn';
            sendLog(
              controller,
              logLevel,
              `[${completedCount}/${totalKeys}] ${result.maskedKey}: ${statusText}${
                result.errorMessage ? ` - ${result.errorMessage}` : ''
              }${result.responseTime ? ` (${result.responseTime}ms)` : ''}`
            );
          }

          // Calculate total duration
          summary.duration = Date.now() - startTime;

          // Send complete event
          sendEvent(controller, { type: 'complete', summary });
          sendLog(
            controller,
            'info',
            `Validation complete! Valid: ${summary.valid}, Invalid: ${summary.invalid}, Rate Limited: ${summary.rateLimited}, Timeout: ${summary.timeout}, Error: ${summary.error}, Duration: ${(summary.duration / 1000).toFixed(1)}s`
          );
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            sendLog(controller, 'warn', 'Validation cancelled');
          } else {
            const message = error instanceof Error ? error.message : 'Unknown error';
            sendEvent(controller, { type: 'error', message });
            sendLog(controller, 'error', `Validation error: ${message}`);
          }
        }

        controller.close();
      },
      cancel() {
        // Client disconnected, abort validation
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
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
