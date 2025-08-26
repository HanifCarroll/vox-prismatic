import { getDatabase } from '../lib/db-connection';
import * as schema from '../lib/db-schema';
import { uuidv7 } from 'uuidv7';

/**
 * Seed script for initializing database with sample data
 * Matches the exact schema requirements from @content-creation/types/database
 */

async function seed() {
  console.log('🌱 Starting database seed...');
  
  const db = getDatabase();
  
  try {
    // Clear existing data (optional - comment out if you want to preserve data)
    console.log('🗑️  Clearing existing data...');
    await db.delete(schema.scheduledPosts);
    await db.delete(schema.posts);
    await db.delete(schema.insights);
    await db.delete(schema.transcripts);
    await db.delete(schema.processingJobs);
    await db.delete(schema.analyticsEvents);
    await db.delete(schema.settings);
    
    // Create sample transcripts
    console.log('📝 Creating sample transcripts...');
    const transcripts = [
      {
        id: uuidv7(),
        title: 'Building a Successful SaaS Product',
        rawContent: 'Today we are going to talk about building a successful SaaS product. The key is to focus on solving real problems for real users. Too many founders get caught up in building features that nobody asked for. Start by talking to your potential customers, understand their pain points, and build solutions that directly address those issues. Remember, a successful SaaS product is not about having the most features, it is about solving problems better than anyone else.',
        cleanedContent: 'Today we are going to talk about building a successful SaaS product. The key is to focus on solving real problems for real users. Too many founders get caught up in building features that nobody asked for. Start by talking to your potential customers, understand their pain points, and build solutions that directly address those issues. Remember, a successful SaaS product is not about having the most features, it is about solving problems better than anyone else.',
        status: 'cleaned' as const,
        sourceType: 'manual' as const,
        wordCount: 87,
        duration: 1800,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv7(),
        title: 'The Future of AI in Content Creation',
        rawContent: 'Artificial Intelligence is revolutionizing how we create and distribute content. But here is the thing that many people miss: AI will not replace content creators. Instead, content creators who use AI will replace those who do not. The key is to think of AI as a powerful tool in your toolkit, not as your replacement. Use it to augment your creativity, speed up your workflow, and explore ideas you might not have considered otherwise.',
        cleanedContent: 'Artificial Intelligence is revolutionizing how we create and distribute content. But here is the thing that many people miss: AI will not replace content creators. Instead, content creators who use AI will replace those who do not. The key is to think of AI as a powerful tool in your toolkit, not as your replacement. Use it to augment your creativity, speed up your workflow, and explore ideas you might not have considered otherwise.',
        status: 'cleaned' as const,
        sourceType: 'manual' as const,
        wordCount: 79,
        duration: 2400,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const insertedTranscripts = await db.insert(schema.transcripts).values(transcripts).returning();
    console.log(`✅ Inserted ${insertedTranscripts.length} transcripts`);
    
    // Create sample insights with all required fields
    console.log('💡 Creating sample insights...');
    const insights = [
      {
        id: uuidv7(),
        cleanedTranscriptId: insertedTranscripts[0].id,
        title: 'Focus on Real User Problems',
        summary: 'Successful SaaS products solve real user problems rather than building unnecessary features.',
        verbatimQuote: 'Too many founders get caught up in building features that nobody asked for.',
        category: 'Product Development',
        postType: 'Problem' as const,
        // Scoring fields (all required)
        urgencyScore: 8,
        relatabilityScore: 9,
        specificityScore: 7,
        authorityScore: 8,
        totalScore: 32,
        status: 'approved' as const,
        processingDurationMs: 1250,
        estimatedTokens: 450,
        estimatedCost: 0.0045,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv7(),
        cleanedTranscriptId: insertedTranscripts[1].id,
        title: 'AI Augments, Not Replaces',
        summary: 'Content creators using AI will outcompete those who don\'t adopt these tools.',
        verbatimQuote: 'AI will not replace content creators. Instead, content creators who use AI will replace those who do not.',
        category: 'Technology',
        postType: 'Contrarian Take' as const,
        // Scoring fields (all required)
        urgencyScore: 9,
        relatabilityScore: 8,
        specificityScore: 8,
        authorityScore: 7,
        totalScore: 32,
        status: 'approved' as const,
        processingDurationMs: 1100,
        estimatedTokens: 380,
        estimatedCost: 0.0038,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv7(),
        cleanedTranscriptId: insertedTranscripts[0].id,
        title: 'Customer Discovery First',
        summary: 'Start with customer interviews before building any features.',
        verbatimQuote: 'Start by talking to your potential customers, understand their pain points, and build solutions that directly address those issues.',
        category: 'Startups',
        postType: 'Framework' as const,
        urgencyScore: 7,
        relatabilityScore: 9,
        specificityScore: 8,
        authorityScore: 8,
        totalScore: 32,
        status: 'needs_review' as const,
        processingDurationMs: 980,
        estimatedTokens: 320,
        estimatedCost: 0.0032,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const insertedInsights = await db.insert(schema.insights).values(insights).returning();
    console.log(`✅ Inserted ${insertedInsights.length} insights`);
    
    // Create sample posts with all required fields
    console.log('📮 Creating sample posts...');
    const posts = [
      {
        id: uuidv7(),
        insightId: insertedInsights[0].id,
        title: 'The #1 SaaS Mistake',
        platform: 'linkedin' as const,
        content: '🚀 Building a successful SaaS product? Here\'s the #1 mistake I see founders make:\n\nBuilding features nobody asked for.\n\nI\'ve watched countless startups burn through runway adding "cool" features while ignoring actual user problems.\n\nHere\'s what works instead:\n\n1. Talk to potential customers BEFORE writing code\n2. Document their exact pain points\n3. Build the simplest solution that solves those problems\n4. Iterate based on real usage data\n\nRemember: Your users don\'t care about your feature list.\n\nThey care about their problems being solved.\n\nFocus on that, and everything else follows.\n\n#SaaS #ProductDevelopment #StartupLessons',
        status: 'approved' as const,
        characterCount: 542,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv7(),
        insightId: insertedInsights[1].id,
        title: 'The Truth About AI',
        platform: 'x' as const,
        content: '💡 Hot take: AI won\'t replace content creators.\n\nBut content creators using AI will absolutely replace those who don\'t.\n\nThink of AI as your creative co-pilot, not your replacement.\n\nThe winners? Those who embrace it as a tool.\n\nThe losers? Those who fear it as competition.\n\n#AI #ContentCreation #FutureOfWork',
        status: 'approved' as const,
        characterCount: 280,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv7(),
        insightId: insertedInsights[2].id,
        title: 'Customer Discovery Framework',
        platform: 'linkedin' as const,
        content: '📊 The Customer Discovery Framework that saved my startup:\n\nBefore: 6 months building features → 0 paying customers\n\nAfter: 2 weeks of interviews → Clear product roadmap → First customer in 30 days\n\nThe framework:\n\n1. Interview 20 potential customers\n2. Ask about problems, not solutions\n3. Look for patterns in their pain points\n4. Build ONLY what solves the top 3 issues\n5. Ship fast, iterate based on usage\n\nStop guessing what customers want.\nStart asking them.\n\n#CustomerDevelopment #LeanStartup #ProductStrategy',
        status: 'draft' as const,
        characterCount: 456,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const insertedPosts = await db.insert(schema.posts).values(posts).returning();
    console.log(`✅ Inserted ${insertedPosts.length} posts`);
    
    // Create sample scheduled posts
    console.log('📅 Creating sample scheduled posts...');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    
    const scheduledPosts = [
      {
        id: uuidv7(),
        postId: insertedPosts[0].id,
        platform: 'linkedin' as const,
        content: insertedPosts[0].content,
        scheduledTime: tomorrow.toISOString(),
        status: 'pending' as const,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv7(),
        postId: insertedPosts[1].id,
        platform: 'x' as const,
        content: insertedPosts[1].content,
        scheduledTime: dayAfter.toISOString(),
        status: 'pending' as const,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const insertedScheduledPosts = await db.insert(schema.scheduledPosts).values(scheduledPosts).returning();
    console.log(`✅ Inserted ${insertedScheduledPosts.length} scheduled posts`);
    
    // Create sample processing jobs
    console.log('⚙️  Creating sample processing jobs...');
    const jobs = [
      {
        id: uuidv7(),
        jobType: 'extract_insights' as const,
        sourceId: insertedTranscripts[0].id,
        status: 'completed' as const,
        progress: 100,
        resultCount: 2,
        startedAt: new Date(Date.now() - 5000).toISOString(),
        completedAt: new Date(Date.now() - 3000).toISOString(),
        durationMs: 2000,
        estimatedTokens: 1500,
        estimatedCost: 0.015,
        createdAt: new Date(Date.now() - 5000).toISOString(),
        updatedAt: new Date(Date.now() - 3000).toISOString()
      }
    ];
    
    const insertedJobs = await db.insert(schema.processingJobs).values(jobs).returning();
    console.log(`✅ Inserted ${insertedJobs.length} processing jobs`);
    
    // Create initial settings
    console.log('⚙️  Creating initial settings...');
    const settings = [
      {
        key: 'auto_publish',
        value: 'false',
        category: 'publishing',
        description: 'Automatically publish approved posts',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        key: 'default_platform',
        value: 'linkedin',
        category: 'publishing',
        description: 'Default platform for new posts',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        key: 'ai_model',
        value: 'gemini-1.5-flash',
        category: 'ai',
        description: 'AI model to use for content generation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        key: 'min_insight_score',
        value: '25',
        category: 'ai',
        description: 'Minimum score for an insight to be considered',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const insertedSettings = await db.insert(schema.settings).values(settings).returning();
    console.log(`✅ Inserted ${insertedSettings.length} settings`);
    
    // Create sample analytics events
    console.log('📊 Creating sample analytics events...');
    const events = [
      {
        id: uuidv7(),
        eventType: 'post_published',
        entityType: 'scheduled_post' as const,
        entityId: insertedScheduledPosts[0].id,
        eventData: JSON.stringify({ platform: 'linkedin', characterCount: 542 }),
        value: 1,
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];
    
    const insertedEvents = await db.insert(schema.analyticsEvents).values(events).returning();
    console.log(`✅ Inserted ${insertedEvents.length} analytics events`);
    
    console.log('\n🎉 Database seeded successfully!');
    console.log('📊 Summary:');
    console.log(`  - ${insertedTranscripts.length} transcripts`);
    console.log(`  - ${insertedInsights.length} insights`);
    console.log(`  - ${insertedPosts.length} posts`);
    console.log(`  - ${insertedScheduledPosts.length} scheduled posts`);
    console.log(`  - ${insertedJobs.length} processing jobs`);
    console.log(`  - ${insertedSettings.length} settings`);
    console.log(`  - ${insertedEvents.length} analytics events`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the seed function
seed();