/**
 * KeyPulse Type Definitions
 */

// Re-export database types
export type { ApiKey, NewApiKey, ApiKeyStatus } from '@/db/schema';

/**
 * Validation Status
 */
export type ValidationStatus =
  | 'pending'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'rate_limited'
  | 'timeout'
  | 'error';

/**
 * Validation Result
 */
export interface ValidationResult {
  key: string;
  maskedKey: string;
  status: ValidationStatus;
  responseTime?: number;
  errorCode?: string;
  errorMessage?: string;
  timestamp: number;
  rawResponse?: unknown;
  keyId?: string;
}

/**
 * Proxy Configuration
 */
export interface ProxyConfig {
  type: 'http' | 'socks5';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * Validation Configuration
 */
export interface ValidationConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  concurrency: number;
  proxy: ProxyConfig | null;
}

/**
 * SSE Event Types
 */
export interface SSEStartEvent {
  type: 'start';
  total: number;
}

export interface SSEProgressEvent {
  type: 'progress';
  index: number;
  result: ValidationResult;
}

export interface SSECompleteEvent {
  type: 'complete';
  summary: ValidationSummary;
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
}

export interface SSELogEvent {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export type SSEEvent =
  | SSEStartEvent
  | SSEProgressEvent
  | SSECompleteEvent
  | SSEErrorEvent
  | SSELogEvent;

/**
 * Validation Summary
 */
export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  rateLimited: number;
  timeout: number;
  error: number;
  duration: number;
}

/**
 * Export Options
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'txt';
  content: 'all' | 'valid' | 'invalid';
  includeDetails: boolean;
}
