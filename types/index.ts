/**
 * KeyPulse 类型定义
 */

// Re-export database types
export type { ApiKey, NewApiKey, ApiKeyStatus } from '@/db/schema';

/**
 * 验证状态枚举
 */
export type ValidationStatus =
  | 'pending'      // 等待中
  | 'validating'   // 验证中
  | 'valid'        // 有效
  | 'invalid'      // 无效 (认证失败)
  | 'rate_limited' // 限流
  | 'timeout'      // 超时
  | 'error';       // 其他错误

/**
 * 验证结果
 */
export interface ValidationResult {
  key: string;                    // 原始 Key
  maskedKey: string;              // 脱敏 Key
  status: ValidationStatus;       // 状态
  responseTime?: number;          // 响应时间 (ms)
  errorCode?: string;             // 错误代码
  errorMessage?: string;          // 错误信息
  timestamp: number;              // 验证时间戳
  rawResponse?: unknown;          // 原始响应 (调试用)
  keyId?: string;                 // 数据库 Key ID
}

/**
 * 代理配置
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
 * 验证配置
 */
export interface ValidationConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  concurrency: number;
  proxy: ProxyConfig | null;
}

/**
 * 验证请求 (新版：使用 keyIds)
 */
export interface ValidateRequest {
  keyIds: string[];
}

/**
 * SSE 事件类型
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
 * 验证摘要
 */
export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  rateLimited: number;
  timeout: number;
  error: number;
  duration: number;  // 总耗时 (ms)
}

/**
 * 日志条目
 */
export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'txt';
  content: 'all' | 'valid' | 'invalid';
  includeDetails: boolean;
}

/**
 * Keys 分页响应
 */
export interface KeysResponse {
  data: import('@/db/schema').ApiKey[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 默认配置 (硬编码回退值)
 */
export const DEFAULT_CONFIG: ValidationConfig = {
  baseUrl: 'https://api.openai.com',
  model: 'gpt-3.5-turbo',
  timeout: 30000,
  concurrency: 1,
  proxy: null,
};
