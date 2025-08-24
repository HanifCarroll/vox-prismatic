import { getDatabase } from './connection';
import { createUnifiedSchema } from './unified-schema';

/**
 * Migration script to move from fragmented tables to unified content table
 */

interface LegacyTranscript {
  id: string;
  title: string;
  content: string;
  status: string;
  source_type: string;
  duration_seconds?: number;
  file_path?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

interface LegacyInsight {
  id: string;
  cleaned_transcript_id: string;
  title: string;
  summary: string;
  verbatim_quote: string;
  category: string;
  post_type: string;
  urgency_score: number;
  relatability_score: number;
  specificity_score: number;
  authority_score: number;
  total_score: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LegacyPost {
  id: string;
  insight_id: string;
  title: string;
  platform: string;
  hook?: string;
  body: string;
  soft_cta?: string;
  direct_cta?: string;
  full_content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LegacyScheduledPost {
  id: string;
  post_id?: string;
  platform: string;
  content: string;
  scheduled_time: string;
  status: string;
  retry_count: number;
  last_attempt?: string;
  error_message?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export const migrateToUnifiedSchema = (): boolean => {
  try {
    console.log('🔄 Starting migration to unified content table...');
    
    const db = getDatabase();
    
    // Check if unified schema already exists
    const unifiedVersionCheck = db.prepare(`
      SELECT value FROM schema_info WHERE key = 'unified_version'
    `).get();
    
    if (unifiedVersionCheck) {
      console.log('✅ Unified schema already exists, skipping migration');
      return true;
    }
    
    // Create unified schema
    createUnifiedSchema(db);
    
    // Start transaction
    db.exec('BEGIN');
    
    try {
      // Migrate transcripts
      migrateTranscripts(db);
      
      // Migrate cleaned transcripts (if any)
      migrateCleanedTranscripts(db);
      
      // Migrate insights
      migrateInsights(db);
      
      // Migrate posts
      migratePosts(db);
      
      // Migrate scheduled posts
      migrateScheduledPosts(db);
      
      // Create relationships
      createContentRelationships(db);
      
      db.exec('COMMIT');
      
      console.log('✅ Migration completed successfully!');
      console.log('📊 Migration summary:');
      
      // Show migration results
      const contentCounts = db.prepare(`
        SELECT content_type, COUNT(*) as count 
        FROM content 
        GROUP BY content_type
      `).all();
      
      contentCounts.forEach((row: any) => {
        console.log(`   ${row.content_type}: ${row.count} items`);
      });
      
      return true;
      
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
};

function migrateTranscripts(db: any) {
  console.log('📄 Migrating transcripts...');
  
  const transcripts = db.prepare('SELECT * FROM transcripts').all() as LegacyTranscript[];
  
  const insertContent = db.prepare(`
    INSERT INTO content (
      id, content_type, title, status, raw_content, source_type, 
      file_path, duration_seconds, metadata, word_count,
      created_at, updated_at
    ) VALUES (?, 'transcript', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const transcript of transcripts) {
    const wordCount = transcript.content ? transcript.content.split(' ').length : 0;
    
    insertContent.run(
      transcript.id,
      transcript.title,
      transcript.status,
      transcript.content,
      transcript.source_type,
      transcript.file_path,
      transcript.duration_seconds,
      transcript.metadata,
      wordCount,
      transcript.created_at,
      transcript.updated_at
    );
  }
  
  console.log(`   Migrated ${transcripts.length} transcripts`);
}

function migrateCleanedTranscripts(db: any) {
  console.log('✨ Migrating cleaned transcripts...');
  
  try {
    const cleanedTranscripts = db.prepare('SELECT * FROM cleaned_transcripts').all();
    
    const insertContent = db.prepare(`
      INSERT INTO content (
        id, content_type, title, status, processed_content, parent_id,
        metadata, created_at, updated_at
      ) VALUES (?, 'transcript', ?, 'cleaned', ?, ?, ?, ?, ?)
    `);
    
    for (const cleaned of cleanedTranscripts) {
      insertContent.run(
        `cleaned_${cleaned.id}`,
        cleaned.title,
        cleaned.content,
        cleaned.transcript_id, // parent_id
        JSON.stringify({ originalId: cleaned.id, processingDuration: cleaned.processing_duration_ms }),
        cleaned.created_at,
        cleaned.updated_at
      );
    }
    
    console.log(`   Migrated ${cleanedTranscripts.length} cleaned transcripts`);
  } catch (error) {
    console.log('   No cleaned transcripts to migrate (table may not exist)');
  }
}

function migrateInsights(db: any) {
  console.log('💡 Migrating insights...');
  
  try {
    const insights = db.prepare('SELECT * FROM insights').all() as LegacyInsight[];
    
    const insertContent = db.prepare(`
      INSERT INTO content (
        id, content_type, title, status, raw_content, processed_content,
        parent_id, metadata, created_at, updated_at
      ) VALUES (?, 'insight', ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const insight of insights) {
      const metadata = {
        summary: insight.summary,
        category: insight.category,
        postType: insight.post_type,
        scores: {
          urgency: insight.urgency_score,
          relatability: insight.relatability_score,
          specificity: insight.specificity_score,
          authority: insight.authority_score,
          total: insight.total_score
        }
      };
      
      insertContent.run(
        insight.id,
        insight.title,
        insight.status,
        insight.verbatim_quote,
        insight.summary,
        insight.cleaned_transcript_id,
        JSON.stringify(metadata),
        insight.created_at,
        insight.updated_at
      );
    }
    
    console.log(`   Migrated ${insights.length} insights`);
  } catch (error) {
    console.log('   No insights to migrate (table may not exist)');
  }
}

function migratePosts(db: any) {
  console.log('📝 Migrating posts...');
  
  try {
    const posts = db.prepare('SELECT * FROM posts').all() as LegacyPost[];
    
    const insertContent = db.prepare(`
      INSERT INTO content (
        id, content_type, title, status, processed_content, platform,
        parent_id, metadata, created_at, updated_at
      ) VALUES (?, 'post', ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const post of posts) {
      const metadata = {
        hook: post.hook,
        body: post.body,
        softCta: post.soft_cta,
        directCta: post.direct_cta
      };
      
      insertContent.run(
        post.id,
        post.title,
        post.status,
        post.full_content,
        post.platform,
        post.insight_id,
        JSON.stringify(metadata),
        post.created_at,
        post.updated_at
      );
    }
    
    console.log(`   Migrated ${posts.length} posts`);
  } catch (error) {
    console.log('   No posts to migrate (table may not exist)');
  }
}

function migrateScheduledPosts(db: any) {
  console.log('📅 Migrating scheduled posts...');
  
  try {
    const scheduledPosts = db.prepare('SELECT * FROM scheduled_posts').all() as LegacyScheduledPost[];
    
    const insertContent = db.prepare(`
      INSERT INTO content (
        id, content_type, title, status, processed_content, platform,
        scheduled_time, retry_count, last_attempt, error_message,
        parent_id, metadata, created_at, updated_at
      ) VALUES (?, 'scheduled_post', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const scheduledPost of scheduledPosts) {
      const title = `${scheduledPost.platform} Post - ${new Date(scheduledPost.scheduled_time).toLocaleDateString()}`;
      
      insertContent.run(
        scheduledPost.id,
        title,
        scheduledPost.status,
        scheduledPost.content,
        scheduledPost.platform,
        scheduledPost.scheduled_time,
        scheduledPost.retry_count,
        scheduledPost.last_attempt,
        scheduledPost.error_message,
        scheduledPost.post_id,
        scheduledPost.metadata,
        scheduledPost.created_at,
        scheduledPost.updated_at
      );
    }
    
    console.log(`   Migrated ${scheduledPosts.length} scheduled posts`);
  } catch (error) {
    console.log('   No scheduled posts to migrate (table may not exist)');
  }
}

function createContentRelationships(db: any) {
  console.log('🔗 Creating content relationships...');
  
  // Create relationships based on parent_id references
  const createRelationships = db.prepare(`
    INSERT OR IGNORE INTO content_relationships (
      id, parent_id, child_id, relationship_type
    )
    SELECT 
      parent_id || '_to_' || id as id,
      parent_id,
      id as child_id,
      CASE 
        WHEN parent.content_type = 'transcript' AND child.content_type = 'insight' THEN 'transcript_to_insight'
        WHEN parent.content_type = 'insight' AND child.content_type = 'post' THEN 'insight_to_post' 
        WHEN parent.content_type = 'post' AND child.content_type = 'scheduled_post' THEN 'post_to_scheduled'
        ELSE 'unknown'
      END as relationship_type
    FROM content child
    JOIN content parent ON parent.id = child.parent_id
    WHERE child.parent_id IS NOT NULL
  `);
  
  const result = createRelationships.run();
  console.log(`   Created ${result.changes} content relationships`);
}

// Export for use in other modules
export { migrateToUnifiedSchema as default };