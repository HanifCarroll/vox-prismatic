import { getDatabase } from './connection';
import { Result } from '@content-creation/shared';

/**
 * Posts data access layer
 * Handles generated social media posts from insights
 */

export interface PostRecord {
  id: string;
  insightId: string;
  title: string;
  platform: 'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube';
  
  // Content structure
  hook?: string;
  body: string;
  softCta?: string;
  directCta?: string;
  fullContent: string;
  
  // Post metadata
  characterCount: number;
  estimatedEngagementScore?: number;
  hashtags?: string[];
  mentions?: string[];
  
  status: 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';
  
  // Processing metadata
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  insightId: string;
  title: string;
  platform: 'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube';
  hook?: string;
  body: string;
  softCta?: string;
  directCta?: string;
  estimatedEngagementScore?: number;
  hashtags?: string[];
  mentions?: string[];
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
}

/**
 * Generate unique ID for posts
 */
const generatePostId = (): string => {
  return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Assemble full content from components
 */
const assembleFullContent = (data: {
  hook?: string;
  body: string;
  softCta?: string;
  directCta?: string;
}): string => {
  const parts = [];
  
  if (data.hook) {
    parts.push(data.hook);
  }
  
  parts.push(data.body);
  
  if (data.softCta) {
    parts.push(data.softCta);
  }
  
  if (data.directCta) {
    parts.push(data.directCta);
  }
  
  return parts.join('\n\n').trim();
};

/**
 * Convert database row to PostRecord
 */
const fromDbRow = (row: any): PostRecord => ({
  id: row.id,
  insightId: row.insight_id,
  title: row.title,
  platform: row.platform,
  hook: row.hook,
  body: row.body,
  softCta: row.soft_cta,
  directCta: row.direct_cta,
  fullContent: row.full_content,
  characterCount: row.character_count,
  estimatedEngagementScore: row.estimated_engagement_score,
  hashtags: row.hashtags ? JSON.parse(row.hashtags) : undefined,
  mentions: row.mentions ? JSON.parse(row.mentions) : undefined,
  status: row.status,
  processingDurationMs: row.processing_duration_ms,
  estimatedTokens: row.estimated_tokens,
  estimatedCost: row.estimated_cost,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/**
 * Create a new post
 */
export const createPost = (data: CreatePostData): Result<PostRecord> => {
  try {
    const db = getDatabase();
    const id = generatePostId();
    const now = new Date().toISOString();
    
    const fullContent = assembleFullContent(data);
    const characterCount = fullContent.length;

    const stmt = db.prepare(`
      INSERT INTO posts (
        id, insight_id, title, platform, hook, body, soft_cta, 
        direct_cta, full_content, character_count, estimated_engagement_score,
        hashtags, mentions, processing_duration_ms, estimated_tokens, 
        estimated_cost, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.insightId,
      data.title,
      data.platform,
      data.hook || null,
      data.body,
      data.softCta || null,
      data.directCta || null,
      fullContent,
      characterCount,
      data.estimatedEngagementScore || null,
      data.hashtags ? JSON.stringify(data.hashtags) : null,
      data.mentions ? JSON.stringify(data.mentions) : null,
      data.processingDurationMs || null,
      data.estimatedTokens || null,
      data.estimatedCost || null,
      now,
      now
    );

    const post: PostRecord = {
      id,
      insightId: data.insightId,
      title: data.title,
      platform: data.platform,
      hook: data.hook,
      body: data.body,
      softCta: data.softCta,
      directCta: data.directCta,
      fullContent,
      characterCount,
      estimatedEngagementScore: data.estimatedEngagementScore,
      hashtags: data.hashtags,
      mentions: data.mentions,
      status: 'draft',
      processingDurationMs: data.processingDurationMs,
      estimatedTokens: data.estimatedTokens,
      estimatedCost: data.estimatedCost,
      createdAt: now,
      updatedAt: now
    };

    console.log(`📱 Post created: ${id} - "${data.title}" (${data.platform}, ${characterCount} chars)`);

    return {
      success: true,
      data: post
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get post by ID
 */
export const getPost = (id: string): Result<PostRecord> => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
    const row = stmt.get(id);

    if (!row) {
      return {
        success: false,
        error: new Error(`Post not found: ${id}`)
      };
    }

    return {
      success: true,
      data: fromDbRow(row)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get posts with filtering and sorting
 */
export const getPosts = (filters?: {
  insightId?: string;
  platform?: 'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube';
  status?: 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'character_count' | 'estimated_engagement_score';
  sortOrder?: 'ASC' | 'DESC';
}): Result<PostRecord[]> => {
  try {
    const db = getDatabase();
    
    let query = 'SELECT * FROM posts';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.insightId) {
      conditions.push('insight_id = ?');
      params.push(filters.insightId);
    }

    if (filters?.platform) {
      conditions.push('platform = ?');
      params.push(filters.platform);
    }

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

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
 * Update post status
 */
export const updatePostStatus = (
  id: string, 
  status: 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived'
): Result<void> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE posts 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `);

    const result = stmt.run(status, now, id);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Post not found: ${id}`)
      };
    }

    console.log(`📊 Post ${id} status updated to: ${status}`);

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
 * Update post content
 */
export const updatePost = (
  id: string,
  updates: {
    title?: string;
    hook?: string;
    body?: string;
    softCta?: string;
    directCta?: string;
    hashtags?: string[];
    mentions?: string[];
  }
): Result<PostRecord> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Get current post to preserve existing data
    const currentResult = getPost(id);
    if (!currentResult.success) {
      return currentResult;
    }

    const current = currentResult.data;
    
    // Merge updates with current data
    const updatedData = {
      hook: updates.hook !== undefined ? updates.hook : current.hook,
      body: updates.body || current.body,
      softCta: updates.softCta !== undefined ? updates.softCta : current.softCta,
      directCta: updates.directCta !== undefined ? updates.directCta : current.directCta,
    };

    const fullContent = assembleFullContent(updatedData);
    const characterCount = fullContent.length;

    const setParts: string[] = ['updated_at = ?', 'full_content = ?', 'character_count = ?'];
    const params: any[] = [now, fullContent, characterCount];

    if (updates.title !== undefined) {
      setParts.push('title = ?');
      params.push(updates.title);
    }

    if (updates.hook !== undefined) {
      setParts.push('hook = ?');
      params.push(updates.hook || null);
    }

    if (updates.body !== undefined) {
      setParts.push('body = ?');
      params.push(updates.body);
    }

    if (updates.softCta !== undefined) {
      setParts.push('soft_cta = ?');
      params.push(updates.softCta || null);
    }

    if (updates.directCta !== undefined) {
      setParts.push('direct_cta = ?');
      params.push(updates.directCta || null);
    }

    if (updates.hashtags !== undefined) {
      setParts.push('hashtags = ?');
      params.push(updates.hashtags.length > 0 ? JSON.stringify(updates.hashtags) : null);
    }

    if (updates.mentions !== undefined) {
      setParts.push('mentions = ?');
      params.push(updates.mentions.length > 0 ? JSON.stringify(updates.mentions) : null);
    }

    params.push(id);

    const stmt = db.prepare(`
      UPDATE posts 
      SET ${setParts.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Post not found: ${id}`)
      };
    }

    // Get updated post
    const getResult = getPost(id);
    if (!getResult.success) {
      return getResult;
    }

    console.log(`📝 Post updated: ${id}`);

    return {
      success: true,
      data: getResult.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get posts needing review
 */
export const getPostsNeedingReview = (): Result<PostRecord[]> => {
  return getPosts({ 
    status: 'needs_review',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
};

/**
 * Get approved posts ready for scheduling
 */
export const getApprovedPosts = (): Result<PostRecord[]> => {
  return getPosts({ 
    status: 'approved',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
};

/**
 * Search posts
 */
export const searchPosts = (
  searchTerm: string,
  limit: number = 20
): Result<PostRecord[]> => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT * FROM posts 
      WHERE title LIKE ? OR body LIKE ? OR full_content LIKE ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    const searchPattern = `%${searchTerm}%`;
    const rows = stmt.all(searchPattern, searchPattern, searchPattern, limit);
    
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
 * Get post statistics
 */
export const getPostStats = () => {
  try {
    const db = getDatabase();
    
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM posts');
    const total = totalStmt.get() as { count: number };

    const statusStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM posts 
      GROUP BY status
    `);
    const byStatus = statusStmt.all() as { status: string; count: number }[];

    const platformStmt = db.prepare(`
      SELECT platform, COUNT(*) as count 
      FROM posts 
      GROUP BY platform
      ORDER BY count DESC
    `);
    const byPlatform = platformStmt.all() as { platform: string; count: number }[];

    const contentStatsStmt = db.prepare(`
      SELECT 
        AVG(character_count) as avg_length,
        MIN(character_count) as min_length,
        MAX(character_count) as max_length,
        AVG(estimated_engagement_score) as avg_engagement
      FROM posts
    `);
    const contentStats = contentStatsStmt.get() as any;

    const recentStmt = db.prepare(`
      SELECT id, title, platform, status, created_at 
      FROM posts 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    const recentPosts = recentStmt.all() as any[];

    return {
      success: true,
      data: {
        total: total.count,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byPlatform: byPlatform.reduce((acc, item) => {
          acc[item.platform] = item.count;
          return acc;
        }, {} as Record<string, number>),
        contentStats: {
          averageLength: Math.round(contentStats.avg_length || 0),
          minLength: contentStats.min_length || 0,
          maxLength: contentStats.max_length || 0,
          averageEngagement: Math.round((contentStats.avg_engagement || 0) * 10) / 10
        },
        recentPosts
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Delete post
 */
export const deletePost = (id: string): Result<void> => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Post not found: ${id}`)
      };
    }

    console.log(`🗑️ Post deleted: ${id}`);

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
 * Bulk update post statuses
 */
export const bulkUpdatePostStatus = (
  ids: string[],
  status: 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived'
): Result<number> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE posts 
      SET status = ?, updated_at = ? 
      WHERE id IN (${placeholders})
    `);

    const result = stmt.run(status, now, ...ids);
    
    console.log(`📊 ${result.changes} posts updated to status: ${status}`);

    return {
      success: true,
      data: result.changes as number
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};