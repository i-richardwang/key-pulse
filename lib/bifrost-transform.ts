import type { ApiKey } from '@/db/schema';
import type {
  BifrostProviderPayload,
  BifrostKeyConfig,
  BifrostNetworkConfig,
  BifrostConcurrencyConfig,
  BifrostProxyConfig,
  BifrostCustomProviderConfig,
  BifrostProvider,
  BifrostAllowedRequests,
  ProviderWithProxy,
  KeysChangeSummary,
  ConfigChange,
  ProviderDiff,
} from '@/types/bifrost';
import { decrypt } from './crypto';

export function transformToBifrostPayload(
  provider: ProviderWithProxy,
  keys: ApiKey[]
): BifrostProviderPayload {
  const network_config: BifrostNetworkConfig = {
    base_url: provider.baseUrl,
  };
  if (provider.extraHeaders) {
    network_config.extra_headers = provider.extraHeaders as Record<string, string>;
  }
  if (provider.requestTimeout != null) {
    network_config.default_request_timeout_in_seconds = provider.requestTimeout;
  }
  if (provider.maxRetries != null) {
    network_config.max_retries = provider.maxRetries;
  }
  if (provider.retryBackoffInitial != null) {
    network_config.retry_backoff_initial = provider.retryBackoffInitial;
  }
  if (provider.retryBackoffMax != null) {
    network_config.retry_backoff_max = provider.retryBackoffMax;
  }

  const concurrency_and_buffer_size: BifrostConcurrencyConfig = {};
  if (provider.concurrency != null) {
    concurrency_and_buffer_size.concurrency = provider.concurrency;
  }
  if (provider.bufferSize != null) {
    concurrency_and_buffer_size.buffer_size = provider.bufferSize;
  }

  let proxy_config: BifrostProxyConfig | undefined;
  if (provider.proxy) {
    const proxyType = provider.proxy.type as 'http' | 'socks5';
    proxy_config = {
      type: proxyType,
      url: `${proxyType}://${provider.proxy.host}:${provider.proxy.port}`,
    };
    if (provider.proxy.username) {
      proxy_config.username = provider.proxy.username;
    }
    if (provider.proxy.password) {
      proxy_config.password = provider.proxy.password;
    }
  }

  let custom_provider_config: BifrostCustomProviderConfig | undefined;
  if (provider.baseProviderType || provider.allowedRequests || provider.requestPathOverrides) {
    custom_provider_config = {};
    if (provider.baseProviderType) {
      custom_provider_config.base_provider_type = provider.baseProviderType;
    }
    if (provider.allowedRequests) {
      custom_provider_config.allowed_requests = provider.allowedRequests as BifrostAllowedRequests;
    }
    if (provider.requestPathOverrides) {
      custom_provider_config.request_path_overrides = provider.requestPathOverrides as Record<string, string>;
    }
  }

  const bifrostKeys: BifrostKeyConfig[] = keys.map((key) => {
    const keyConfig: BifrostKeyConfig = {
      name: key.name || key.maskedKey,
      value: decrypt(key.key),
    };
    // id is required for Bifrost to match existing keys during updates
    if (key.bifrostKeyId) {
      keyConfig.id = key.bifrostKeyId;
    }
    if (key.models) {
      keyConfig.models = key.models as string[];
    }
    if (key.weight != null) {
      keyConfig.weight = key.weight;
    }
    if (key.enabled != null) {
      keyConfig.enabled = key.enabled;
    }
    if (key.useForBatchApi != null) {
      keyConfig.use_for_batch_api = key.useForBatchApi;
    }
    return keyConfig;
  });

  return {
    provider: provider.name,
    keys: bifrostKeys,
    network_config,
    concurrency_and_buffer_size:
      Object.keys(concurrency_and_buffer_size).length > 0
        ? concurrency_and_buffer_size
        : undefined,
    proxy_config,
    send_back_raw_request: provider.sendBackRawRequest ?? undefined,
    send_back_raw_response: provider.sendBackRawResponse ?? undefined,
    custom_provider_config,
  };
}

