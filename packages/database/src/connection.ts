import Database from "better-sqlite3";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

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
	let projectRoot = process.cwd();

	// If we're in packages/, go up to monorepo root
	if (projectRoot.includes("packages/")) {
		projectRoot = projectRoot.replace(/packages\/.*/, "");
	}
	// If we're in apps/, go up to monorepo root
	else if (projectRoot.includes("apps/")) {
		projectRoot = projectRoot.replace(/apps\/.*/, "");
	}

	return `${projectRoot}data/content.sqlite`;
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
		sqlite.exec("PRAGMA foreign_keys = ON");
		sqlite.exec("PRAGMA journal_mode = WAL");
		sqlite.exec("PRAGMA synchronous = NORMAL");

		// Initialize Drizzle ORM
		db = drizzle(sqlite, { schema });

		return db;
	} catch (error) {
		console.error("❌ Failed to initialize database:", error);
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

		// Determine the correct migrations path
		const path = require("path");
		const fs = require("fs");

		// Try to find the migrations folder
		const possiblePaths = [
			path.join(__dirname, "../drizzle"), // From dist folder
			path.join(__dirname, "../../drizzle"), // From src folder
			path.join(process.cwd(), "drizzle"), // From current working directory
			path.join(process.cwd(), "../../packages/database/drizzle"), // From apps/web
			path.join(process.cwd(), "packages/database/drizzle"), // From monorepo root
		];

		let migrationsFolder = null;
		for (const p of possiblePaths) {
			if (fs.existsSync(p)) {
				migrationsFolder = p;
				break;
			}
		}

		if (!migrationsFolder) {
			console.log("⚠️ Migrations folder not found, skipping migrations");
			console.log("Searched paths:", possiblePaths);
			return;
		}

		console.log("🔄 Running database migrations from:", migrationsFolder);
		migrate(db!, { migrationsFolder });
		console.log("✅ Migrations completed successfully");
	} catch (error) {
		console.error("❌ Migration failed:", error);
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
		console.log("📊 Database connection closed");
	}
};

/**
 * Execute in transaction
 */
export const withTransaction = <T>(
	fn: (tx: BetterSQLite3Database<typeof schema>) => T,
): T => {
	const database = getDatabase();
	return database.transaction(fn);
};

/**
 * Reset database (for testing)
 */
export const resetDatabase = (): void => {
	if (sqlite) {
		// Drop all tables
		const tables = sqlite
			.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `)
			.all() as { name: string }[];

		for (const table of tables) {
			sqlite.exec(`DROP TABLE IF EXISTS ${table.name}`);
		}

		console.log("🗑️ Database reset completed");
	}
};

/**
 * Backup database
 */
export const backupDatabase = async (backupPath: string): Promise<void> => {
	if (sqlite) {
		await sqlite.backup(backupPath);
		console.log(`💾 Database backed up to: ${backupPath}`);
	}
};

/**
 * Get database statistics (for monitoring)
 */
export const getDatabaseStats = () => {
	const database = getDatabase();

	try {
		// Get table counts
		const transcriptCount = database
			.select()
			.from(schema.transcripts)
			.all().length;
		const insightCount = database.select().from(schema.insights).all().length;
		const postCount = database.select().from(schema.posts).all().length;
		const scheduledPostCount = database
			.select()
			.from(schema.scheduledPosts)
			.all().length;

		return {
			transcripts: { count: transcriptCount },
			insights: { count: insightCount },
			posts: { count: postCount },
			scheduledPosts: { count: scheduledPostCount },
		};
	} catch (error) {
		console.error("Error getting database stats:", error);
		return {
			transcripts: { count: 0 },
			insights: { count: 0 },
			posts: { count: 0 },
			scheduledPosts: { count: 0 },
		};
	}
};
