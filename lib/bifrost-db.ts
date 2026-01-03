import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, boolean, real, jsonb } from 'drizzle-orm/pg-core';
import { eq, and, isNotNull } from 'drizzle-orm';
import { Pool } from 'pg';

// Bifrost config_keys table schema (read-only)
const configKeys = pgTable('config_keys', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  keyId: text('key_id').notNull().unique(),
  value: text('value').notNull(),
  modelsJson: text('models_json'),           // JSON string of models array
  weight: real('weight').default(1.0),
  enabled: boolean('enabled').default(true),
  useForBatchApi: boolean('use_for_batch_api').default(false),
});

export interface BifrostKey {
  id: string;
  name: string;
  provider: string;
  value: string;
  models: string[] | null;
  weight: number;
  enabled: boolean;
  useForBatchApi: boolean;
}

let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db) {
    const connectionString = process.env.BIFROST_DATABASE_URL;
    if (!connectionString) {
      throw new Error('BIFROST_DATABASE_URL is not configured');
    }
    db = drizzle(new Pool({ connectionString }));
  }
  return db;
}

export function isBifrostDbConfigured(): boolean {
  return !!process.env.BIFROST_DATABASE_URL;
}

export async function fetchBifrostKeys(): Promise<BifrostKey[]> {
  const rows = await getDb()
    .select({
      keyId: configKeys.keyId,
      name: configKeys.name,
      provider: configKeys.provider,
      value: configKeys.value,
      modelsJson: configKeys.modelsJson,
      weight: configKeys.weight,
      enabled: configKeys.enabled,
      useForBatchApi: configKeys.useForBatchApi,
    })
    .from(configKeys)
    .where(and(
      eq(configKeys.enabled, true),
      isNotNull(configKeys.value)
    ));

  return rows.map(row => ({
    id: row.keyId,
    name: row.name,
    provider: row.provider,
    value: row.value,
    models: row.modelsJson ? JSON.parse(row.modelsJson) : null,
    weight: row.weight ?? 1.0,
    enabled: row.enabled ?? true,
    useForBatchApi: row.useForBatchApi ?? false,
  }));
}
