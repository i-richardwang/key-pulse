/**
 * 共享常量配置
 */

// 常用模型列表
export const COMMON_MODELS = [
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
] as const;

export type CommonModel = typeof COMMON_MODELS[number];

// 状态配置
export type KeyStatus = 'pending' | 'valid' | 'invalid' | 'validating' | 'rate_limited' | 'timeout' | 'error';

export interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export const STATUS_CONFIG: Record<KeyStatus, StatusConfig> = {
  pending: {
    label: '待验证',
    variant: 'secondary'
  },
  validating: {
    label: '验证中',
    variant: 'outline',
    className: 'animate-pulse'
  },
  valid: {
    label: '有效',
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-600/90'
  },
  invalid: {
    label: '无效',
    variant: 'destructive'
  },
  rate_limited: {
    label: '限流',
    variant: 'outline',
    className: 'text-amber-600 border-amber-300'
  },
  timeout: {
    label: '超时',
    variant: 'outline',
    className: 'text-amber-600 border-amber-300'
  },
  error: {
    label: '错误',
    variant: 'destructive'
  },
};

// 表格排序配置
export type SortField = 'createdAt' | 'lastValidatedAt' | 'status' | 'baseUrl';
export type SortOrder = 'asc' | 'desc';

// 导出格式
export type ExportFormat = 'txt' | 'csv' | 'json';
export type ExportContent = 'all' | 'valid' | 'invalid';
