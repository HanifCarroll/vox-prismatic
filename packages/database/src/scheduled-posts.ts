import { getDatabase } from './connection';

/**
 * Scheduled posts data access layer
 * Integrates scheduling functionality directly into the main database
 */

// Result type for functional programming patterns
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export interface ScheduledPostRecord {
  id: string;
  postId?: string; // Optional link to posts table
  platform: 'linkedin' | 'x' | 'instagram' | 'facebook';
  content: string;
  scheduledTime: Date;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  retryCount: number;
  lastAttempt?: Date;
  errorMessage?: string;
  externalPostId?: string; // ID from the actual platform after posting
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledPostData {
  postId?: string;
  platform: 'linkedin' | 'x' | 'instagram' | 'facebook';
  content: string;
  scheduledTime: Date;
  metadata?: Record<string, any>;
}

/**
 * Generate unique ID for scheduled posts
 */
const generateScheduledPostId = (): string => {
  return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convert database row to ScheduledPostRecord
 */
const fromDbRow = (row: any): ScheduledPostRecord => ({
  id: row.id,
  postId: row.post_id,
  platform: row.platform,
  content: row.content,
  scheduledTime: new Date(row.scheduled_time),
  status: row.status,
  retryCount: row.retry_count,
  lastAttempt: row.last_attempt ? new Date(row.last_attempt) : undefined,
  errorMessage: row.error_message,
  externalPostId: row.external_post_id,
  metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/**
 * Create a scheduled post
 */
export const createScheduledPost = (data: CreateScheduledPostData): Result<ScheduledPostRecord> => {
  try {
    const db = getDatabase();
    const id = generateScheduledPostId();
    const now = new Date().toISOString();

    // Validate scheduled time is in the future
    if (data.scheduledTime <= new Date()) {
      return {
        success: false,
        error: new Error('Scheduled time must be in the future')
      };
    }

    const stmt = db.prepare(`
      INSERT INTO scheduled_posts (
        id, post_id, platform, content, scheduled_time, 
        metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.postId || null,
      data.platform,
      data.content,
      data.scheduledTime.toISOString(),
      data.metadata ? JSON.stringify(data.metadata) : null,
      now,
      now
    );

    const scheduledPost: ScheduledPostRecord = {
      id,
      postId: data.postId,
      platform: data.platform,
      content: data.content,
      scheduledTime: data.scheduledTime,
      status: 'pending',
      retryCount: 0,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now
    };

    console.log(`📅 Post scheduled: ${id} for ${data.platform} at ${data.scheduledTime.toISOString()}`);

    return {
      success: true,
      data: scheduledPost
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get scheduled posts ready for publishing
 */
export const getPendingScheduledPosts = (limit: number = 50): Result<ScheduledPostRecord[]> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      SELECT * FROM scheduled_posts 
      WHERE status = 'pending' 
        AND scheduled_time <= ?
        AND retry_count < 3
      ORDER BY scheduled_time ASC 
      LIMIT ?
    `);

    const rows = stmt.all(now, limit);
    const posts = rows.map(fromDbRow);
    
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
 * Get all scheduled posts with filtering
 */
export const getScheduledPosts = (filters?: {
  platform?: string;
  status?: string;
  postId?: string;
  limit?: number;
  offset?: number;
}): Result<ScheduledPostRecord[]> => {
  try {
    const db = getDatabase();
    
    let query = 'SELECT * FROM scheduled_posts';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (filters?.platform) {
      conditions.push('platform = ?');
      params.push(filters.platform);
    }
    
    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.postId) {
      conditions.push('post_id = ?');
      params.push(filters.postId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY scheduled_time DESC';
    
    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);

      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    const posts = rows.map(fromDbRow);
    
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
 * Update scheduled post status
 */
export const updateScheduledPostStatus = (
  id: string,
  status: 'pending' | 'published' | 'failed' | 'cancelled',
  errorMessage?: string,
  externalPostId?: string
): Result<void> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE scheduled_posts 
      SET status = ?, 
          last_attempt = ?,
          error_message = ?,
          external_post_id = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, now, errorMessage || null, externalPostId || null, now, id);
    
    console.log(`📊 Scheduled post ${id} status updated to: ${status}`);
    
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
 * Increment retry count for a scheduled post
 */
export const incrementScheduledPostRetryCount = (id: string): Result<number> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE scheduled_posts 
      SET retry_count = retry_count + 1,
          last_attempt = ?,
          updated_at = ?
      WHERE id = ?
      RETURNING retry_count
    `);

    const result = stmt.get(now, now, id) as { retry_count: number } | undefined;
    const newRetryCount = result?.retry_count || 0;
    
    console.log(`🔄 Scheduled post ${id} retry count incremented to: ${newRetryCount}`);
    
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
 * Delete scheduled post
 */
export const deleteScheduledPost = (id: string): Result<void> => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare('DELETE FROM scheduled_posts WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Scheduled post not found: ${id}`)
      };
    }

    console.log(`🗑️ Scheduled post deleted: ${id}`);
    
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
 * Get scheduled posts statistics
 */
export const getScheduledPostStats = () => {
  try {
    const db = getDatabase();
    
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM scheduled_posts');
    const total = totalStmt.get() as { count: number };

    const statusStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM scheduled_posts 
      GROUP BY status
    `);
    const byStatus = statusStmt.all() as { status: string; count: number }[];

    const platformStmt = db.prepare(`
      SELECT platform, COUNT(*) as count 
      FROM scheduled_posts 
      GROUP BY platform
    `);
    const byPlatform = platformStmt.all() as { platform: string; count: number }[];

    const upcomingStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM scheduled_posts 
      WHERE status = 'pending' AND scheduled_time > datetime('now')
    `);
    const upcoming = upcomingStmt.get() as { count: number };

    return {
      success: true,
      data: {
        total: total.count,
        upcoming: upcoming.count,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byPlatform: byPlatform.reduce((acc, item) => {
          acc[item.platform] = item.count;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};