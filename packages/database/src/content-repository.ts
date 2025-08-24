import { eq, and, desc, count, sql, or } from 'drizzle-orm';
import { getDatabase } from './connection-drizzle';
import { content, type Content, type NewContent, type ContentType, type ContentStatus } from './schema';
import { Result } from '@content-creation/shared';

/**
 * Drizzle-based Content Repository
 * Type-safe data access for unified content pipeline
 */

export interface ContentFilter {
  contentType?: ContentType;
  status?: ContentStatus;
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
 * Get content statistics
 */
export const getContentStats = async (): Promise<Result<ContentStats>> => {
  try {
    const db = getDatabase();
    
    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(content);
    
    // Get counts by type
    const byTypeResults = await db
      .select({ 
        contentType: content.contentType, 
        count: count() 
      })
      .from(content)
      .groupBy(content.contentType);
    
    // Get counts by status  
    const byStatusResults = await db
      .select({
        status: content.status,
        count: count()
      })
      .from(content)
      .groupBy(content.status);
    
    // Get counts by platform (for posts and scheduled posts)
    const byPlatformResults = await db
      .select({
        platform: content.platform,
        count: count()
      })
      .from(content)
      .where(sql`${content.platform} IS NOT NULL`)
      .groupBy(content.platform);
    
    const stats: ContentStats = {
      totalCount: totalResult.count,
      byType: byTypeResults.reduce((acc, item) => {
        acc[item.contentType] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatusResults.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byPlatform: byPlatformResults.reduce((acc, item) => {
        if (item.platform) {
          acc[item.platform] = item.count;
        }
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
export const getContent = async (filters?: ContentFilter): Promise<Result<Content[]>> => {
  try {
    const db = getDatabase();
    
    let query = db.select().from(content);
    
    // Build WHERE conditions
    const conditions = [];
    
    if (filters?.contentType) {
      conditions.push(eq(content.contentType, filters.contentType));
    }
    
    if (filters?.status) {
      conditions.push(eq(content.status, filters.status));
    }
    
    if (filters?.platform) {
      conditions.push(eq(content.platform, filters.platform));
    }
    
    if (filters?.parentId) {
      conditions.push(eq(content.parentId, filters.parentId));
    }
    
    if (filters?.rootTranscriptId) {
      conditions.push(eq(content.rootTranscriptId, filters.rootTranscriptId));
    }
    
    // Apply WHERE conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Order by creation date (most recent first)
    query = query.orderBy(desc(content.createdAt));
    
    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit);
      
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }
    }
    
    const results = await query;
    
    return {
      success: true,
      data: results
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
export const createContent = async (data: NewContent): Promise<Result<Content>> => {
  try {
    const db = getDatabase();
    const id = data.id || `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newContent: NewContent = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      // Set root transcript ID for transcript content types
      rootTranscriptId: data.rootTranscriptId || (data.contentType === 'transcript' ? id : data.rootTranscriptId),
    };
    
    await db.insert(content).values(newContent);
    
    // Get the created content
    const [created] = await db.select().from(content).where(eq(content.id, id));
    
    console.log(`📝 Created ${data.contentType}: ${id} - "${data.title || 'Untitled'}"`);
    
    return {
      success: true,
      data: created
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
export const updateContentStatus = async (id: string, status: ContentStatus): Promise<Result<void>> => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const result = await db
      .update(content)
      .set({ 
        status, 
        updatedAt: now 
      })
      .where(eq(content.id, id));
    
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
 * Get content by ID
 */
export const getContentById = async (id: string): Promise<Result<Content | null>> => {
  try {
    const db = getDatabase();
    
    const [result] = await db.select().from(content).where(eq(content.id, id));
    
    return {
      success: true,
      data: result || null
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Delete content
 */
export const deleteContent = async (id: string): Promise<Result<void>> => {
  try {
    const db = getDatabase();
    
    const result = await db.delete(content).where(eq(content.id, id));
    
    if (result.changes === 0) {
      return {
        success: false,
        error: new Error(`Content not found: ${id}`)
      };
    }
    
    console.log(`🗑️ Content ${id} deleted`);
    
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
export const getContentPipeline = async (rootTranscriptId: string): Promise<Result<{
  transcript?: Content;
  insights: Content[];
  posts: Content[];
  scheduledPosts: Content[];
}>> => {
  try {
    const pipelineContent = await getContent({ rootTranscriptId });
    
    if (!pipelineContent.success) {
      return pipelineContent as any;
    }
    
    // Organize by type
    const transcript = pipelineContent.data.find(c => c.contentType === 'transcript');
    const insights = pipelineContent.data.filter(c => c.contentType === 'insight');
    const posts = pipelineContent.data.filter(c => c.contentType === 'post');
    const scheduledPosts = pipelineContent.data.filter(c => c.contentType === 'scheduled_post');
    
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