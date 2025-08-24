import { getDatabase } from './connection';
import { Result } from '@content-creation/shared';

/**
 * Unified Content Data Access Layer
 * Single interface for all content types in the pipeline
 */

export interface UnifiedContent {
  id: string;
  contentType: 'transcript' | 'insight' | 'post' | 'scheduled_post';
  title: string;
  status: string;
  rawContent?: string;
  processedContent?: string;
  metadata?: Record<string, any>;
  
  // Relationships
  parentId?: string;
  rootTranscriptId?: string;
  
  // Source information
  sourceType?: 'recording' | 'upload' | 'manual' | 'ai_generated';
  sourceUrl?: string;
  filePath?: string;
  
  // Content metrics
  wordCount: number;
  durationSeconds?: number;
  
  // Scheduling (for scheduled_post type)
  scheduledTime?: string;
  platform?: string;
  retryCount?: number;
  lastAttempt?: string;
  errorMessage?: string;
  externalPostId?: string;
  
  // Processing metadata
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ContentFilter {
  contentType?: 'transcript' | 'insight' | 'post' | 'scheduled_post';
  status?: string;
  platform?: string;
  parentId?: string;
  rootTranscriptId?: string;
  limit?: number;
  offset?: number;
}

export interface ContentStats {
  totalCount: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPlatform?: Record<string, number>;
}

/**
 * Convert database row to UnifiedContent
 */
const fromDbRow = (row: any): UnifiedContent => ({
  id: row.id,
  contentType: row.content_type,
  title: row.title,
  status: row.status,
  rawContent: row.raw_content,
  processedContent: row.processed_content,
  metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  parentId: row.parent_id,
  rootTranscriptId: row.root_transcript_id,
  sourceType: row.source_type,
  sourceUrl: row.source_url,
  filePath: row.file_path,
  wordCount: row.word_count || 0,
  durationSeconds: row.duration_seconds,
  scheduledTime: row.scheduled_time,
  platform: row.platform,
  retryCount: row.retry_count || 0,
  lastAttempt: row.last_attempt,
  errorMessage: row.error_message,
  externalPostId: row.external_post_id,
  processingDurationMs: row.processing_duration_ms,
  estimatedTokens: row.estimated_tokens,
  estimatedCost: row.estimated_cost,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/**
 * Get unified content statistics
 */
export const getUnifiedContentStats = (): Result<ContentStats> => {
  try {
    const db = getDatabase();
    
    // Total count
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM content').get() as { count: number };
    
    // By type
    const byTypeResults = db.prepare(`
      SELECT content_type, COUNT(*) as count 
      FROM content 
      GROUP BY content_type
    `).all() as { content_type: string; count: number }[];
    
    // By status
    const byStatusResults = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM content 
      GROUP BY status
    `).all() as { status: string; count: number }[];
    
    // By platform (for posts and scheduled posts)
    const byPlatformResults = db.prepare(`
      SELECT platform, COUNT(*) as count 
      FROM content 
      WHERE platform IS NOT NULL
      GROUP BY platform
    `).all() as { platform: string; count: number }[];
    
    const stats: ContentStats = {
      totalCount: totalResult.count,
      byType: byTypeResults.reduce((acc, item) => {
        acc[item.content_type] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatusResults.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byPlatform: byPlatformResults.reduce((acc, item) => {
        acc[item.platform] = item.count;
        return acc;
      }, {} as Record<string, number>)
    };
    
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
 * Get content with filtering
 */
export const getUnifiedContent = (filters?: ContentFilter): Result<UnifiedContent[]> => {
  try {
    const db = getDatabase();
    
    let query = 'SELECT * FROM content';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (filters?.contentType) {
      conditions.push('content_type = ?');
      params.push(filters.contentType);
    }
    
    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    
    if (filters?.platform) {
      conditions.push('platform = ?');
      params.push(filters.platform);
    }
    
    if (filters?.parentId) {
      conditions.push('parent_id = ?');
      params.push(filters.parentId);
    }
    
    if (filters?.rootTranscriptId) {
      conditions.push('root_transcript_id = ?');
      params.push(filters.rootTranscriptId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
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
    
    const content = rows.map(fromDbRow);
    
    return {
      success: true,
      data: content
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Create new content
 */
export const createUnifiedContent = (data: Partial<UnifiedContent>): Result<UnifiedContent> => {
  try {
    const db = getDatabase();
    const id = data.id || `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO content (
        id, content_type, title, status, raw_content, processed_content,
        metadata, parent_id, root_transcript_id, source_type, source_url,
        file_path, word_count, duration_seconds, scheduled_time, platform,
        retry_count, last_attempt, error_message, external_post_id,
        processing_duration_ms, estimated_tokens, estimated_cost,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.contentType || 'transcript',
      data.title || 'Untitled',
      data.status || 'draft',
      data.rawContent,
      data.processedContent,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.parentId,
      data.rootTranscriptId || (data.contentType === 'transcript' ? id : data.rootTranscriptId),
      data.sourceType,
      data.sourceUrl,
      data.filePath,
      data.wordCount || 0,
      data.durationSeconds,
      data.scheduledTime,
      data.platform,
      data.retryCount || 0,
      data.lastAttempt,
      data.errorMessage,
      data.externalPostId,
      data.processingDurationMs,
      data.estimatedTokens,
      data.estimatedCost,
      now,
      now
    );
    
    const content: UnifiedContent = {
      id,
      contentType: data.contentType || 'transcript',
      title: data.title || 'Untitled',
      status: data.status || 'draft',
      rawContent: data.rawContent,
      processedContent: data.processedContent,
      metadata: data.metadata,
      parentId: data.parentId,
      rootTranscriptId: data.rootTranscriptId || (data.contentType === 'transcript' ? id : data.rootTranscriptId),
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      filePath: data.filePath,
      wordCount: data.wordCount || 0,
      durationSeconds: data.durationSeconds,
      scheduledTime: data.scheduledTime,
      platform: data.platform,
      retryCount: data.retryCount || 0,
      lastAttempt: data.lastAttempt,
      errorMessage: data.errorMessage,
      externalPostId: data.externalPostId,
      processingDurationMs: data.processingDurationMs,
      estimatedTokens: data.estimatedTokens,
      estimatedCost: data.estimatedCost,
      createdAt: now,
      updatedAt: now
    };
    
    console.log(`📝 Created ${data.contentType}: ${id} - "${data.title}"`);
    
    return {
      success: true,
      data: content
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Update content status
 */
export const updateUnifiedContentStatus = (id: string, status: string): Result<void> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE content 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `);
    
    const result = stmt.run(status, now, id);
    
    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Content not found: ${id}`)
      };
    }
    
    console.log(`📊 Content ${id} status updated to: ${status}`);
    
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
 * Get content pipeline for a specific transcript
 */
export const getContentPipeline = (rootTranscriptId: string): Result<{
  transcript?: UnifiedContent;
  insights: UnifiedContent[];
  posts: UnifiedContent[];
  scheduledPosts: UnifiedContent[];
}> => {
  try {
    const db = getDatabase();
    
    // Get all content related to this transcript
    const content = getUnifiedContent({ rootTranscriptId });
    
    if (!content.success) {
      return content as any;
    }
    
    // Organize by type
    const transcript = content.data.find(c => c.contentType === 'transcript');
    const insights = content.data.filter(c => c.contentType === 'insight');
    const posts = content.data.filter(c => c.contentType === 'post');
    const scheduledPosts = content.data.filter(c => c.contentType === 'scheduled_post');
    
    return {
      success: true,
      data: {
        transcript,
        insights,
        posts,
        scheduledPosts
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};