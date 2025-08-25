#!/usr/bin/env bun
/**
 * Database Seeding Script
 * Populates the database with realistic sample data for development
 * 
 * Usage: bun run packages/database/scripts/seed.ts
 */

import { initDatabase, getDatabase } from '../src/connection';
import { transcripts, insights, posts, scheduledPosts, processingJobs, analyticsEvents, settings } from '../src/schema';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    const db = getDatabase();
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.delete(scheduledPosts);
    await db.delete(posts);
    await db.delete(insights);
    await db.delete(transcripts);
    await db.delete(processingJobs);
    await db.delete(analyticsEvents);
    await db.delete(settings);
    
    // Seed transcripts
    console.log('📝 Seeding transcripts...');
    const transcriptData = [
      {
        id: 'trans-1',
        title: 'Building Better APIs with TypeScript',
        rawContent: 'In this episode, we discuss the importance of type safety in API development. TypeScript provides excellent tooling for creating robust, maintainable APIs that scale with your team. We explore patterns like discriminated unions for error handling, branded types for domain modeling, and how to leverage conditional types for flexible API design.',
        cleanedContent: 'In this episode, we discuss the importance of type safety in API development. TypeScript provides excellent tooling for creating robust, maintainable APIs that scale with your team. We explore patterns like discriminated unions for error handling, branded types for domain modeling, and how to leverage conditional types for flexible API design.',
        status: 'cleaned' as const,
        sourceType: 'podcast',
        sourceUrl: 'https://example.com/podcast/typescript-apis',
        fileName: 'api-typescript-podcast.mp3',
        duration: 2400,
        wordCount: 187,
        filePath: '/uploads/api-typescript-podcast.mp3',
        metadata: JSON.stringify({ 
          speakers: ['Alice Johnson', 'Bob Chen'], 
          topics: ['TypeScript', 'APIs', 'Development'],
          quality: 'high'
        }),
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
        updatedAt: new Date(Date.now() - 86400000 * 6).toISOString()
      },
      {
        id: 'trans-2', 
        title: 'The Future of Web Performance',
        rawContent: 'Performance is becoming increasingly important as web applications grow more complex. We dive deep into modern performance optimization techniques including code splitting, lazy loading, service workers, and the latest browser APIs. The conversation covers real-world case studies and practical tips for measuring and improving Core Web Vitals.',
        cleanedContent: 'Performance is becoming increasingly important as web applications grow more complex. We dive deep into modern performance optimization techniques including code splitting, lazy loading, service workers, and the latest browser APIs. The conversation covers real-world case studies and practical tips for measuring and improving Core Web Vitals.',
        status: 'cleaned' as const,
        sourceType: 'youtube',
        sourceUrl: 'https://youtube.com/watch?v=performance123',
        fileName: 'web-performance-video.mp4',
        duration: 3600,
        wordCount: 312,
        filePath: '/uploads/web-performance-video.mp4',
        metadata: JSON.stringify({ 
          speakers: ['Carol Williams', 'David Kim'], 
          topics: ['Performance', 'Web Development', 'Optimization'],
          quality: 'high'
        }),
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
      },
      {
        id: 'trans-3',
        title: 'Database Design Principles',
        rawContent: 'Good database design is the foundation of any successful application. This discussion covers normalization strategies, indexing best practices, and when to denormalize for performance. We also explore modern approaches like event sourcing and CQRS patterns that can help scale complex systems.',
        cleanedContent: null,
        status: 'raw' as const,
        sourceType: 'article',
        sourceUrl: 'https://blog.example.com/database-design-principles',
        fileName: null,
        duration: null,
        wordCount: 245,
        filePath: null,
        metadata: JSON.stringify({ 
          author: 'Emma Rodriguez', 
          topics: ['Database', 'Architecture', 'Design'],
          readingTime: 15
        }),
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
    
    await db.insert(transcripts).values(transcriptData);
    
    // Seed insights
    console.log('💡 Seeding insights...');
    const insightData = [
      {
        id: 'insight-1',
        cleanedTranscriptId: 'trans-1',
        title: 'TypeScript API Design Patterns',
        summary: 'Key patterns for building type-safe APIs including discriminated unions, branded types, and conditional types for better developer experience.',
        verbatimQuote: 'TypeScript provides excellent tooling for creating robust, maintainable APIs that scale with your team.',
        category: 'Technical Tutorial',
        postType: 'Framework',
        urgencyScore: 7,
        relatabilityScore: 8,
        specificityScore: 9,
        authorityScore: 8,
        totalScore: 32,
        status: 'approved' as const,
        processingDurationMs: 15000,
        estimatedTokens: 1200,
        estimatedCost: 0.024,
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 'insight-2',
        cleanedTranscriptId: 'trans-1', 
        title: 'API Error Handling Best Practices',
        summary: 'Effective error handling strategies using TypeScript discriminated unions to create predictable, type-safe error responses.',
        verbatimQuote: 'We explore patterns like discriminated unions for error handling, branded types for domain modeling.',
        category: 'Best Practices',
        postType: 'Problem',
        urgencyScore: 6,
        relatabilityScore: 9,
        specificityScore: 8,
        authorityScore: 7,
        totalScore: 30,
        status: 'needs_review' as const,
        processingDurationMs: 12000,
        estimatedTokens: 980,
        estimatedCost: 0.0196,
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
      },
      {
        id: 'insight-3',
        cleanedTranscriptId: 'trans-2',
        title: 'Core Web Vitals Optimization',
        summary: 'Practical techniques for improving Core Web Vitals through code splitting, lazy loading, and modern browser APIs.',
        verbatimQuote: 'The conversation covers real-world case studies and practical tips for measuring and improving Core Web Vitals.',
        category: 'Performance',
        postType: 'Proof',
        urgencyScore: 8,
        relatabilityScore: 7,
        specificityScore: 9,
        authorityScore: 9,
        totalScore: 33,
        status: 'needs_review' as const,
        processingDurationMs: 18000,
        estimatedTokens: 1400,
        estimatedCost: 0.028,
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'insight-4',
        cleanedTranscriptId: 'trans-2',
        title: 'React Performance Anti-patterns',
        summary: 'Common performance mistakes in React applications and how to avoid them using proper memoization, virtualization, and state management techniques.',
        verbatimQuote: 'Most performance issues in React apps come from unnecessary re-renders and heavy computations blocking the main thread.',
        category: 'Performance',
        postType: 'Problem',
        urgencyScore: 9,
        relatabilityScore: 8,
        specificityScore: 7,
        authorityScore: 6,
        totalScore: 30,
        status: 'needs_review' as const,
        processingDurationMs: 14000,
        estimatedTokens: 1100,
        estimatedCost: 0.022,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        id: 'insight-5',
        cleanedTranscriptId: 'trans-3',
        title: 'Database Migration Strategies',
        summary: 'Best practices for handling database schema changes in production environments, including blue-green deployments and backward compatibility.',
        verbatimQuote: 'The key to successful database migrations is treating them as a separate deployment concern from your application code.',
        category: 'Database',
        postType: 'Mental Model',
        urgencyScore: 7,
        relatabilityScore: 6,
        specificityScore: 8,
        authorityScore: 9,
        totalScore: 30,
        status: 'needs_review' as const,
        processingDurationMs: 16000,
        estimatedTokens: 1300,
        estimatedCost: 0.026,
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        id: 'insight-6',
        cleanedTranscriptId: 'trans-3',
        title: 'Modern Authentication Patterns',
        summary: 'Secure authentication flows using OAuth 2.0, PKCE, and JWT best practices for modern web applications.',
        verbatimQuote: 'Authentication should be invisible to users but bulletproof for developers - that requires the right patterns and security practices.',
        category: 'Security',
        postType: 'Contrarian Take',
        urgencyScore: 8,
        relatabilityScore: 7,
        specificityScore: 9,
        authorityScore: 8,
        totalScore: 32,
        status: 'needs_review' as const,
        processingDurationMs: 17000,
        estimatedTokens: 1250,
        estimatedCost: 0.025,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    await db.insert(insights).values(insightData);
    
    // Seed posts
    console.log('📱 Seeding posts...');
    const postData = [
      {
        id: 'post-1',
        insightId: 'insight-1',
        title: 'Build Better APIs with TypeScript 🚀',
        platform: 'linkedin',
        hook: '🔧 Want to build APIs that your team actually enjoys working with?',
        body: `TypeScript isn't just about catching bugs—it's about creating APIs that scale beautifully with your team.

Here are 3 patterns that changed how I design APIs:

🎯 Discriminated Unions for Error Handling
Instead of throwing random errors, create predictable error types:

type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }

🏷️ Branded Types for Domain Modeling
Prevent mixing up similar primitive types:

type UserId = string & { __brand: 'UserId' }
type EmailAddress = string & { __brand: 'Email' }

⚡ Conditional Types for Flexibility
Create APIs that adapt based on input:

type GetUser<T> = T extends 'full' 
  ? UserWithProfile 
  : UserBasic`,
        softCta: 'What TypeScript patterns have transformed your API design?',
        directCta: 'Follow me for more TypeScript tips that actually matter 👆',
        fullContent: '🔧 Want to build APIs that your team actually enjoys working with?\n\nTypeScript isn\'t just about catching bugs—it\'s about creating APIs that scale beautifully with your team.\n\nHere are 3 patterns that changed how I design APIs:\n\n🎯 Discriminated Unions for Error Handling\nInstead of throwing random errors, create predictable error types:\n\ntype ApiResult<T> = \n  | { success: true; data: T }\n  | { success: false; error: string }\n\n🏷️ Branded Types for Domain Modeling\nPrevent mixing up similar primitive types:\n\ntype UserId = string & { __brand: \'UserId\' }\ntype EmailAddress = string & { __brand: \'Email\' }\n\n⚡ Conditional Types for Flexibility\nCreate APIs that adapt based on input:\n\ntype GetUser<T> = T extends \'full\' \n  ? UserWithProfile \n  : UserBasic\n\nWhat TypeScript patterns have transformed your API design?\n\nFollow me for more TypeScript tips that actually matter 👆',
        status: 'approved' as const,
        characterCount: 847,
        estimatedEngagementScore: 85,
        hashtags: JSON.stringify(['#TypeScript', '#API', '#WebDevelopment', '#SoftwareEngineering']),
        mentions: null,
        processingDurationMs: 25000,
        estimatedTokens: 1800,
        estimatedCost: 0.036,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
      },
      {
        id: 'post-2',
        insightId: 'insight-2',
        title: 'Stop throwing generic errors! ⚠️',
        platform: 'x',
        hook: 'Hot take: Generic error messages are killing your API\'s developer experience',
        body: `Instead of this:
throw new Error("Something went wrong")

Try this:
type AuthError = 
  | { type: "INVALID_TOKEN"; code: 401 }
  | { type: "EXPIRED_SESSION"; code: 401 }
  | { type: "INSUFFICIENT_PERMISSIONS"; code: 403 }

Your future self (and your team) will thank you 🙏

#TypeScript #ErrorHandling #APIs`,
        softCta: 'What\'s your favorite error handling pattern?',
        directCta: 'RT if this helped you! 🔄',
        fullContent: 'Hot take: Generic error messages are killing your API\'s developer experience\n\nInstead of this:\nthrow new Error("Something went wrong")\n\nTry this:\ntype AuthError = \n  | { type: "INVALID_TOKEN"; code: 401 }\n  | { type: "EXPIRED_SESSION"; code: 401 }\n  | { type: "INSUFFICIENT_PERMISSIONS"; code: 403 }\n\nYour future self (and your team) will thank you 🙏\n\nWhat\'s your favorite error handling pattern?\n\nRT if this helped you! 🔄\n\n#TypeScript #ErrorHandling #APIs',
        status: 'approved' as const,
        characterCount: 398,
        estimatedEngagementScore: 72,
        hashtags: JSON.stringify(['#TypeScript', '#ErrorHandling', '#APIs']),
        mentions: null,
        processingDurationMs: 18000,
        estimatedTokens: 1100,
        estimatedCost: 0.022,
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];
    
    await db.insert(posts).values(postData);
    
    // Seed scheduled posts
    console.log('📅 Seeding scheduled posts...');
    const scheduledPostData = [
      {
        id: 'sched-1',
        postId: 'post-1',
        platform: 'linkedin',
        content: postData[0].fullContent,
        scheduledTime: new Date(Date.now() + 86400000 * 1).toISOString(), // Tomorrow
        status: 'scheduled' as const,
        retryCount: 0,
        lastAttempt: null,
        errorMessage: null,
        externalPostId: null,
        metadata: JSON.stringify({ campaignId: 'typescript-series-1' }),
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'sched-2',
        postId: 'post-2',
        platform: 'x',
        content: postData[1].fullContent,
        scheduledTime: new Date(Date.now() + 86400000 * 2).toISOString(), // Day after tomorrow
        status: 'scheduled' as const,
        retryCount: 0,
        lastAttempt: null,
        errorMessage: null,
        externalPostId: null,
        metadata: JSON.stringify({ campaignId: 'typescript-series-1' }),
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'sched-3',
        postId: null, // Standalone scheduled post
        platform: 'linkedin',
        content: 'Quick reminder: The TypeScript 5.3 release includes some amazing new features for API developers. Thread coming tomorrow! 🧵',
        scheduledTime: new Date(Date.now() + 86400000 * 0.5).toISOString(), // In 12 hours
        status: 'scheduled' as const,
        retryCount: 0,
        lastAttempt: null,
        errorMessage: null,
        externalPostId: null,
        metadata: JSON.stringify({ campaignId: 'typescript-series-1', type: 'teaser' }),
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
      }
    ];
    
    await db.insert(scheduledPosts).values(scheduledPostData);
    
    // Seed processing jobs
    console.log('⚙️ Seeding processing jobs...');
    const jobData = [
      {
        id: 'job-1',
        jobType: 'extract_insights',
        sourceId: 'trans-1',
        status: 'completed' as const,
        progress: 100,
        resultCount: 2,
        errorMessage: null,
        startedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        completedAt: new Date(Date.now() - 86400000 * 6 + 15000).toISOString(),
        durationMs: 15000,
        estimatedTokens: 2180,
        estimatedCost: 0.0436,
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 6 + 15000).toISOString()
      },
      {
        id: 'job-2', 
        jobType: 'generate_posts',
        sourceId: 'insight-1',
        status: 'completed' as const,
        progress: 100,
        resultCount: 1,
        errorMessage: null,
        startedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        completedAt: new Date(Date.now() - 86400000 * 5 + 25000).toISOString(),
        durationMs: 25000,
        estimatedTokens: 1800,
        estimatedCost: 0.036,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 5 + 25000).toISOString()
      },
      {
        id: 'job-3',
        jobType: 'extract_insights', 
        sourceId: 'trans-2',
        status: 'processing' as const,
        progress: 65,
        resultCount: 0,
        errorMessage: null,
        startedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        completedAt: null,
        durationMs: null,
        estimatedTokens: 1600,
        estimatedCost: 0.032,
        createdAt: new Date(Date.now() - 300000).toISOString(),
        updatedAt: new Date(Date.now() - 60000).toISOString() // Updated 1 minute ago
      }
    ];
    
    await db.insert(processingJobs).values(jobData);
    
    // Seed analytics events
    console.log('📊 Seeding analytics events...');
    const analyticsData = [
      {
        id: 'event-1',
        eventType: 'insight_approved',
        entityType: 'insight',
        entityId: 'insight-1',
        eventData: JSON.stringify({ score: 32, approvedBy: 'user-1' }),
        value: 32.0,
        occurredAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 'event-2',
        eventType: 'post_generated',
        entityType: 'post',
        entityId: 'post-1',
        eventData: JSON.stringify({ platform: 'linkedin', characterCount: 847 }),
        value: 847.0,
        occurredAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
      },
      {
        id: 'event-3',
        eventType: 'post_scheduled',
        entityType: 'scheduled_post',
        entityId: 'sched-1',
        eventData: JSON.stringify({ platform: 'linkedin', scheduledTime: scheduledPostData[0].scheduledTime }),
        value: null,
        occurredAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];
    
    await db.insert(analyticsEvents).values(analyticsData);
    
    // Seed settings
    console.log('⚙️ Seeding settings...');
    const settingsData = [
      {
        key: 'ai_model',
        value: 'gemini-pro',
        category: 'ai',
        description: 'Default AI model for content processing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        key: 'max_insights_per_transcript',
        value: '5',
        category: 'processing',
        description: 'Maximum number of insights to extract from each transcript',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        key: 'default_posting_time',
        value: '09:00',
        category: 'scheduling',
        description: 'Default time of day for scheduling posts',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    await db.insert(settings).values(settingsData);
    
    console.log('✅ Database seeded successfully!');
    console.log('📈 Summary:');
    console.log(`  - ${transcriptData.length} transcripts`);
    console.log(`  - ${insightData.length} insights`);
    console.log(`  - ${postData.length} posts`);
    console.log(`  - ${scheduledPostData.length} scheduled posts`);
    console.log(`  - ${jobData.length} processing jobs`);
    console.log(`  - ${analyticsData.length} analytics events`);
    console.log(`  - ${settingsData.length} settings`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Initialize database and run seeding
initDatabase();
seedDatabase();