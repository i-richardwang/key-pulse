import { pgTable, uuid, text, integer, timestamp, boolean, jsonb, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Proxies table - stores proxy configurations
export const proxies = pgTable('proxies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  type: text('type').notNull(),                    // 'http' | 'socks5' | 'environment'
  host: text('host').notNull(),
  port: integer('port').notNull(),
  username: text('username'),
  password: text('password'),
  description: text('description'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Providers table - stores API provider configurations
export const providers = pgTable('providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  baseUrl: text('base_url').notNull(),
  model: text('model').notNull(),
  description: text('description'),
  isDefault: boolean('is_default').default(false),
  proxyId: uuid('proxy_id').references(() => proxies.id),  // Provider-level proxy

  // Bifrost sync identifier
  bifrostProviderName: text('bifrost_provider_name').unique(),  // Links to Bifrost provider

  // Bifrost: Network config
  extraHeaders: jsonb('extra_headers'),                    // Additional HTTP headers {"key": "value"}
  requestTimeout: integer('request_timeout').default(30), // Default request timeout in seconds
  maxRetries: integer('max_retries').default(0),          // Maximum retry attempts
  retryBackoffInitial: integer('retry_backoff_initial').default(500),   // Initial backoff in ms
  retryBackoffMax: integer('retry_backoff_max').default(5000),          // Max backoff in ms

  // Bifrost: Concurrency config
  concurrency: integer('concurrency').default(1000),      // Number of concurrent operations
  bufferSize: integer('buffer_size').default(5000),       // Buffer size

  // Bifrost: Debug options
  sendBackRawRequest: boolean('send_back_raw_request').default(false),
  sendBackRawResponse: boolean('send_back_raw_response').default(false),

  // Bifrost: Custom provider config
  baseProviderType: text('base_provider_type'),           // For custom providers: openai, anthropic, etc.
  allowedRequests: jsonb('allowed_requests'),             // Allowed request types flags
  requestPathOverrides: jsonb('request_path_overrides'),  // Custom path overrides per request type

  // Bifrost: Provider status
  bifrostStatus: text('bifrost_status'),                  // active | error | deleted

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// API Keys table - stores each key with reference to provider
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  maskedKey: text('masked_key').notNull(),
  name: text('name'),
  bifrostKeyId: text('bifrost_key_id').unique(),
  providerId: uuid('provider_id').notNull().references(() => providers.id),
  status: text('status').notNull().default('pending'),
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
  responseTime: integer('response_time'),
  errorMessage: text('error_message'),

  // Bifrost: Key config
  models: jsonb('models'),                                // List of models this key can access ["gpt-4", "gpt-3.5"]
  weight: real('weight').default(1.0),                    // Load balancing weight (0.1-1.0)
  enabled: boolean('enabled').default(true),              // Whether the key is active
  useForBatchApi: boolean('use_for_batch_api').default(false),  // Can be used for batch operations

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const proxiesRelations = relations(proxies, ({ many }) => ({
  providers: many(providers),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  proxy: one(proxies, {
    fields: [providers.proxyId],
    references: [proxies.id],
  }),
  apiKeys: many(apiKeys),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  provider: one(providers, {
    fields: [apiKeys.providerId],
    references: [providers.id],
  }),
}));

// Type exports
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

export type Proxy = typeof proxies.$inferSelect;
export type NewProxy = typeof proxies.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ApiKeyStatus = 'pending' | 'valid' | 'invalid' | 'rate_limited' | 'timeout' | 'error';
export type ProxyType = 'http' | 'socks5' | 'environment';
export type BifrostStatus = 'active' | 'error' | 'deleted';
