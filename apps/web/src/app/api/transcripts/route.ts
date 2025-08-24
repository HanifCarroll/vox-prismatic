import { NextRequest, NextResponse } from 'next/server';
import { TranscriptView } from '@content-creation/shared';

// Mock data - replace with actual database calls
const mockTranscripts: TranscriptView[] = [
  {
    id: '1',
    title: 'The Future of AI in Software Development',
    status: 'raw',
    sourceType: 'upload',
    sourceUrl: 'https://youtube.com/watch?v=example',
    rawContent: 'This is a sample transcript about AI in software development...',
    wordCount: 2500,
    duration: 1800,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    metadata: {
      author: 'Tech Conference',
      publishedAt: new Date('2024-01-10'),
      tags: ['AI', 'Software Development', 'Future'],
      description: 'A deep dive into how AI is transforming software development'
    }
  },
  {
    id: '2',
    title: 'Building Scalable React Applications',
    status: 'cleaned',
    sourceType: 'recording',
    sourceUrl: 'https://podcast.example.com/episode-42',
    rawContent: 'Original transcript content...',
    cleanedContent: 'Cleaned and formatted transcript content...',
    wordCount: 3200,
    duration: 2400,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-14'),
    metadata: {
      author: 'React Weekly Podcast',
      tags: ['React', 'Scalability', 'Performance'],
      description: 'Best practices for building large-scale React applications'
    }
  },
  {
    id: '3',
    title: 'Remote Work Productivity Strategies',
    status: 'insights_generated',
    sourceType: 'manual',
    rawContent: 'Article content about remote work...',
    cleanedContent: 'Processed article content...',
    wordCount: 1800,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-13'),
    metadata: {
      author: 'Productivity Blog',
      tags: ['Remote Work', 'Productivity', 'Management'],
      description: 'Proven strategies for maintaining productivity while working remotely'
    }
  },
  {
    id: '4',
    title: 'Database Design Patterns',
    status: 'processing',
    sourceType: 'upload',
    fileName: 'database-webinar.txt',
    rawContent: 'Webinar transcript about database patterns...',
    cleanedContent: 'Cleaned webinar content...',
    wordCount: 4100,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-11'),
    metadata: {
      author: 'Database Academy',
      tags: ['Database', 'Architecture', 'Patterns'],
      description: 'Advanced database design patterns for modern applications'
    }
  }
];

// GET /api/transcripts - Get all transcripts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let filtered = mockTranscripts;
    
    // Filter by status
    if (status && status !== 'all') {
      if (status === 'processing') {
        filtered = filtered.filter(t => t.status === 'processing');
      } else if (status === 'completed') {
        filtered = filtered.filter(t => ['insights_generated', 'posts_created'].includes(t.status));
      } else {
        filtered = filtered.filter(t => t.status === status);
      }
    }
    
    // Filter by search
    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(transcript =>
        transcript.title.toLowerCase().includes(query) ||
        transcript.metadata?.author?.toLowerCase().includes(query) ||
        transcript.metadata?.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: filtered.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        metadata: t.metadata ? {
          ...t.metadata,
          publishedAt: t.metadata.publishedAt?.toISOString()
        } : undefined
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}

// POST /api/transcripts - Create a new transcript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.title || !body.rawContent) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    const newTranscript: TranscriptView = {
      id: Date.now().toString(),
      title: body.title,
      status: 'raw',
      sourceType: body.sourceType || 'manual',
      sourceUrl: body.sourceUrl,
      fileName: body.fileName,
      rawContent: body.rawContent,
      wordCount: body.rawContent.split(' ').length,
      duration: body.duration,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: body.metadata
    };
    
    // In a real app, save to database here
    mockTranscripts.push(newTranscript);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...newTranscript,
        createdAt: newTranscript.createdAt.toISOString(),
        updatedAt: newTranscript.updatedAt.toISOString(),
        metadata: newTranscript.metadata ? {
          ...newTranscript.metadata,
          publishedAt: newTranscript.metadata.publishedAt?.toISOString()
        } : undefined
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create transcript' },
      { status: 500 }
    );
  }
}