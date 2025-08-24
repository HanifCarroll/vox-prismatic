import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { Result } from '@content-creation/shared';

/**
 * Simple Drizzle Implementation
 * Starting with a working minimal setup
 */

// Simple content table schema
export const content = sqliteTable('content', {
  id: text('id').primaryKey(),
  contentType: text('content_type').notNull(),
  title: text('title').notNull(),
  status: text('status').notNull().default('raw'),
  rawContent: text('raw_content'),
  processedContent: text('processed_content'),
  metadata: text('metadata'), // JSON string
  parentId: text('parent_id'),
  rootTranscriptId: text('root_transcript_id'),
  sourceType: text('source_type'),
  sourceUrl: text('source_url'),
  filePath: text('file_path'),
  wordCount: integer('word_count').default(0),
  durationSeconds: integer('duration_seconds'),
  scheduledTime: text('scheduled_time'),
  platform: text('platform'),
  retryCount: integer('retry_count').default(0),
  lastAttempt: text('last_attempt'),
  errorMessage: text('error_message'),
  externalPostId: text('external_post_id'),
  processingDurationMs: integer('processing_duration_ms'),
  estimatedTokens: integer('estimated_tokens'),
  estimatedCost: real('estimated_cost'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Type inference
export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;

// Database connection
let db: ReturnType<typeof drizzle> | null = null;
let sqlite: Database.Database | null = null;

const getDatabasePath = (): string => {
  const projectRoot = process.cwd().includes('packages/') 
    ? process.cwd().replace(/packages\/.*/, '') 
    : process.cwd();
  return `${projectRoot}/data/content.sqlite`;
};

export const initDatabase = () => {
  if (db) return db;
  
  const dbPath = getDatabasePath();
  console.log(`📊 Connecting to database: ${dbPath}`);
  
  sqlite = new Database(dbPath);
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec('PRAGMA journal_mode = WAL');
  
  db = drizzle(sqlite);
  
  // Create table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'raw',
      raw_content TEXT,
      processed_content TEXT,
      metadata TEXT,
      parent_id TEXT,
      root_transcript_id TEXT,
      source_type TEXT,
      source_url TEXT,
      file_path TEXT,
      word_count INTEGER DEFAULT 0,
      duration_seconds INTEGER,
      scheduled_time TEXT,
      platform TEXT,
      retry_count INTEGER DEFAULT 0,
      last_attempt TEXT,
      error_message TEXT,
      external_post_id TEXT,
      processing_duration_ms INTEGER,
      estimated_tokens INTEGER,
      estimated_cost REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  
  return db;
};

export const getDatabase = () => {
  if (!db) return initDatabase();
  return db;
};

// Content repository functions
export interface ContentFilter {
  contentType?: string;
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

export const getContent = async (filters?: ContentFilter): Promise<Result<Content[]>> => {
  try {
    const database = getDatabase();
    
    let query = database.select().from(content);
    
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
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(content.createdAt)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
      if (filters?.offset) {
        query = query.offset(filters.offset) as any;
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

export const getContentStats = async (): Promise<Result<ContentStats>> => {
  try {
    const database = getDatabase();
    
    // Get total count
    const [totalResult] = await database.select({ count: count() }).from(content);
    
    // Get counts by type
    const byTypeResults = await database
      .select({ 
        contentType: content.contentType, 
        count: count() 
      })
      .from(content)
      .groupBy(content.contentType);
    
    // Get counts by status  
    const byStatusResults = await database
      .select({
        status: content.status,
        count: count()
      })
      .from(content)
      .groupBy(content.status);
    
    // Get counts by platform
    const byPlatformResults = await database
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

export const createContent = async (data: Partial<NewContent>): Promise<Result<Content>> => {
  try {
    const database = getDatabase();
    const id = data.id || `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newContent: NewContent = {
      id,
      contentType: data.contentType || 'transcript',
      title: data.title || 'Untitled',
      status: data.status || 'raw',
      rawContent: data.rawContent || null,
      processedContent: data.processedContent || null,
      metadata: data.metadata || null,
      parentId: data.parentId || null,
      rootTranscriptId: data.rootTranscriptId || (data.contentType === 'transcript' ? id : null),
      sourceType: data.sourceType || null,
      sourceUrl: data.sourceUrl || null,
      filePath: data.filePath || null,
      wordCount: data.wordCount || 0,
      durationSeconds: data.durationSeconds || null,
      scheduledTime: data.scheduledTime || null,
      platform: data.platform || null,
      retryCount: data.retryCount || 0,
      lastAttempt: data.lastAttempt || null,
      errorMessage: data.errorMessage || null,
      externalPostId: data.externalPostId || null,
      processingDurationMs: data.processingDurationMs || null,
      estimatedTokens: data.estimatedTokens || null,
      estimatedCost: data.estimatedCost || null,
      createdAt: now,
      updatedAt: now
    };
    
    await database.insert(content).values(newContent);
    
    const [created] = await database.select().from(content).where(eq(content.id, id));
    
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

export const updateContentStatus = async (id: string, status: string): Promise<Result<void>> => {
  try {
    const database = getDatabase();
    const now = new Date().toISOString();
    
    const result = await database
      .update(content)
      .set({ 
        status, 
        updatedAt: now 
      })
      .where(eq(content.id, id));
    
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

// Legacy compatibility aliases
export const getUnifiedContent = getContent;
export const getUnifiedContentStats = getContentStats;
export const createUnifiedContent = createContent;
export const updateUnifiedContentStatus = updateContentStatus;