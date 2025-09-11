import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// Validate DATABASE_URL exists at config time
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
