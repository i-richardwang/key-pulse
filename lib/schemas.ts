import { z } from 'zod';

// Helper: string with automatic trim
const trimmed = (schema: z.ZodString = z.string()) => schema.transform(s => s.trim());

// Helper: optional trimmed string that normalizes empty to null
const optionalTrimmed = (maxLength?: number) => {
  const base = maxLength ? z.string().max(maxLength) : z.string();
  return base.optional().nullable().transform(s => s?.trim() || null);
};

// Shared proxy fields (excluding id)
const proxyBaseFields = {
  name: trimmed(z.string().min(1, 'Name is required').max(100)),
  type: z.enum(['http', 'socks5'], { error: 'Type must be http or socks5' }),
  host: trimmed(z.string().min(1, 'Host is required')),
  port: z.number().int().min(1).max(65535, { error: 'Port must be 1-65535' }),
  username: optionalTrimmed(),
  password: z.string().optional().nullable(),
  description: optionalTrimmed(500),
};

// Proxy schemas
export const proxySchema = z.object(proxyBaseFields);

export const proxyUpdateSchema = z.object({
  id: z.uuid({ error: 'Invalid proxy ID' }),
  name: trimmed(z.string().min(1).max(100)).optional(),
  type: z.enum(['http', 'socks5']).optional(),
  host: trimmed(z.string().min(1)).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: optionalTrimmed(),
  password: z.string().optional().nullable(),
  description: optionalTrimmed(500),
});

export const proxyDeleteSchema = z.object({
  ids: z.array(z.uuid()).min(1, { error: 'At least one ID is required' }),
});

// Shared Bifrost fields for providers
const bifrostFields = {
  bifrostProviderName: optionalTrimmed(100),
  extraHeaders: z.record(z.string(), z.string()).optional().nullable(),
  requestTimeout: z.number().int().min(1).max(172800).optional().nullable(),
  maxRetries: z.number().int().min(0).max(10).optional().nullable(),
  retryBackoffInitial: z.number().int().min(100).optional().nullable(),
  retryBackoffMax: z.number().int().min(1000).optional().nullable(),
  concurrency: z.number().int().min(1).max(100000).optional().nullable(),
  bufferSize: z.number().int().min(1).max(100000).optional().nullable(),
  sendBackRawRequest: z.boolean().optional().nullable(),
  sendBackRawResponse: z.boolean().optional().nullable(),
  baseProviderType: optionalTrimmed(50),
  allowedRequests: z.record(z.string(), z.boolean()).optional().nullable(),
  requestPathOverrides: z.record(z.string(), z.string()).optional().nullable(),
  bifrostStatus: z.enum(['active', 'error', 'deleted']).optional().nullable(),
};

// Provider schemas
export const providerSchema = z.object({
  name: trimmed(z.string().min(1, 'Name is required').max(100)),
  baseUrl: trimmed(z.string().url({ error: 'Invalid URL format' })),
  model: trimmed(z.string().min(1, 'Model is required')),
  description: optionalTrimmed(500),
  proxyId: z.uuid().optional().nullable(),
  ...bifrostFields,
});

export const providerUpdateSchema = z.object({
  id: z.uuid({ error: 'Invalid provider ID' }),
  name: trimmed(z.string().min(1).max(100)).optional(),
  baseUrl: trimmed(z.string().url()).optional(),
  model: trimmed(z.string().min(1)).optional(),
  description: optionalTrimmed(500),
  proxyId: z.uuid().optional().nullable(),
  ...bifrostFields,
});

export const providerDeleteSchema = z.object({
  ids: z.array(z.uuid()).min(1, { error: 'At least one ID is required' }),
});

// API Key schemas
export const keyAddSchema = z.object({
  key: trimmed(z.string().min(1, 'API Key is required')),
  providerId: z.uuid({ error: 'Provider is required' }),
  name: optionalTrimmed(255),
  models: z.array(z.string()).optional().nullable(),
  weight: z.number().min(0.1).max(1.0).optional(),
  enabled: z.boolean().optional(),
  useForBatchApi: z.boolean().optional(),
});

export const keyBatchAddSchema = z.union([
  keyAddSchema,
  z.array(keyAddSchema).min(1).max(1000),
]);

export const keyUpdateSchema = z.object({
  ids: z.array(z.uuid()).min(1, { error: 'At least one ID is required' }),
  updates: z.object({
    name: optionalTrimmed(255),
    providerId: z.uuid().optional(),
    models: z.array(z.string()).optional().nullable(),
    weight: z.number().min(0.1).max(1.0).optional().nullable(),
    enabled: z.boolean().optional().nullable(),
    useForBatchApi: z.boolean().optional().nullable(),
  }),
});

export const keyDeleteSchema = z.object({
  ids: z.array(z.uuid()).min(1, { error: 'At least one ID is required' }),
});

export const keyExportSchema = z.object({
  format: z.enum(['json', 'csv', 'txt']),
  content: z.enum(['all', 'valid', 'invalid']),
  includeDetails: z.boolean().optional().default(false),
  filters: z.object({
    status: z.string().optional(),
    providerId: z.string().optional(),
    search: z.string().optional(),
  }).optional(),
});

// Validation request schema
export const validateRequestSchema = z.object({
  keyIds: z.array(z.uuid()).max(1000).optional(),
  filters: z.object({
    status: z.string().optional(),
    providerId: z.string().optional(),
    search: z.string().optional(),
  }).optional(),
});

// Auth schema
export const loginSchema = z.object({
  password: z.string().min(1, { error: 'Password is required' }),
});
