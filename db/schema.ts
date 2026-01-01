import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

// API Keys table - stores each key with its own configuration
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),                    // Actual API key (plaintext)
  maskedKey: text('masked_key').notNull(),       // Display version (e.g., sk-xxxx...yyyy)
  baseUrl: text('base_url').notNull().default('https://api.openai.com'),
  model: text('model').notNull().default('gpt-3.5-turbo'),

  // Proxy configuration (nullable - no proxy by default)
  proxyType: text('proxy_type'),                 // 'http' | 'socks5' | null
  proxyHost: text('proxy_host'),
  proxyPort: integer('proxy_port'),
  proxyUsername: text('proxy_username'),
  proxyPassword: text('proxy_password'),

  // Validation state
  status: text('status').notNull().default('pending'),  // pending|valid|invalid|rate_limited|timeout|error
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
  responseTime: integer('response_time'),        // in milliseconds
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type exports for use in application code
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ApiKeyStatus = 'pending' | 'valid' | 'invalid' | 'rate_limited' | 'timeout' | 'error';
