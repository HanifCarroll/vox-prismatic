import {
  initDatabase,
  createTranscript,
  createScheduledPost,
} from '@content-creation/database';

/**
 * Seed the database with sample data for development
 */
export function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');
    
    initDatabase();
    
    // Create sample transcripts
    const sampleTranscripts = [
      {
        title: 'The Future of AI in Software Development',
        rawContent: 'In this transcript, we explore how artificial intelligence is revolutionizing the way we write, test, and deploy software. From automated code generation to intelligent debugging, AI is becoming an indispensable tool for developers worldwide.',
        sourceType: 'upload' as const,
        duration: 1800
      },
      {
        title: 'Building Scalable React Applications',
        rawContent: 'This recording covers best practices for building large-scale React applications, including state management, component architecture, and performance optimization techniques.',
        sourceType: 'recording' as const,
        duration: 2400
      },
      {
        title: 'Remote Work Productivity Strategies',
        rawContent: 'An in-depth analysis of productivity techniques for remote teams, covering communication tools, time management, and maintaining work-life balance in a distributed work environment.',
        sourceType: 'manual' as const
      }
    ];
    
    // Insert sample transcripts
    sampleTranscripts.forEach((transcript, index) => {
      const result = createTranscript(transcript);
      if (result.success) {
        console.log(`📝 Created transcript ${index + 1}: "${transcript.title}"`);
      }
    });
    
    // Create sample scheduled posts
    const sampleScheduledPosts = [
      {
        platform: 'linkedin' as const,
        content: 'Just published a new article about AI in software development! The future is looking incredibly exciting. What are your thoughts on AI-powered coding tools? #AI #SoftwareDevelopment #Tech',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      },
      {
        platform: 'linkedin' as const,
        content: 'Building scalable React applications requires careful planning and architecture. Here are 5 key principles I\'ve learned from working with large-scale applications: 1. Component composition over inheritance...',
        scheduledTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours from now
      },
      {
        platform: 'linkedin' as const,
        content: 'Remote work doesn\'t have to mean reduced productivity. With the right strategies and tools, distributed teams can be even more effective than co-located ones. What\'s your experience?',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      }
    ];
    
    // Insert sample scheduled posts
    sampleScheduledPosts.forEach((post, index) => {
      const result = createScheduledPost(post);
      if (result.success) {
        console.log(`📅 Created scheduled post ${index + 1} for ${post.platform}`);
      }
    });
    
    console.log('✅ Database seeding completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    return false;
  }
}