import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Providers table - stores API provider configurations
export const providers = pgTable('providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),           // Display name, e.g., "OpenAI GPT-4"
  baseUrl: text('base_url').notNull(),             // API base URL
  model: text('model').notNull(),                  // Model name
  description: text('description'),                // Optional description
  isDefault: boolean('is_default').default(false), // Is this the default provider?
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Proxies table - stores proxy configurations
export const proxies = pgTable('proxies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),           // Display name, e.g., "HK Proxy"
  type: text('type').notNull(),                    // 'http' | 'socks5'
  host: text('host').notNull(),
  port: integer('port').notNull(),
  username: text('username'),                      // Optional auth
  password: text('password'),                      // Optional auth
  description: text('description'),                // Optional description
  isDefault: boolean('is_default').default(false), // Is this the default proxy?
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// API Keys table - stores each key with references to provider and proxy
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),                      // Actual API key (plaintext)
  maskedKey: text('masked_key').notNull(),         // Display version (e.g., sk-xxxx...yyyy)
  name: text('name'),                              // Optional key name (from Bifrost)

  // Bifrost sync
  bifrostKeyId: text('bifrost_key_id').unique(),   // Link to Bifrost config_keys.key_id

  // Foreign key references
  providerId: uuid('provider_id').notNull().references(() => providers.id),
  proxyId: uuid('proxy_id').references(() => proxies.id),  // Nullable - no proxy by default

  // Validation state
  status: text('status').notNull().default('pending'),  // pending|valid|invalid|rate_limited|timeout|error
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
  responseTime: integer('response_time'),          // in milliseconds
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Drizzle relations
export const providersRelations = relations(providers, ({ many }) => ({
  apiKeys: many(apiKeys),
}));

export const proxiesRelations = relations(proxies, ({ many }) => ({
  apiKeys: many(apiKeys),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  provider: one(providers, {
    fields: [apiKeys.providerId],
    references: [providers.id],
  }),
  proxy: one(proxies, {
    fields: [apiKeys.proxyId],
    references: [proxies.id],
  }),
}));

// Type exports for use in application code
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

export type Proxy = typeof proxies.$inferSelect;
export type NewProxy = typeof proxies.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ApiKeyStatus = 'pending' | 'valid' | 'invalid' | 'rate_limited' | 'timeout' | 'error';
export type ProxyType = 'http' | 'socks5';
