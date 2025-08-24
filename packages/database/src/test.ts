#!/usr/bin/env bun
/**
 * Simple test for the database functionality
 * Tests the complete content pipeline: Transcripts → Insights → Posts → Scheduling
 */

import { initDatabase, getDatabaseStats } from './connection';
import { createTranscript, getTranscripts } from './transcripts';
import { createInsight, getInsights } from './insights';
import { createPost, getPosts } from './posts';
import { createScheduledPost, getScheduledPosts } from './scheduled-posts';

const runTests = async () => {
  console.log('🧪 Testing Database Package...\n');

  // Initialize database
  console.log('1. Initializing database...');
  try {
    initDatabase();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return;
  }

  // Test 1: Create a transcript
  console.log('\n2. Testing transcript creation...');
  const transcriptResult = createTranscript({
    title: 'Test Recording: Content Strategy Meeting',
    content: 'This is a sample transcript from our content strategy meeting. We discussed various approaches to creating engaging content for our audience. Key points included understanding our target demographic, developing compelling narratives, and measuring engagement metrics.',
    sourceType: 'recording',
    durationSeconds: 300,
    metadata: { quality: 'high', source: 'zoom' }
  });

  if (transcriptResult.success) {
    console.log(`✅ Transcript created: ${transcriptResult.data.id}`);
  } else {
    console.error('❌ Transcript creation failed:', transcriptResult.error.message);
    return;
  }

  // Test 2: Create a cleaned transcript and then an insight
  console.log('\n3. Testing cleaned transcript and insight creation...');
  
  // Create a cleaned transcript (this would normally be done by AI processing)
  // For now, we'll create it manually in the cleaned_transcripts table
  const db = await import('./connection').then(m => m.getDatabase());
  
  // Insert directly into cleaned_transcripts table
  const cleanedTranscriptId = `cleaned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const cleanedStmt = db.prepare(`
    INSERT INTO cleaned_transcripts (id, transcript_id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  cleanedStmt.run(
    cleanedTranscriptId,
    transcriptResult.data.id,
    'Cleaned: Content Strategy Meeting',
    'Clean version: Content strategy focuses on understanding your audience and creating compelling narratives.',
    now,
    now
  );
  
  console.log(`✅ Cleaned transcript created: ${cleanedTranscriptId}`);

  const insightResult = createInsight({
    cleanedTranscriptId: cleanedTranscriptId,
    title: 'Audience-First Content Strategy',
    summary: 'Successful content creation starts with deep audience understanding before crafting narratives.',
    verbatimQuote: 'understanding our target demographic, developing compelling narratives',
    category: 'Content Strategy',
    postType: 'Framework',
    urgencyScore: 8,
    relatabilityScore: 9,
    specificityScore: 7,
    authorityScore: 8,
    processingDurationMs: 1500,
    estimatedTokens: 250,
    estimatedCost: 0.02
  });

  if (insightResult.success) {
    console.log(`✅ Insight created: ${insightResult.data.id} (score: ${insightResult.data.totalScore})`);
  } else {
    console.error('❌ Insight creation failed:', insightResult.error.message);
    return;
  }

  // Test 3: Create a post
  console.log('\n4. Testing post creation...');
  const postResult = createPost({
    insightId: insightResult.data.id,
    title: 'Audience-First Strategy Post',
    platform: 'linkedin',
    hook: '🎯 Want to create content that actually resonates?',
    body: 'The secret isn\'t in the fancy tools or trending topics.\n\nIt\'s in understanding your audience first.\n\nBefore you write a single word:\n• Research their pain points\n• Understand their language\n• Know their aspirations\n\nThen craft your narrative around THEIR world.',
    softCta: 'What\'s your audience\'s biggest challenge?',
    hashtags: ['#ContentStrategy', '#AudienceFirst', '#Marketing'],
    estimatedEngagementScore: 85
  });

  if (postResult.success) {
    console.log(`✅ Post created: ${postResult.data.id} (${postResult.data.characterCount} chars)`);
  } else {
    console.error('❌ Post creation failed:', postResult.error.message);
    return;
  }

  // Test 4: Schedule the post
  console.log('\n5. Testing post scheduling...');
  const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  
  const scheduleResult = createScheduledPost({
    postId: postResult.data.id,
    platform: 'linkedin',
    content: postResult.data.fullContent,
    scheduledTime: futureTime,
    metadata: { 
      visibility: 'PUBLIC',
      originalPostId: postResult.data.id 
    }
  });

  if (scheduleResult.success) {
    console.log(`✅ Post scheduled: ${scheduleResult.data.id} for ${futureTime.toISOString()}`);
  } else {
    console.error('❌ Post scheduling failed:', scheduleResult.error.message);
    return;
  }

  // Test 5: Query data
  console.log('\n6. Testing data retrieval...');
  
  const transcripts = getTranscripts({ limit: 5 });
  const insights = getInsights({ limit: 5 });
  const posts = getPosts({ limit: 5 });
  const scheduledPosts = getScheduledPosts({ limit: 5 });

  if (transcripts.success) {
    console.log(`✅ Found ${transcripts.data.length} transcripts`);
  }

  if (insights.success) {
    console.log(`✅ Found ${insights.data.length} insights`);
  }

  if (posts.success) {
    console.log(`✅ Found ${posts.data.length} posts`);
  }

  if (scheduledPosts.success) {
    console.log(`✅ Found ${scheduledPosts.data.length} scheduled posts`);
  }

  // Test 6: Database statistics
  console.log('\n7. Testing database statistics...');
  const stats = getDatabaseStats();
  
  console.log('📊 Database Statistics:');
  console.log(`   Transcripts: ${stats.transcripts.count}`);
  console.log(`   Insights: ${stats.insights.count}`);
  console.log(`   Posts: ${stats.posts.count}`);
  console.log(`   Scheduled Posts: ${stats.scheduledPosts.count}`);
  
  if (stats.transcriptsByStatus.length > 0) {
    console.log('   Transcripts by status:');
    stats.transcriptsByStatus.forEach(item => {
      console.log(`     ${item.status}: ${item.count}`);
    });
  }

  console.log('\n🎉 Database tests completed successfully!');
  console.log('\n💡 Your content pipeline is ready:');
  console.log('   📝 Transcripts → 💡 Insights → 📱 Posts → 📅 Scheduling');
  console.log('\n🚀 Next steps:');
  console.log('   - Connect your desktop app to save transcripts');
  console.log('   - Integrate AI processing for insights and posts');
  console.log('   - Set up the scheduler processor');
  console.log('   - Build your web UI on top of this database');
};

if (import.meta.main) {
  runTests().catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
  });
}