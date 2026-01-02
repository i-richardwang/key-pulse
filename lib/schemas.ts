import { z } from 'zod';

// Proxy schemas
export const proxySchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).max(100),
  type: z.enum(['http', 'socks5'], { error: 'Type must be http or socks5' }),
  host: z.string().min(1, { error: 'Host is required' }),
  port: z.number().int().min(1).max(65535, { error: 'Port must be 1-65535' }),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const proxyUpdateSchema = z.object({
  id: z.uuid({ error: 'Invalid proxy ID' }),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['http', 'socks5']).optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const proxyDeleteSchema = z.object({
  ids: z.array(z.uuid()).min(1, { error: 'At least one ID is required' }),
});

// API Key schemas (proxy is now at provider level, not key level)
export const keyAddSchema = z.object({
  key: z.string().min(1, { error: 'API Key is required' }),
  providerId: z.uuid({ error: 'Provider is required' }),
});

export const keyBatchAddSchema = z.union([
  keyAddSchema,
  z.array(keyAddSchema).min(1).max(1000),
]);

export const keyUpdateSchema = z.object({
  ids: z.array(z.uuid()).min(1, { error: 'At least one ID is required' }),
  updates: z.object({
    providerId: z.uuid().optional(),
  }),
});

export const keyDeleteSchema = z.object({
  ids: z.array(z.uuid()).min(1, { error: 'At least one ID is required' }),
});

// Validation request schema
export const validateRequestSchema = z.object({
  keyIds: z.array(z.uuid()).min(1, { error: 'At least one key ID is required' }).max(1000),
});

// Auth schema
export const loginSchema = z.object({
  password: z.string().min(1, { error: 'Password is required' }),
});