// Compare local provider + keys against remote Bifrost provider
export function diffProviderWithRemote(
  localPayload: BifrostProviderPayload,
  localKeys: ApiKey[],
  remote: BifrostProvider | null
): ProviderDiff {
  // New provider - everything is a change
  if (!remote) {
    return {
      hasChanges: true,
      keysChange: { add: localKeys.length, update: 0, delete: 0, keep: 0 },
      configChanges: [],
    };
  }

  // Build remote key map for efficient lookup
  const remoteKeyMap = new Map<string, BifrostKeyConfig>();
  for (const key of remote.keys ?? []) {
    if (key.id) {
      remoteKeyMap.set(key.id, key);
    }
  }

  // Calculate keys changes
  let add = 0;
  let update = 0;
  let keep = 0;

  for (const localKey of localKeys) {
    if (!localKey.bifrostKeyId) {
      // No bifrostKeyId means this is a new key
      add++;
      continue;
    }

    const remoteKey = remoteKeyMap.get(localKey.bifrostKeyId);
    if (!remoteKey) {
      // Key has bifrostKeyId but not found in remote (shouldn't happen normally)
      add++;
      continue;
    }

    // Compare key configurations
    if (hasKeyConfigChanged(localKey, remoteKey)) {
      update++;
    } else {
      keep++;
    }
  }

  // Keys in remote but not in local will be deleted
  const localBifrostKeyIds = new Set(localKeys.map(k => k.bifrostKeyId).filter(Boolean));
  let deleteCount = 0;
  for (const remoteKey of remote.keys ?? []) {
    if (remoteKey.id && !localBifrostKeyIds.has(remoteKey.id)) {
      deleteCount++;
    }
  }

  const keysChange: KeysChangeSummary = { add, update, delete: deleteCount, keep };

  // Compare provider config fields
  const configChanges: ConfigChange[] = [];

  const localBaseUrl = localPayload.network_config?.base_url;
  const remoteBaseUrl = remote.network_config?.base_url;
  if (localBaseUrl !== remoteBaseUrl) {
    configChanges.push({ field: 'base_url', local: localBaseUrl, remote: remoteBaseUrl });
  }

  const localTimeout = localPayload.network_config?.default_request_timeout_in_seconds;
  const remoteTimeout = remote.network_config?.default_request_timeout_in_seconds;
  if (localTimeout !== remoteTimeout) {
    configChanges.push({ field: 'timeout', local: localTimeout, remote: remoteTimeout });
  }

  const localRetries = localPayload.network_config?.max_retries;
  const remoteRetries = remote.network_config?.max_retries;
  if (localRetries !== remoteRetries) {
    configChanges.push({ field: 'max_retries', local: localRetries, remote: remoteRetries });
  }

  const localConcurrency = localPayload.concurrency_and_buffer_size?.concurrency;
  const remoteConcurrency = remote.concurrency_and_buffer_size?.concurrency;
  if (localConcurrency !== remoteConcurrency) {
    configChanges.push({ field: 'concurrency', local: localConcurrency, remote: remoteConcurrency });
  }

  const localBuffer = localPayload.concurrency_and_buffer_size?.buffer_size;
  const remoteBuffer = remote.concurrency_and_buffer_size?.buffer_size;
  if (localBuffer !== remoteBuffer) {
    configChanges.push({ field: 'buffer_size', local: localBuffer, remote: remoteBuffer });
  }

  const localProxyUrl = localPayload.proxy_config?.url;
  const remoteProxyUrl = remote.proxy_config?.url;
  if (localProxyUrl !== remoteProxyUrl) {
    configChanges.push({ field: 'proxy', local: localProxyUrl ?? 'none', remote: remoteProxyUrl ?? 'none' });
  }

  const localBaseType = localPayload.custom_provider_config?.base_provider_type;
  const remoteBaseType = remote.custom_provider_config?.base_provider_type;
  if (localBaseType !== remoteBaseType) {
    configChanges.push({ field: 'base_provider_type', local: localBaseType, remote: remoteBaseType });
  }

  // Determine if there are any changes
  const hasChanges = add > 0 || update > 0 || deleteCount > 0 || configChanges.length > 0;

  return { hasChanges, keysChange, configChanges };
}

// Compare local key against remote key to detect configuration changes
function hasKeyConfigChanged(localKey: ApiKey, remoteKey: BifrostKeyConfig): boolean {
  // Compare models (arrays need deep comparison)
  const localModels = (localKey.models as string[] | null) ?? [];
  const remoteModels = remoteKey.models ?? [];
  if (!arraysEqual(localModels, remoteModels)) {
    return true;
  }

  // Compare weight (with tolerance for floating point)
  const localWeight = localKey.weight ?? 1.0;
  const remoteWeight = remoteKey.weight ?? 1.0;
  if (Math.abs(localWeight - remoteWeight) > 0.001) {
    return true;
  }

  // Compare enabled
  const localEnabled = localKey.enabled ?? true;
  const remoteEnabled = remoteKey.enabled ?? true;
  if (localEnabled !== remoteEnabled) {
    return true;
  }

  // Compare useForBatchApi
  const localBatch = localKey.useForBatchApi ?? false;
  const remoteBatch = remoteKey.use_for_batch_api ?? false;
  if (localBatch !== remoteBatch) {
    return true;
  }

  // Compare name
  const localName = localKey.name || localKey.maskedKey;
  if (localName !== remoteKey.name) {
    return true;
  }

  return false;
}

// Helper: compare two arrays for equality (order-insensitive for models)
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}
