import Database, { Database as DatabaseType } from 'better-sqlite3';
import { ScheduledPost, Result } from '@content-creation/shared';

/**
 * SQLite database operations for scheduled posts
 * Uses Bun's built-in SQLite support
 */

export interface ScheduledPostRow {
  id: string;
  platform: string;
  content: string;
  scheduled_time: string;  // ISO string
  status: string;
  retry_count: number;
  last_attempt?: string;   // ISO string
  error?: string;
  metadata?: string;       // JSON string
  created_at: string;      // ISO string
  updated_at: string;      // ISO string
}

let db: DatabaseType | null = null;

/**
 * Get or create database instance
 */
const getDatabase = (): DatabaseType => {
  if (!db) {
    // Create database in the project root's data directory
    const projectRoot = process.cwd().includes('packages/scheduler') 
      ? process.cwd().replace(/packages\/scheduler.*/, '') 
      : process.cwd();
    const dbPath = `${projectRoot}/data/scheduler.sqlite`;
    
    // Ensure data directory exists
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create data directory:', error);
    }
    
    db = new Database(dbPath);
    initializeDatabase(db);
  }
  return db;
};

/**
 * Initialize database schema
 */
const initializeDatabase = (database: DatabaseType): void => {
  // Create scheduled_posts table
  database.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempt TEXT,
      error TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create index on scheduled_time and status for efficient querying
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_time_status 
    ON scheduled_posts (scheduled_time, status)
  `);

  // Create index on platform for analytics
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform 
    ON scheduled_posts (platform)
  `);

  console.log('📅 Scheduler database initialized');
};

/**
 * Convert ScheduledPost to database row
 */
const toRow = (post: ScheduledPost): Omit<ScheduledPostRow, 'created_at' | 'updated_at'> => ({
  id: post.id,
  platform: post.platform,
  content: post.content,
  scheduled_time: post.scheduledTime.toISOString(),
  status: post.status,
  retry_count: post.retryCount,
  last_attempt: post.lastAttempt?.toISOString(),
  error: post.error,
  metadata: post.metadata ? JSON.stringify(post.metadata) : undefined
});

/**
 * Convert database row to ScheduledPost
 */
const fromRow = (row: ScheduledPostRow): ScheduledPost => ({
  id: row.id,
  platform: row.platform as 'linkedin' | 'x' | 'postiz',
  content: row.content,
  scheduledTime: new Date(row.scheduled_time),
  status: row.status as 'pending' | 'published' | 'failed' | 'cancelled',
  retryCount: row.retry_count,
  lastAttempt: row.last_attempt ? new Date(row.last_attempt) : undefined,
  error: row.error,
  metadata: row.metadata ? JSON.parse(row.metadata) : undefined
});

/**
 * Insert a new scheduled post
 */
export const insertScheduledPost = (post: ScheduledPost): Result<string> => {
  try {
    const database = getDatabase();
    const row = toRow(post);
    
    const stmt = database.prepare(`
      INSERT INTO scheduled_posts (
        id, platform, content, scheduled_time, status, 
        retry_count, last_attempt, error, metadata
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      row.id,
      row.platform,
      row.content,
      row.scheduled_time,
      row.status,
      row.retry_count,
      row.last_attempt || null,
      row.error || null,
      row.metadata || null
    );

    console.log(`📝 Scheduled post saved: ${post.id} for ${post.platform} at ${post.scheduledTime.toISOString()}`);
    
    return {
      success: true,
      data: post.id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get posts ready to be published (scheduled time has passed)
 */
export const getPendingPosts = (limit: number = 50): Result<ScheduledPost[]> => {
  try {
    const database = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = database.prepare(`
      SELECT * FROM scheduled_posts 
      WHERE status = 'pending' 
        AND scheduled_time <= ?
        AND retry_count < 3
      ORDER BY scheduled_time ASC 
      LIMIT ?
    `);

    const rows = stmt.all(now, limit) as ScheduledPostRow[];
    const posts = rows.map(fromRow);
    
    return {
      success: true,
      data: posts
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get all scheduled posts (for dashboard/UI)
 */
export const getScheduledPosts = (
  platform?: string,
  status?: string,
  limit: number = 100
): Result<ScheduledPost[]> => {
  try {
    const database = getDatabase();
    let query = 'SELECT * FROM scheduled_posts';
    const params: any[] = [];
    
    const conditions: string[] = [];
    
    if (platform) {
      conditions.push('platform = ?');
      params.push(platform);
    }
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY scheduled_time DESC LIMIT ?';
    params.push(limit);
    
    const stmt = database.prepare(query);
    const rows = stmt.all(...params) as ScheduledPostRow[];
    const posts = rows.map(fromRow);
    
    return {
      success: true,
      data: posts
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Update post status
 */
export const updatePostStatus = (
  postId: string,
  status: 'pending' | 'published' | 'failed' | 'cancelled',
  error?: string
): Result<void> => {
  try {
    const database = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = database.prepare(`
      UPDATE scheduled_posts 
      SET status = ?, 
          last_attempt = ?,
          error = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, now, error || null, now, postId);
    
    console.log(`📊 Post ${postId} status updated to: ${status}`);
    
    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Increment retry count for a post
 */
export const incrementRetryCount = (postId: string): Result<number> => {
  try {
    const database = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = database.prepare(`
      UPDATE scheduled_posts 
      SET retry_count = retry_count + 1,
          last_attempt = ?,
          updated_at = ?
      WHERE id = ?
      RETURNING retry_count
    `);

    const result = stmt.get(now, now, postId) as { retry_count: number } | undefined;
    const newRetryCount = result?.retry_count || 0;
    
    console.log(`🔄 Post ${postId} retry count incremented to: ${newRetryCount}`);
    
    return {
      success: true,
      data: newRetryCount
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Delete a scheduled post
 */
export const deleteScheduledPost = (postId: string): Result<void> => {
  try {
    const database = getDatabase();
    
    const stmt = database.prepare('DELETE FROM scheduled_posts WHERE id = ?');
    stmt.run(postId);
    
    console.log(`🗑️ Scheduled post deleted: ${postId}`);
    
    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get scheduler statistics
 */
export const getSchedulerStats = (): Result<{
  total: number;
  pending: number;
  published: number;
  failed: number;
  cancelled: number;
  byPlatform: Record<string, number>;
}> => {
  try {
    const database = getDatabase();
    
    // Get total counts by status
    const statusCounts = database.prepare(`
      SELECT status, COUNT(*) as count 
      FROM scheduled_posts 
      GROUP BY status
    `).all() as { status: string; count: number }[];
    
    // Get counts by platform
    const platformCounts = database.prepare(`
      SELECT platform, COUNT(*) as count 
      FROM scheduled_posts 
      GROUP BY platform
    `).all() as { platform: string; count: number }[];
    
    const stats = {
      total: 0,
      pending: 0,
      published: 0,
      failed: 0,
      cancelled: 0,
      byPlatform: {} as Record<string, number>
    };
    
    // Process status counts
    statusCounts.forEach(row => {
      stats.total += row.count;
      if (row.status in stats) {
        (stats as any)[row.status] = row.count;
      }
    });
    
    // Process platform counts
    platformCounts.forEach(row => {
      stats.byPlatform[row.platform] = row.count;
    });
    
    return {
      success: true,
      data: stats
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Close database connection
 */
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
    console.log('📅 Scheduler database connection closed');
  }
};