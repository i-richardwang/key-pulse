/**
 * Shared constants configuration
 */

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

export type KeyStatus = 'pending' | 'valid' | 'invalid' | 'validating' | 'rate_limited' | 'timeout' | 'error';

export interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export const STATUS_CONFIG: Record<KeyStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    variant: 'secondary'
  },
  validating: {
    label: 'Validating',
    variant: 'outline',
    className: 'animate-pulse'
  },
  valid: {
    label: 'Valid',
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-600/90'
  },
  invalid: {
    label: 'Invalid',
    variant: 'destructive'
  },
  rate_limited: {
    label: 'Rate Limited',
    variant: 'outline',
    className: 'text-amber-600 border-amber-300'
  },
  timeout: {
    label: 'Timeout',
    variant: 'outline',
    className: 'text-amber-600 border-amber-300'
  },
  error: {
    label: 'Error',
    variant: 'destructive'
  },
};

export type SortField = 'createdAt' | 'lastValidatedAt' | 'status' | 'baseUrl';
export type SortOrder = 'asc' | 'desc';

export type ExportFormat = 'txt' | 'csv' | 'json';
export type ExportContent = 'all' | 'valid' | 'invalid';
