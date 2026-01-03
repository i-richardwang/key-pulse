// Database types
export type {
  ApiKey,
  NewApiKey,
  ApiKeyStatus,
  Proxy,
  Provider,
  ProxyType,
  BifrostStatus,
} from '@/db/schema';

// UI types (KeyStatus extends ApiKeyStatus with 'validating')
import type { KeyStatus } from '@/lib/constants';
export type { KeyStatus };

// Shared API response types
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
  // Bifrost fields
  bifrostProviderName?: string | null;
  extraHeaders?: Record<string, string> | null;
  requestTimeout?: number | null;
  maxRetries?: number | null;
  concurrency?: number | null;
  bufferSize?: number | null;
  baseProviderType?: string | null;
  bifrostStatus?: string | null;
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

export interface ProxyConfig {
  type: 'http' | 'socks5' | 'environment';
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

// SSE event types (union only, individual types not exported)
export type SSEEvent =
  | { type: 'start'; total: number }
  | { type: 'progress'; index: number; result: ValidationResult }
  | { type: 'complete'; summary: ValidationSummary }
  | { type: 'error'; message: string }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string; timestamp: number };

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
