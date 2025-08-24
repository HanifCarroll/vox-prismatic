#!/usr/bin/env bun
/**
 * Generate Database Migration Script
 * Creates a new migration file based on schema changes
 * 
 * Usage: bun run packages/database/scripts/generate.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateMigration() {
  console.log('🔄 Generating new migration...');
  
  try {
    // Use drizzle-kit to generate migration
    const { stdout, stderr } = await execAsync(
      'bunx drizzle-kit generate',
      { cwd: process.cwd() }
    );
    
    if (stderr) {
      console.error('⚠️ Warning:', stderr);
    }
    
    console.log(stdout);
    console.log('✅ Migration generated successfully!');
    console.log('📝 Review the migration file before running migrate.ts');
  } catch (error) {
    console.error('❌ Failed to generate migration:', error);
    process.exit(1);
  }
}

// Generate migration
generateMigration();