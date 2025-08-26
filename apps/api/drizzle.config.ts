import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../../packages/types/src/database.ts',
  out: './src/database/drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: '../../data/content.sqlite',
  },
  verbose: true,
  strict: true,
});