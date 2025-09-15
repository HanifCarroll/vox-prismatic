import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/config/env'
import * as schema from './schema'

// Create postgres connection
const queryClient = postgres(env.DATABASE_URL)

// Create drizzle instance
export const db = drizzle(queryClient, { schema })
