import { PrismaClient } from '@prisma/client';

/**
 * Enhanced seed script for initializing PostgreSQL database with large dataset
 * Generates 100+ records for proper data table testing
 */

const prisma = new PrismaClient();

// Sample data generators
const transcriptTitles = [
  'Building a Successful SaaS Product',
  'The Future of AI in Content Creation',
  'Scaling Your Startup with Limited Resources',
  'The Psychology of User Experience Design',
  'Remote Work: Best Practices for 2024',
  'Crypto and Web3: What\'s Next?',
  'The Creator Economy Revolution',
  'Building Developer Tools That Don\'t Suck',
  'Product-Market Fit: A Complete Guide',
  'The Art of Technical Writing',
  'Designing for Accessibility',
  'Machine Learning for Non-Technical Founders',
  'The Future of No-Code Development',
  'Building High-Performance Teams',
  'Customer Research That Actually Matters',
  'The State of JavaScript in 2024',
  'Fundraising in a Down Market',
  'Building for Mobile-First Users',
  'The Power of Open Source',
  'Ethical AI Development'
];

const categories = [
  'Product Development', 'Technology', 'Business Strategy', 'Design',
  'Marketing', 'Leadership', 'Programming', 'Entrepreneurship',
  'User Experience', 'Data Science', 'Startup', 'Remote Work'
];

const postTypes = ['Problem', 'Proof', 'Framework', 'Contrarian Take', 'Mental Model'];
const platforms = ['linkedin', 'x'];
const statuses = ['needs_review', 'approved', 'rejected', 'scheduled', 'published'];

