#!/usr/bin/env bun

/**
 * Script to fix date formats in the database
 * Converts Unix timestamps to ISO strings
 */

import Database from 'better-sqlite3';
import path from 'path';

// Path to the database
const dbPath = path.join(process.cwd(), 'data', 'content.db');
console.log('📂 Using database:', dbPath);

const db = new Database(dbPath);

try {
  console.log('🔍 Checking for incorrect date formats in scheduled_posts...\n');

  // First, let's see what we have
  const posts = db.prepare('SELECT id, platform, created_at, updated_at FROM scheduled_posts').all();
  
  console.log(`Found ${posts.length} scheduled posts`);
  
  let fixedCount = 0;
  
  for (const post of posts) {
    let needsUpdate = false;
    let updates: any = {};
    
    // Check if created_at looks like a Unix timestamp (all digits and long)
    if (post.created_at && /^\d{10,13}$/.test(post.created_at)) {
      const timestamp = parseInt(post.created_at);
      const date = new Date(timestamp);
      updates.created_at = date.toISOString();
      needsUpdate = true;
      console.log(`  ❌ Post ${post.id} has Unix timestamp in created_at: ${post.created_at}`);
      console.log(`     Converting to: ${updates.created_at}`);
    }
    
    // Check if updated_at looks like a Unix timestamp
    if (post.updated_at && /^\d{10,13}$/.test(post.updated_at)) {
      const timestamp = parseInt(post.updated_at);
      const date = new Date(timestamp);
      updates.updated_at = date.toISOString();
      needsUpdate = true;
      console.log(`  ❌ Post ${post.id} has Unix timestamp in updated_at: ${post.updated_at}`);
      console.log(`     Converting to: ${updates.updated_at}`);
    }
    
    if (needsUpdate) {
      // Update the record with correct date format
      const updateStmt = db.prepare(`
        UPDATE scheduled_posts 
        SET created_at = COALESCE(?, created_at),
            updated_at = COALESCE(?, updated_at)
        WHERE id = ?
      `);
      
      updateStmt.run(
        updates.created_at || post.created_at,
        updates.updated_at || post.updated_at,
        post.id
      );
      
      console.log(`  ✅ Fixed dates for post ${post.id}\n`);
      fixedCount++;
    }
  }
  
  if (fixedCount > 0) {
    console.log(`✅ Fixed date formats in ${fixedCount} scheduled posts`);
  } else {
    console.log('✅ All scheduled posts have correct date formats');
  }
  
  // Also check posts table
  console.log('\n🔍 Checking posts table...');
  
  const postsTable = db.prepare('SELECT id, created_at, updated_at FROM posts LIMIT 5').all();
  let postsFixed = 0;
  
  for (const post of postsTable) {
    let needsUpdate = false;
    let updates: any = {};
    
    if (post.created_at && /^\d{10,13}$/.test(post.created_at)) {
      updates.created_at = new Date(parseInt(post.created_at)).toISOString();
      needsUpdate = true;
    }
    
    if (post.updated_at && /^\d{10,13}$/.test(post.updated_at)) {
      updates.updated_at = new Date(parseInt(post.updated_at)).toISOString();
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const updateStmt = db.prepare(`
        UPDATE posts 
        SET created_at = COALESCE(?, created_at),
            updated_at = COALESCE(?, updated_at)
        WHERE id = ?
      `);
      
      updateStmt.run(
        updates.created_at || post.created_at,
        updates.updated_at || post.updated_at,
        post.id
      );
      
      postsFixed++;
    }
  }
  
  if (postsFixed > 0) {
    console.log(`✅ Fixed date formats in ${postsFixed} posts`);
  }

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}

console.log('\n✅ Date format check complete!');