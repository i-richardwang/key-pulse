import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, boolean } from 'drizzle-orm/pg-core';
import { eq, and, isNotNull } from 'drizzle-orm';
import { Pool } from 'pg';

// Bifrost config_keys table schema (read-only)
const configKeys = pgTable('config_keys', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  keyId: text('key_id').notNull().unique(),
  value: text('value').notNull(),
  enabled: boolean('enabled').default(true),
});

export interface BifrostKey {
  id: string;
  name: string;
  provider: string;
  value: string;
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
  }));
}
