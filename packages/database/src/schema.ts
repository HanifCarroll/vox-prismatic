import { Database } from 'bun:sqlite';

/**
 * Complete SQLite schema for the content creation pipeline
 * Replaces Notion with a comprehensive local database
 */

export const SCHEMA_VERSION = 1;

export const createSchema = (db: Database): void => {
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
    VALUES ('version', ?)
  `);
  versionStmt.run(SCHEMA_VERSION.toString());

  // =====================================================================
  // TRANSCRIPTS - Raw transcripts from desktop app recordings
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'processing', 'cleaned', 'error')),
      source_type TEXT NOT NULL DEFAULT 'recording' CHECK (source_type IN ('recording', 'upload', 'manual')),
      duration_seconds INTEGER,
      file_path TEXT,
      metadata TEXT, -- JSON: recording settings, source info, etc.
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // =====================================================================
  // CLEANED_TRANSCRIPTS - AI-processed, cleaned versions
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS cleaned_transcripts (
      id TEXT PRIMARY KEY,
      transcript_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'processed', 'error')),
      processing_duration_ms INTEGER,
      estimated_tokens INTEGER,
      estimated_cost REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
    )
  `);

  // =====================================================================
  // INSIGHTS - AI-extracted insights from cleaned transcripts
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      cleaned_transcript_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      verbatim_quote TEXT NOT NULL,
      category TEXT NOT NULL,
      post_type TEXT NOT NULL CHECK (post_type IN ('Problem', 'Proof', 'Framework', 'Contrarian Take', 'Mental Model')),
      
      -- Scoring system
      urgency_score INTEGER NOT NULL CHECK (urgency_score BETWEEN 1 AND 10),
      relatability_score INTEGER NOT NULL CHECK (relatability_score BETWEEN 1 AND 10),
      specificity_score INTEGER NOT NULL CHECK (specificity_score BETWEEN 1 AND 10),
      authority_score INTEGER NOT NULL CHECK (authority_score BETWEEN 1 AND 10),
      total_score INTEGER GENERATED ALWAYS AS (urgency_score + relatability_score + specificity_score + authority_score),
      
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'needs_review', 'approved', 'rejected', 'archived')),
      
      -- Processing metadata
      processing_duration_ms INTEGER,
      estimated_tokens INTEGER,
      estimated_cost REAL,
      
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (cleaned_transcript_id) REFERENCES cleaned_transcripts(id) ON DELETE CASCADE
    )
  `);

  // =====================================================================
  // POSTS - Generated social media posts from insights
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      insight_id TEXT NOT NULL,
      title TEXT NOT NULL,
      platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'x', 'instagram', 'facebook', 'youtube')),
      
      -- Content structure
      hook TEXT,
      body TEXT NOT NULL,
      soft_cta TEXT,
      direct_cta TEXT,
      full_content TEXT NOT NULL, -- Complete assembled post
      
      -- Post metadata  
      character_count INTEGER,
      estimated_engagement_score INTEGER,
      hashtags TEXT, -- JSON array of hashtags
      mentions TEXT, -- JSON array of mentions
      
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'needs_review', 'approved', 'scheduled', 'published', 'failed', 'archived')),
      
      -- Processing metadata
      processing_duration_ms INTEGER,
      estimated_tokens INTEGER,
      estimated_cost REAL,
      
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (insight_id) REFERENCES insights(id) ON DELETE CASCADE
    )
  `);

  // =====================================================================
  // SCHEDULED_POSTS - Post scheduling information (migrated from scheduler package)
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id TEXT PRIMARY KEY,
      post_id TEXT,  -- Optional: links to posts table if generated from insights
      platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'x', 'postiz', 'instagram', 'facebook')),
      content TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempt TEXT,
      error_message TEXT,
      external_post_id TEXT, -- ID from the actual platform after posting
      
      -- Metadata for posting options
      metadata TEXT, -- JSON: visibility, images, reply_to, etc.
      
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
    )
  `);

  // =====================================================================
  // PROCESSING_JOBS - Track long-running AI processing tasks
  // =====================================================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL CHECK (job_type IN ('clean_transcript', 'extract_insights', 'generate_posts')),
      source_id TEXT NOT NULL, -- ID of the source record being processed
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
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK (entity_type IN ('transcript', 'insight', 'post', 'scheduled_post')),
      entity_id TEXT NOT NULL,
      
      -- Event data
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
  
  // Transcripts
  db.exec('CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transcripts_created ON transcripts(created_at DESC)');

  // Cleaned Transcripts  
  db.exec('CREATE INDEX IF NOT EXISTS idx_cleaned_transcripts_transcript ON cleaned_transcripts(transcript_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cleaned_transcripts_status ON cleaned_transcripts(status)');

  // Insights
  db.exec('CREATE INDEX IF NOT EXISTS idx_insights_transcript ON insights(cleaned_transcript_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_insights_score ON insights(total_score DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_insights_category ON insights(category)');

  // Posts
  db.exec('CREATE INDEX IF NOT EXISTS idx_posts_insight ON posts(insight_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)');

  // Scheduled Posts
  db.exec('CREATE INDEX IF NOT EXISTS idx_scheduled_posts_time_status ON scheduled_posts(scheduled_time, status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform ON scheduled_posts(platform)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_scheduled_posts_post_id ON scheduled_posts(post_id)');

  // Processing Jobs
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON processing_jobs(job_type, status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_source ON processing_jobs(source_id)');

  // Analytics
  db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_entity ON analytics_events(entity_type, entity_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_occurred ON analytics_events(occurred_at DESC)');

  // Settings
  db.exec('CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category)');

  console.log('📊 Content creation database schema initialized');
  console.log(`   Schema version: ${SCHEMA_VERSION}`);
  console.log('   Tables created: transcripts, cleaned_transcripts, insights, posts, scheduled_posts, processing_jobs, analytics_events, settings');
};