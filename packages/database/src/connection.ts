import { Database } from 'bun:sqlite';
import { createSchema } from './schema';

/**
 * Database connection management
 * Centralized SQLite connection for the entire application
 */

let db: Database | null = null;

/**
 * Get database file path
 */
const getDatabasePath = (): string => {
  // Use environment variable if set, otherwise default location
  const envPath = process.env.CONTENT_DB_PATH;
  if (envPath) {
    return envPath;
  }

  // Default: data/content.sqlite in project root
  const projectRoot = process.cwd().includes('packages/') 
    ? process.cwd().replace(/packages\/.*/, '') 
    : process.cwd();
    
  return `${projectRoot}/data/content.sqlite`;
};

/**
 * Ensure data directory exists
 */
const ensureDataDirectory = (dbPath: string): void => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    }
  } catch (error) {
    console.error('❌ Failed to create data directory:', error);
    throw error;
  }
};

/**
 * Initialize database connection
 */
export const initDatabase = (): Database => {
  if (db) {
    return db;
  }

  try {
    const dbPath = getDatabasePath();
    ensureDataDirectory(dbPath);
    
    // Create database connection
    db = new Database(dbPath, { create: true });
    
    // Initialize schema
    createSchema(db);
    
    console.log(`📊 Content database connected: ${dbPath}`);
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Get existing database connection (initializes if needed)
 */
export const getDatabase = (): Database => {
  if (!db) {
    return initDatabase();
  }
  return db;
};

/**
 * Close database connection
 */
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
    console.log('📊 Database connection closed');
  }
};

/**
 * Execute in transaction
 */
export const withTransaction = <T>(
  callback: (db: Database) => T
): T => {
  const database = getDatabase();
  
  database.exec('BEGIN');
  try {
    const result = callback(database);
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = () => {
  const database = getDatabase();
  
  const stats = {
    transcripts: database.prepare('SELECT COUNT(*) as count FROM transcripts').get() as { count: number },
    cleanedTranscripts: database.prepare('SELECT COUNT(*) as count FROM cleaned_transcripts').get() as { count: number },
    insights: database.prepare('SELECT COUNT(*) as count FROM insights').get() as { count: number },
    posts: database.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number },
    scheduledPosts: database.prepare('SELECT COUNT(*) as count FROM scheduled_posts').get() as { count: number },
    processingJobs: database.prepare('SELECT COUNT(*) as count FROM processing_jobs').get() as { count: number },
    
    // Status breakdowns
    transcriptsByStatus: database.prepare(`
      SELECT status, COUNT(*) as count 
      FROM transcripts 
      GROUP BY status
    `).all() as { status: string; count: number }[],
    
    insightsByStatus: database.prepare(`
      SELECT status, COUNT(*) as count 
      FROM insights 
      GROUP BY status
    `).all() as { status: string; count: number }[],
    
    postsByStatus: database.prepare(`
      SELECT status, COUNT(*) as count 
      FROM posts 
      GROUP BY status
    `).all() as { status: string; count: number }[],

    scheduledPostsByStatus: database.prepare(`
      SELECT status, COUNT(*) as count 
      FROM scheduled_posts 
      GROUP BY status
    `).all() as { status: string; count: number }[],
  };

  return stats;
};

/**
 * Reset database (for testing/development)
 */
export const resetDatabase = (): void => {
  const database = getDatabase();
  
  console.log('🗑️ Resetting database...');
  
  // Drop all tables
  const tables = [
    'analytics_events',
    'settings', 
    'processing_jobs',
    'scheduled_posts',
    'posts',
    'insights',
    'cleaned_transcripts',
    'transcripts',
    'schema_info'
  ];

  for (const table of tables) {
    try {
      database.exec(`DROP TABLE IF EXISTS ${table}`);
    } catch (error) {
      console.warn(`Warning: Could not drop table ${table}:`, error);
    }
  }

  // Recreate schema
  createSchema(database);
  
  console.log('✅ Database reset complete');
};

/**
 * Backup database
 */
export const backupDatabase = (backupPath?: string): string => {
  const database = getDatabase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultBackupPath = `./data/backups/content-${timestamp}.sqlite`;
  const finalBackupPath = backupPath || defaultBackupPath;

  try {
    // Ensure backup directory exists
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.dirname(finalBackupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Copy database file
    const sourcePath = getDatabasePath();
    fs.copyFileSync(sourcePath, finalBackupPath);
    
    console.log(`💾 Database backed up to: ${finalBackupPath}`);
    return finalBackupPath;
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    throw error;
  }
};