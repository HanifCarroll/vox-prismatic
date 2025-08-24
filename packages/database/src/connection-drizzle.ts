import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

/**
 * Drizzle Database Connection Management
 * Centralized SQLite connection with ORM capabilities
 */

let db: BetterSQLite3Database<typeof schema> | null = null;
let sqlite: Database.Database | null = null;

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
 * Initialize database connection with Drizzle
 */
export const initDatabase = (): BetterSQLite3Database<typeof schema> => {
  if (db) {
    return db;
  }

  try {
    const dbPath = getDatabasePath();
    ensureDataDirectory(dbPath);
    
    // Create SQLite connection
    sqlite = new Database(dbPath);
    
    // Enable WAL mode and foreign keys for better performance
    sqlite.exec('PRAGMA foreign_keys = ON');
    sqlite.exec('PRAGMA journal_mode = WAL');
    sqlite.exec('PRAGMA synchronous = NORMAL');
    
    // Initialize Drizzle ORM
    db = drizzle(sqlite, { schema });
    
    console.log(`📊 Drizzle database connected: ${dbPath}`);
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Run pending migrations
 */
export const runMigrations = (): void => {
  try {
    if (!db) {
      initDatabase();
    }
    
    console.log('🔄 Running database migrations...');
    migrate(db!, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * Get existing database connection (initializes if needed)
 */
export const getDatabase = (): BetterSQLite3Database<typeof schema> => {
  if (!db) {
    return initDatabase();
  }
  return db;
};

/**
 * Get raw SQLite connection (for direct queries if needed)
 */
export const getSQLiteConnection = (): Database.Database => {
  if (!sqlite) {
    initDatabase();
  }
  return sqlite!;
};

/**
 * Close database connection
 */
export const closeDatabase = (): void => {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
    console.log('📊 Database connection closed');
  }
};

/**
 * Execute in transaction
 */
export const withTransaction = <T>(fn: (tx: BetterSQLite3Database<typeof schema>) => T): T => {
  const database = getDatabase();
  return database.transaction(fn)(database);
};