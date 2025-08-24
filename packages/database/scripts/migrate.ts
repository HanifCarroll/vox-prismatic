#!/usr/bin/env bun
/**
 * Database Migration Script
 * Run this manually to apply database migrations
 * 
 * Usage: bun run packages/database/scripts/migrate.ts
 */

import { initDatabase } from '../src/connection';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

async function runMigrations() {
  console.log('🚀 Starting database migration...');
  
  try {
    // Initialize database connection
    const db = initDatabase();
    
    // Run migrations from the drizzle folder
    const migrationsFolder = path.join(__dirname, '../drizzle');
    console.log(`📁 Running migrations from: ${migrationsFolder}`);
    
    migrate(db, { migrationsFolder });
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();