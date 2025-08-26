import { Database } from "bun:sqlite";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../api-hono/src/lib/db-schema";

/**
 * Worker Database Connection
 * Simplified database connection for the worker service
 * Reuses the same schema as the API
 */

let db: BunSQLiteDatabase<typeof schema> | null = null;
let sqlite: Database | null = null;

/**
 * Get database file path - uses environment variable or default
 */
const getDatabasePath = (): string => {
	const envPath = process.env.DATABASE_PATH;
	if (envPath) {
		return envPath;
	}

	// Default path for Docker container
	return "/app/data/content.db";
};

/**
 * Ensure data directory exists
 */
const ensureDataDirectory = (dbPath: string): void => {
	try {
		const fs = require("fs");
		const path = require("path");
		const dataDir = path.dirname(dbPath);

		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
			console.log(`📁 Created data directory: ${dataDir}`);
		}
	} catch (error) {
		console.error("❌ Failed to create data directory:", error);
		throw error;
	}
};

/**
 * Initialize database connection
 */
export const initDatabase = (): BunSQLiteDatabase<typeof schema> => {
	if (db) {
		return db;
	}

	try {
		const dbPath = getDatabasePath();
		console.log(`📊 Connecting to database: ${dbPath}`);

		ensureDataDirectory(dbPath);

		// Create SQLite connection with Bun's native SQLite
		sqlite = new Database(dbPath);

		// Enable WAL mode and foreign keys for better performance
		sqlite.exec("PRAGMA foreign_keys = ON");
		sqlite.exec("PRAGMA journal_mode = WAL");
		sqlite.exec("PRAGMA synchronous = NORMAL");

		// Initialize Drizzle ORM
		db = drizzle(sqlite, { schema });

		console.log("✅ Database connected successfully");
		return db;
	} catch (error) {
		console.error("❌ Failed to initialize database:", error);
		throw error;
	}
};

/**
 * Get existing database connection (initializes if needed)
 */
export const getDatabase = (): BunSQLiteDatabase<typeof schema> => {
	if (!db) {
		return initDatabase();
	}
	return db;
};

/**
 * Close database connection
 */
export const closeDatabase = (): void => {
	if (sqlite) {
		sqlite.close();
		sqlite = null;
		db = null;
		console.log("📊 Database connection closed");
	}
};
