import type { ApiKeyStatus } from '@/db/schema';

// Re-export Bifrost types for convenience
export * from './bifrost';

// =============================================================================
// Status Types
// =============================================================================

// KeyStatus extends ApiKeyStatus with UI-only 'validating' state
// - ApiKeyStatus: Database-persisted states (6 values)
// - KeyStatus: UI states including transient 'validating' (7 values)
export type KeyStatus = ApiKeyStatus | 'validating';

export interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

// =============================================================================
// API Response Types (lightweight versions for client)
// =============================================================================

export interface ProxyInfo {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  extraHeaders?: Record<string, string> | null;
  requestTimeout?: number | null;
  maxRetries?: number | null;
  concurrency?: number | null;
  bufferSize?: number | null;
  baseProviderType?: string | null;
  bifrostStatus?: string | null;
}

// =============================================================================
// Validation Types
// =============================================================================

export type ProviderType = 'openai' | 'anthropic';

export interface ProxyConfig {
  type: 'http' | 'socks5';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

export interface ValidationConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  concurrency: number;
  proxy: ProxyConfig | null;
  providerType?: ProviderType;
}

export interface ValidationResult {
  maskedKey: string;
  status: KeyStatus;
  responseTime?: number;
  errorCode?: string;
  errorMessage?: string;
  timestamp: number;
  keyId?: string;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  rateLimited: number;
  timeout: number;
  error: number;
  duration: number;
}

// =============================================================================
// SSE Event Types
// =============================================================================

export type SSEEvent =
  | { type: 'start'; total: number }
  | { type: 'progress'; index: number; result: ValidationResult }
  | { type: 'complete'; summary: ValidationSummary }
  | { type: 'error'; message: string }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string; timestamp: number };

// =============================================================================
// Filter & Export Types
// =============================================================================

export interface KeyFilters {
  status?: string;
  providerId?: string;
  search?: string;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'txt';
  content: 'all' | 'valid' | 'invalid';
  includeDetails: boolean;
  filters?: KeyFilters;
}
