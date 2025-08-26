import { PrismaClient } from '../src/database/prisma/generated';

/**
 * Seed script for initializing PostgreSQL database with sample data
 * Uses Prisma client with proper Date types for PostgreSQL
 */

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Clear existing data (optional - comment out if you want to preserve data)
    console.log('🗑️  Clearing existing data...');
    await prisma.scheduledPost.deleteMany();
    await prisma.post.deleteMany();
    await prisma.insight.deleteMany();
    await prisma.transcript.deleteMany();
    await prisma.processingJob.deleteMany();
    await prisma.analyticsEvent.deleteMany();
    await prisma.setting.deleteMany();
    
    // Create sample transcripts
    console.log('📝 Creating sample transcripts...');
    
    const transcript1 = await prisma.transcript.create({
      data: {
        title: 'Building a Successful SaaS Product',
        rawContent: 'Today we are going to talk about building a successful SaaS product. The key is to focus on solving real problems for real users. Too many founders get caught up in building features that nobody asked for. Start by talking to your potential customers, understand their pain points, and build solutions that directly address those issues. Remember, a successful SaaS product is not about having the most features, it is about solving problems better than anyone else.',
        cleanedContent: 'Today we are going to talk about building a successful SaaS product. The key is to focus on solving real problems for real users. Too many founders get caught up in building features that nobody asked for. Start by talking to your potential customers, understand their pain points, and build solutions that directly address those issues. Remember, a successful SaaS product is not about having the most features, it is about solving problems better than anyone else.',
        status: 'cleaned',
        sourceType: 'manual',
        wordCount: 87,
        duration: 1800,
      }
    });

    const transcript2 = await prisma.transcript.create({
      data: {
        title: 'The Future of AI in Content Creation',
        rawContent: 'Artificial Intelligence is revolutionizing how we create and distribute content. But here is the thing that many people miss: AI will not replace content creators. Instead, content creators who use AI will replace those who do not. The key is to think of AI as a powerful tool in your toolkit, not as your replacement. Use it to augment your creativity, speed up your workflow, and explore ideas you might not have considered otherwise.',
        cleanedContent: 'Artificial Intelligence is revolutionizing how we create and distribute content. But here is the thing that many people miss: AI will not replace content creators. Instead, content creators who use AI will replace those who do not. The key is to think of AI as a powerful tool in your toolkit, not as your replacement. Use it to augment your creativity, speed up your workflow, and explore ideas you might not have considered otherwise.',
        status: 'cleaned',
        sourceType: 'manual',
        wordCount: 79,
        duration: 2400,
      }
    });

    console.log('✅ Created 2 sample transcripts');
    
    // Create sample insights
    console.log('💡 Creating sample insights...');
    
    const insight1 = await prisma.insight.create({
      data: {
        cleanedTranscriptId: transcript1.id,
        title: 'Focus on Real Problems',
        summary: 'The key to building a successful SaaS product is solving real problems for real users, not building features nobody asked for.',
        verbatimQuote: 'Too many founders get caught up in building features that nobody asked for',
        category: 'Product Development',
        postType: 'insight',
        urgencyScore: 7,
        relatabilityScore: 9,
        specificityScore: 8,
        authorityScore: 8,
        totalScore: 32,
        status: 'approved',
      }
    });

    const insight2 = await prisma.insight.create({
      data: {
        cleanedTranscriptId: transcript2.id,
        title: 'AI Augments, Not Replaces',
        summary: 'AI will not replace content creators, but content creators using AI will replace those who do not.',
        verbatimQuote: 'AI will not replace content creators. Instead, content creators who use AI will replace those who do not',
        category: 'Technology',
        postType: 'quote',
        urgencyScore: 9,
        relatabilityScore: 8,
        specificityScore: 7,
        authorityScore: 9,
        totalScore: 33,
        status: 'approved',
      }
    });

    console.log('✅ Created 2 sample insights');
    
    // Create sample posts
    console.log('📮 Creating sample posts...');
    
    const post1 = await prisma.post.create({
      data: {
        insightId: insight1.id,
        title: 'The #1 SaaS Mistake',
        platform: 'linkedin',
        content: `🚀 Building a successful SaaS product? Here's the #1 mistake I see founders make:

Building features nobody asked for.

I've watched countless startups burn through runway adding "cool" features while ignoring actual user problems.

Here's what works instead:

1. Talk to potential customers BEFORE writing code
2. Document their exact pain points
3. Build the simplest solution that solves those problems
4. Iterate based on real usage data

Remember: Your users don't care about your feature list.

They care about their problems being solved.

Focus on that, and everything else follows.

#SaaS #ProductDevelopment #StartupLessons`,
        status: 'approved',
        characterCount: 617,
      }
    });

    const post2 = await prisma.post.create({
      data: {
        insightId: insight2.id,
        title: 'The Truth About AI',
        platform: 'x',
        content: `💡 Hot take: AI won't replace content creators.

But content creators using AI will absolutely replace those who don't.

Think of AI as your creative co-pilot, not your replacement.

The winners? Those who embrace it as a tool.

The losers? Those who fear it as competition.

#AI #ContentCreation #FutureOfWork`,
        status: 'approved',
        characterCount: 280,
      }
    });

    console.log('✅ Created 2 sample posts');
    
    // Create a sample scheduled post
    console.log('📅 Creating sample scheduled post...');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Schedule for 7 days from now
    
    await prisma.scheduledPost.create({
      data: {
        postId: post1.id,
        platform: 'linkedin',
        content: post1.content,
        scheduledTime: futureDate,
        status: 'pending',
        retryCount: 0,
      }
    });

    console.log('✅ Created 1 sample scheduled post');
    
    // Create sample settings
    console.log('⚙️  Creating sample settings...');
    
    await prisma.setting.createMany({
      data: [
        {
          key: 'default_platform',
          value: 'linkedin',
          description: 'Default platform for new posts'
        },
        {
          key: 'ai_model',
          value: 'gemini-1.5-flash-latest',
          description: 'AI model to use for content generation'
        },
        {
          key: 'max_retries',
          value: '3',
          description: 'Maximum number of retry attempts for failed posts'
        },
      ]
    });

    console.log('✅ Created 3 sample settings');
    
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 2 Transcripts');
    console.log('  - 2 Insights');
    console.log('  - 2 Posts');
    console.log('  - 1 Scheduled Post');
    console.log('  - 3 Settings');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });