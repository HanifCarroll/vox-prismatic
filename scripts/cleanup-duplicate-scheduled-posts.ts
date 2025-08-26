#!/usr/bin/env bun

/**
 * Script to clean up duplicate scheduled posts in the database
 * Keeps only the most recently created scheduled post for each postId
 */

import { PrismaClient } from '../apps/api/src/database/prisma/generated';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('🔍 Finding duplicate scheduled posts...');
  
  try {
    // Find all scheduled posts grouped by postId
    // Include both pending and cancelled to clean up all duplicates
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        OR: [
          { status: 'pending' },
          { status: 'cancelled' }
        ]
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
      }
    });

    // Group by postId
    const groupedByPostId = new Map<string, typeof scheduledPosts>();
    
    for (const post of scheduledPosts) {
      if (post.postId) {
        if (!groupedByPostId.has(post.postId)) {
          groupedByPostId.set(post.postId, []);
        }
        groupedByPostId.get(post.postId)!.push(post);
      }
    }

    // Find and delete duplicates
    let deletedCount = 0;
    
    for (const [postId, posts] of groupedByPostId) {
      if (posts.length > 1) {
        console.log(`\n📋 Post ${postId} has ${posts.length} scheduled entries:`);
        posts.forEach((p, i) => {
          console.log(`  ${i + 1}. ID: ${p.id}, Platform: ${p.platform}, Time: ${p.scheduledTime}, Created: ${p.createdAt}`);
        });
        
        // Keep the first one (most recent), delete the rest
        const toDelete = posts.slice(1);
        
        for (const post of toDelete) {
          console.log(`  ❌ Deleting duplicate: ${post.id}`);
          await prisma.scheduledPost.delete({
            where: { id: post.id }
          });
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`\n✅ Cleaned up ${deletedCount} duplicate scheduled posts`);
    } else {
      console.log('\n✅ No duplicates found');
    }

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicates();