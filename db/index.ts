import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

// Export drizzle instance with schema
export const db = drizzle(pool, { schema });

// Export schema for convenience
export * from './schema';
