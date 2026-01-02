import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Proxies table - stores proxy configurations
export const proxies = pgTable('proxies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  type: text('type').notNull(),                    // 'http' | 'socks5'
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
export type ProxyType = 'http' | 'socks5';