function generateRandomContent(type: 'transcript' | 'insight' | 'post', length: 'short' | 'medium' | 'long' = 'medium') {
  const transcriptContent = [
    'Today we are going to talk about building a successful product. The key is to focus on solving real problems for real users. Too many founders get caught up in building features that nobody asked for.',
    'Artificial Intelligence is revolutionizing how we create and distribute content. But here is the thing that many people miss: AI will not replace creators. Instead, creators who use AI will replace those who do not.',
    'When scaling a startup, resources are always limited. The secret is to prioritize ruthlessly and focus on what truly moves the needle for your business.',
    'User experience design is not just about making things look pretty. It\'s about understanding human psychology and creating interfaces that feel intuitive.',
    'Remote work has fundamentally changed how we collaborate. The companies that succeed will be those that embrace asynchronous communication and results-oriented work.'
  ];

  const insightContent = [
    'The biggest mistake founders make is building solutions before understanding the problem.',
    'AI tools are becoming commoditized, but human creativity and strategy remain irreplaceable.',
    'Successful startups focus on one thing and do it exceptionally well before expanding.',
    'Great UX design is invisible - users should never have to think about how to use your product.',
    'The future of work is not about where you work, but how you work.'
  ];

  const postContent = [
    '🚀 Building a successful product? Here\'s the #1 mistake I see founders make: Building features nobody asked for.',
    '💡 Hot take: AI won\'t replace content creators. But creators using AI will absolutely replace those who don\'t.',
    '📈 Scaling with limited resources? Focus on these 3 things: Product-market fit, customer retention, and team efficiency.',
    '🎨 Great UX design principle: If users have to think about how to use it, you\'ve already lost.',
    '🏠 Remote work success formula: Clear communication + Defined outcomes + Trust = High performance teams.'
  ];

  if (type === 'transcript') return transcriptContent[Math.floor(Math.random() * transcriptContent.length)];
  if (type === 'insight') return insightContent[Math.floor(Math.random() * insightContent.length)];
  return postContent[Math.floor(Math.random() * postContent.length)];
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(daysBack: number = 30): Date {
  const now = new Date();
  const randomDaysBack = Math.floor(Math.random() * daysBack);
  return new Date(now.getTime() - randomDaysBack * 24 * 60 * 60 * 1000);
}

async function seed() {
  console.log('🌱 Starting enhanced database seed with 100+ records...');
  
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
    
    // Create 120 sample transcripts
    console.log('📝 Creating 120 sample transcripts...');
    
    const transcripts = [];
    
    for (let i = 0; i < 120; i++) {
      const title = `${getRandomElement(transcriptTitles)} ${i > 19 ? `(Part ${Math.floor(i/20) + 1})` : ''}`;
      const content = generateRandomContent('transcript');
      const wordCount = content.split(' ').length;
      
      const transcript = await prisma.transcript.create({
        data: {
          title,
          rawContent: content,
          cleanedContent: content,
          status: getRandomElement(['cleaned', 'insights_generated', 'posts_created']),
          sourceType: getRandomElement(['recording', 'upload', 'manual', 'youtube', 'podcast']),
          wordCount,
          duration: Math.floor(Math.random() * 3600) + 600, // 10 minutes to 1 hour
        }
      });
      transcripts.push(transcript);
    }

    console.log('✅ Created 120 sample transcripts');
    
    // Create 150 sample insights
    console.log('💡 Creating 150 sample insights...');
    
    const insights = [];
    
    for (let i = 0; i < 150; i++) {
      const transcript = getRandomElement(transcripts);
      const urgencyScore = Math.floor(Math.random() * 10) + 1;
      const relatabilityScore = Math.floor(Math.random() * 10) + 1;
      const specificityScore = Math.floor(Math.random() * 10) + 1;
      const authorityScore = Math.floor(Math.random() * 10) + 1;
      
      const insight = await prisma.insight.create({
        data: {
          cleanedTranscriptId: transcript.id,
          title: `${getRandomElement(categories)} Insight ${i + 1}`,
          summary: generateRandomContent('insight'),
          verbatimQuote: `"${generateRandomContent('insight')}"`,
          category: getRandomElement(categories),
          postType: getRandomElement(postTypes),
          urgencyScore,
          relatabilityScore,
          specificityScore,
          authorityScore,
          totalScore: urgencyScore + relatabilityScore + specificityScore + authorityScore,
          status: getRandomElement(['draft', 'needs_review', 'approved', 'rejected']),
        }
      });
      insights.push(insight);
    }

    console.log('✅ Created 150 sample insights');
    
    // Create 200 sample posts
    console.log('📮 Creating 200 sample posts...');
    
    const posts = [];
    
    for (let i = 0; i < 200; i++) {
      const insight = getRandomElement(insights);
      const platform = getRandomElement(platforms);
      const content = generateRandomContent('post');
      const status = getRandomElement(statuses);
      
      const post = await prisma.post.create({
        data: {
          insightId: insight.id,
          title: `${platform === 'linkedin' ? 'LinkedIn' : 'X'} Post ${i + 1}`,
          platform,
          content,
          status,
          characterCount: content.length,
        }
      });
      posts.push(post);
    }

    console.log('✅ Created 200 sample posts');
    
    // Create 50 sample scheduled posts
    console.log('📅 Creating 50 sample scheduled posts...');
    
    const scheduledPosts = [];
    
    for (let i = 0; i < 50; i++) {
      const post = getRandomElement(posts.filter(p => p.status === 'scheduled' || p.status === 'approved'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days from now
      futureDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      
      const scheduledPost = await prisma.scheduledPost.create({
        data: {
          postId: post.id,
          platform: post.platform,
          content: post.content,
          scheduledTime: futureDate,
          status: getRandomElement(['pending', 'published', 'failed']),
          retryCount: Math.floor(Math.random() * 3),
        }
      });
      scheduledPosts.push(scheduledPost);
    }

    console.log('✅ Created 50 sample scheduled posts');
    
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
    
    console.log('\n🎉 Database seeded successfully with large dataset!');
    console.log('\n📊 Summary:');
    console.log('  - 120 Transcripts');
    console.log('  - 150 Insights'); 
    console.log('  - 200 Posts');
    console.log('  - 50 Scheduled Posts');
    console.log('  - 3 Settings');
    console.log('\n🚀 Ready for data table testing with 100+ records!');
    
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