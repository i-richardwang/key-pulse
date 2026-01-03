import type { KeyStatus, StatusConfig } from '@/types';

export const STATUS_CONFIG: Record<KeyStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
  },
  validating: {
    label: 'Validating',
    variant: 'outline',
    className: 'animate-pulse',
  },
  valid: {
    label: 'Valid',
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-600/90',
  },
  invalid: {
    label: 'Invalid',
    variant: 'destructive',
  },
  rate_limited: {
    label: 'Rate Limited',
    variant: 'outline',
    className: 'text-amber-600 border-amber-300',
  },
  timeout: {
    label: 'Timeout',
    variant: 'outline',
    className: 'text-amber-600 border-amber-300',
  },
  error: {
    label: 'Error',
    variant: 'destructive',
  },
};
