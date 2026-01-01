import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// 加载 .env.local 文件
config({ path: '.env.local' });

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
