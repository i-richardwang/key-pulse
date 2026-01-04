import { db, apiKeys, providers, proxies } from '@/db';
import { eq, SQL } from 'drizzle-orm';
import { validateKeys, type ValidationTask } from './api-validator';
import { decrypt } from './crypto';
import type { ValidationSummary, ValidationConfig, ProviderType } from '@/types';

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_TIMEOUT = 30000;

/**
 * Run validation for keys matching the given provider ID.
 * If providerId is null, validates all keys.
 * Returns a ValidationSummary with the results.
 */
export async function runValidation(
  providerId: string | null,
  signal?: AbortSignal
): Promise<ValidationSummary> {
  // Build where clause
  let whereClause: SQL | undefined;
  if (providerId) {
    whereClause = eq(apiKeys.providerId, providerId);
  }

  // Query keys with provider and proxy info
  const keys = await db
    .select({
      id: apiKeys.id,
      key: apiKeys.key,
      maskedKey: apiKeys.maskedKey,
      providerId: apiKeys.providerId,
      providerBaseUrl: providers.baseUrl,
      providerModel: providers.model,
      baseProviderType: providers.baseProviderType,
      proxyType: proxies.type,
      proxyHost: proxies.host,
      proxyPort: proxies.port,
      proxyUsername: proxies.username,
      proxyPassword: proxies.password,
    })
    .from(apiKeys)
    .leftJoin(providers, eq(apiKeys.providerId, providers.id))
    .leftJoin(proxies, eq(providers.proxyId, proxies.id))
    .where(whereClause);

  // Initialize summary
  const summary: ValidationSummary = {
    total: keys.length,
    valid: 0,
    invalid: 0,
    rateLimited: 0,
    timeout: 0,
    error: 0,
    duration: 0,
  };

  if (keys.length === 0) {
    return summary;
  }

  const startTime = Date.now();

  // Build validation tasks
  const validTasks: ValidationTask[] = [];

  for (const keyRecord of keys) {
    if (!keyRecord.providerBaseUrl || !keyRecord.providerModel) {
      summary.error++;
      continue;
    }

    const config: ValidationConfig = {
      baseUrl: keyRecord.providerBaseUrl,
      model: keyRecord.providerModel,
      timeout: DEFAULT_TIMEOUT,
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
      providerType: (keyRecord.baseProviderType as ProviderType) || 'openai',
    };

    validTasks.push({
      keyId: keyRecord.id,
      key: decrypt(keyRecord.key),
      maskedKey: keyRecord.maskedKey,
      config,
    });
  }

  // Run validation
  for await (const { task, result } of validateKeys(validTasks, DEFAULT_CONCURRENCY, signal)) {
    if (signal?.aborted) {
      break;
    }

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

    // Update summary
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
  }

  summary.duration = Date.now() - startTime;
  return summary;
}
