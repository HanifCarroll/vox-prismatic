#!/usr/bin/env bun
/**
 * Simple test for the scheduler functionality
 */

import { schedulePost, getScheduledPosts, getStats } from './scheduler';
import { processReadyPosts } from './processor';

const runTests = async () => {
  console.log('🧪 Testing Scheduler Package...\n');

  // Test 1: Schedule a test post
  console.log('1. Testing post scheduling...');
  const futureTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
  
  const scheduleResult = schedulePost(
    'linkedin',
    'This is a test post for the scheduler! 🚀',
    futureTime,
    { originalPostId: 'test-123' }
  );

  if (scheduleResult.success) {
    console.log(`✅ Post scheduled successfully: ${scheduleResult.data}`);
  } else {
    console.error(`❌ Failed to schedule post: ${scheduleResult.error.message}`);
    return;
  }

  // Test 2: Get scheduled posts
  console.log('\n2. Testing post retrieval...');
  const postsResult = getScheduledPosts();
  
  if (postsResult.success) {
    console.log(`✅ Found ${postsResult.data.length} scheduled posts`);
    postsResult.data.forEach(post => {
      console.log(`   - ${post.platform}: ${post.content.substring(0, 50)}... (${post.status})`);
    });
  } else {
    console.error(`❌ Failed to get posts: ${postsResult.error.message}`);
  }

  // Test 3: Get statistics
  console.log('\n3. Testing statistics...');
  const statsResult = getStats();
  
  if (statsResult.success) {
    console.log('✅ Scheduler statistics:');
    console.log(`   Total: ${statsResult.data.total}`);
    console.log(`   Pending: ${statsResult.data.pending}`);
    console.log(`   Published: ${statsResult.data.published}`);
    console.log(`   Failed: ${statsResult.data.failed}`);
    console.log(`   By Platform:`, statsResult.data.byPlatform);
  } else {
    console.error(`❌ Failed to get stats: ${statsResult.error.message}`);
  }

  // Test 4: Try processing (should find no ready posts unless we wait)
  console.log('\n4. Testing processor...');
  const processResult = await processReadyPosts({
    maxConcurrent: 1,
    retryDelay: 1000
  });

  if (processResult.success) {
    const { processed, succeeded, failed } = processResult.data;
    console.log(`✅ Processor run: ${processed} processed, ${succeeded} succeeded, ${failed} failed`);
    
    if (processed === 0) {
      console.log('   (No posts ready - this is expected since we scheduled for the future)');
    }
  } else {
    console.error(`❌ Processor failed: ${processResult.error.message}`);
  }

  // Test 5: Schedule a post for immediate processing
  console.log('\n5. Testing immediate post processing...');
  const pastTime = new Date(Date.now() - 1000); // 1 second ago
  
  const immediateResult = schedulePost(
    'linkedin',
    'This post should be ready for immediate processing! ⚡',
    pastTime
  );

  if (immediateResult.success) {
    console.log(`✅ Immediate post scheduled: ${immediateResult.data}`);
    
    // Try processing again
    const processAgainResult = await processReadyPosts({
      maxConcurrent: 1,
      retryDelay: 1000,
      // No platform configs provided, so it should fail gracefully
    });

    if (processAgainResult.success) {
      const { processed, succeeded, failed } = processAgainResult.data;
      console.log(`✅ Second processor run: ${processed} processed, ${succeeded} succeeded, ${failed} failed`);
      
      if (failed > 0) {
        console.log('   (Failures expected since no platform configs provided)');
      }
    }
  }

  console.log('\n🎉 Scheduler tests completed!');
  console.log('\n💡 Next steps:');
  console.log('   - Configure LinkedIn/X credentials');
  console.log('   - Run the processor with proper config');
  console.log('   - Set up cron job for continuous processing');
};

if (import.meta.main) {
  runTests().catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
  });
}