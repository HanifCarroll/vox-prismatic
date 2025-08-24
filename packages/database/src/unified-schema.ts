import Database, { Database as DatabaseType } from 'better-sqlite3';

/**
 * Unified Content Table Schema
 * Single table approach for the entire content pipeline
 */

export const UNIFIED_SCHEMA_VERSION = 2;

export const createUnifiedSchema = (db: DatabaseType): void => {
  // Enable foreign keys and WAL mode for better performance
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  
  // Schema version table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_info (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Insert or update schema version
  const versionStmt = db.prepare(`
    INSERT OR REPLACE INTO schema_info (key, value) 
    VALUES ('unified_version', ?)
  `);
  versionStmt.run(UNIFIED_SCHEMA_VERSION.toString());

  // =====================================================================
  // UNIFIED CONTENT TABLE - Single source of truth for entire pipeline
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      
      -- Content Classification
      content_type TEXT NOT NULL CHECK (content_type IN ('transcript', 'insight', 'post', 'scheduled_post')),
      title TEXT NOT NULL,
      
      -- Pipeline Status
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'raw', 'cleaning', 'cleaned', 
        'processing_insights', 'insights_generated',
        'generating_posts', 'posts_generated',
        'needs_review', 'approved', 'rejected',
        'scheduling', 'scheduled', 'published', 'failed',
        'cancelled', 'archived'
      )),
      
      -- Content Data
      raw_content TEXT,
      processed_content TEXT,
      metadata TEXT, -- JSON: platform-specific data, tags, scores, etc.
      
      -- Relationships
      parent_id TEXT REFERENCES content(id) ON DELETE SET NULL,
      root_transcript_id TEXT REFERENCES content(id) ON DELETE CASCADE,
      
      -- Source Information
      source_type TEXT CHECK (source_type IN ('recording', 'upload', 'manual', 'ai_generated')),
      source_url TEXT,
      file_path TEXT,
      
      -- Content Metrics
      word_count INTEGER DEFAULT 0,
      duration_seconds INTEGER,
      
      -- Scheduling (for scheduled_post type)
      scheduled_time TEXT,
      platform TEXT CHECK (platform IN ('linkedin', 'x', 'instagram', 'facebook', 'youtube')),
      retry_count INTEGER DEFAULT 0,
      last_attempt TEXT,
      error_message TEXT,
      external_post_id TEXT,
      
      -- Processing Metadata
      processing_duration_ms INTEGER,
      estimated_tokens INTEGER,
      estimated_cost REAL,
      
      -- Timestamps
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // =====================================================================
  // CONTENT RELATIONSHIPS - Track the content pipeline flow
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_relationships (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      child_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'transcript_to_insight', 'insight_to_post', 'post_to_scheduled'
      )),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(parent_id, child_id, relationship_type)
    )
  `);

  // =====================================================================
  // PROCESSING_JOBS - Track long-running AI processing tasks
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      job_type TEXT NOT NULL CHECK (job_type IN ('clean_transcript', 'extract_insights', 'generate_posts')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      
      -- Processing results
      result_count INTEGER DEFAULT 0,
      error_message TEXT,
      
      -- Performance metrics
      started_at TEXT,
      completed_at TEXT,
      duration_ms INTEGER,
      estimated_tokens INTEGER,
      estimated_cost REAL,
      
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // =====================================================================
  // ANALYTICS - Track content performance and system metrics
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_data TEXT, -- JSON: metrics, performance data, etc.
      value REAL,      -- Numeric value for aggregation
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // =====================================================================
  // SETTINGS - Application configuration and user preferences
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // =====================================================================
  // CREATE INDEXES for performance
  // =====================================================================
  
  // Content indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_content_type_status ON content(content_type, status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_content_parent ON content(parent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_content_root_transcript ON content(root_transcript_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_content_created ON content(created_at DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_content_scheduled_time ON content(scheduled_time)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_content_platform_status ON content(platform, status)');

  // Relationships indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_relationships_parent ON content_relationships(parent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_relationships_child ON content_relationships(child_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_relationships_type ON content_relationships(relationship_type)');

  // Processing jobs indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_content ON processing_jobs(content_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON processing_jobs(job_type, status)');

  // Analytics indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_content ON analytics_events(content_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_occurred ON analytics_events(occurred_at DESC)');

  console.log('🔄 Unified content database schema initialized');
  console.log(`   Schema version: ${UNIFIED_SCHEMA_VERSION}`);
  console.log('   Tables created: content, content_relationships, processing_jobs, analytics_events, settings');
};