// =============================================================================
// Bifrost Integration Types
// =============================================================================
// This module contains all types related to Bifrost API communication,
// database synchronization, and push/pull operations.

import type { Provider, Proxy } from '@/db/schema';

// =============================================================================
// Bifrost API Types - Provider Configuration
// =============================================================================

export interface BifrostProxyConfig {
  type: 'none' | 'http' | 'socks5' | 'environment';
  url?: string;
  username?: string;
  password?: string;
  ca_cert_pem?: string;
}

export interface BifrostNetworkConfig {
  base_url?: string;
  extra_headers?: Record<string, string>;
  default_request_timeout_in_seconds?: number;
  max_retries?: number;
  retry_backoff_initial?: number;
  retry_backoff_max?: number;
}

export interface BifrostConcurrencyConfig {
  concurrency?: number;
  buffer_size?: number;
}

export interface BifrostAllowedRequests {
  list_models?: boolean;
  text_completion?: boolean;
  text_completion_stream?: boolean;
  chat_completion?: boolean;
  chat_completion_stream?: boolean;
  responses?: boolean;
  responses_stream?: boolean;
  count_tokens?: boolean;
  embedding?: boolean;
  speech?: boolean;
  speech_stream?: boolean;
  transcription?: boolean;
  transcription_stream?: boolean;
  batch_create?: boolean;
  batch_list?: boolean;
  batch_retrieve?: boolean;
  batch_cancel?: boolean;
  batch_results?: boolean;
  file_upload?: boolean;
  file_list?: boolean;
  file_retrieve?: boolean;
  file_delete?: boolean;
  file_content?: boolean;
}

export interface BifrostCustomProviderConfig {
  base_provider_type?: string;
  is_key_less?: boolean;
  allowed_requests?: BifrostAllowedRequests;
  request_path_overrides?: Record<string, string>;
}

// =============================================================================
// Bifrost API Types - Key Configuration
// =============================================================================

export interface BifrostKeyConfig {
  id?: string; // Required for updating existing keys
  name: string;
  value: string;
  models?: string[];
  weight?: number;
  enabled?: boolean;
  use_for_batch_api?: boolean;
}

// =============================================================================
// Bifrost API Types - Provider (Response & Payload)
// =============================================================================

export interface BifrostProvider {
  name: string;
  network_config?: BifrostNetworkConfig;
  concurrency_and_buffer_size?: BifrostConcurrencyConfig;
  proxy_config?: BifrostProxyConfig;
  send_back_raw_request?: boolean;
  send_back_raw_response?: boolean;
  custom_provider_config?: BifrostCustomProviderConfig;
  status: 'active' | 'error' | 'deleted';
  keys?: BifrostKeyConfig[];
}

// Full provider configuration for POST/PUT requests
export interface BifrostProviderPayload {
  provider: string;
  keys: BifrostKeyConfig[];
  network_config?: BifrostNetworkConfig;
  concurrency_and_buffer_size?: BifrostConcurrencyConfig;
  proxy_config?: BifrostProxyConfig;
  send_back_raw_request?: boolean;
  send_back_raw_response?: boolean;
  custom_provider_config?: BifrostCustomProviderConfig;
}

export interface BifrostModel {
  name: string;
  provider: string;
}

// =============================================================================
// Bifrost Database Types
// =============================================================================

export interface BifrostKey {
  id: string;
  name: string;
  provider: string;
  value: string;
  models: string[] | null;
  weight: number;
  enabled: boolean;
  useForBatchApi: boolean;
}

// =============================================================================
// Sync Types - Transform & Diff
// =============================================================================

export interface ProviderWithProxy extends Provider {
  proxy?: Proxy | null;
}

export interface KeysChangeSummary {
  add: number;
  update: number;
  delete: number;
  keep: number;
}

export interface ConfigChange {
  field: string;
  local: unknown;
  remote: unknown;
}

export interface ProviderDiff {
  hasChanges: boolean;
  keysChange: KeysChangeSummary;
  configChanges: ConfigChange[];
}

// =============================================================================
// Push Sync Types - API & UI shared
// =============================================================================

export interface PreviewChange {
  providerId: string;
  providerName: string;
  action: 'create' | 'update' | 'no_change';
  keysChange: KeysChangeSummary;
  configChanges: ConfigChange[];
}

export interface PreviewError {
  providerId: string;
  providerName?: string;
  error: string;
}

export interface PushResult {
  providerId: string;
  providerName: string;
  action: 'created' | 'updated';
  keysCount: number;
}
