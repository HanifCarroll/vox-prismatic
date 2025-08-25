import { NextRequest, NextResponse } from 'next/server';
import type { TranscriptView } from '@content-creation/database';
import { 
  initDatabase, 
  getDatabase, 
  transcripts as transcriptsTable,
  type Transcript
} from '@content-creation/database';
import { eq, like, or, desc } from 'drizzle-orm';

// Helper function to convert database transcript to TranscriptView
function convertToTranscriptView(transcript: Transcript): TranscriptView {
  return {
    id: transcript.id,
    title: transcript.title,
    status: transcript.status as TranscriptView['status'],
    sourceType: transcript.sourceType as TranscriptView['sourceType'] || 'upload',
    rawContent: transcript.rawContent || transcript.cleanedContent || '',
    wordCount: transcript.wordCount || 0,
    duration: transcript.duration || undefined,
    createdAt: new Date(transcript.createdAt),
    updatedAt: new Date(transcript.updatedAt)
  };
}

// GET /api/transcripts - Get all transcripts
export async function GET(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Fetch all transcripts - simple approach
    const dbTranscripts = await db
      .select()
      .from(transcriptsTable)
      .orderBy(desc(transcriptsTable.createdAt));
    
    // Convert to TranscriptView format
    let transcriptViews = dbTranscripts.map(convertToTranscriptView);
    
    // Apply filters in memory - simple and reliable
    if (status && status !== 'all') {
      if (status === 'processing') {
        transcriptViews = transcriptViews.filter(t => t.status === 'processing');
      } else if (status === 'completed') {
        transcriptViews = transcriptViews.filter(t => 
          t.status === 'cleaned' || 
          t.status === 'insights_generated' || 
          t.status === 'posts_created'
        );
      } else {
        transcriptViews = transcriptViews.filter(t => t.status === status);
      }
    }
    
    // Apply search filter
    if (search) {
      const searchQuery = search.toLowerCase();
      transcriptViews = transcriptViews.filter(transcript =>
        transcript.title.toLowerCase().includes(searchQuery) ||
        transcript.rawContent.toLowerCase().includes(searchQuery)
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: transcriptViews.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Failed to fetch transcripts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}

// POST /api/transcripts - Create a new transcript
export async function POST(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    const body = await request.json();
    
    // Basic validation
    if (!body.title || !body.rawContent) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    // Create new transcript record
    const now = new Date().toISOString();
    const newTranscriptData = {
      id: `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: body.title,
      rawContent: body.rawContent,
      status: 'raw' as const,
      sourceType: body.sourceType || 'manual',
      duration: body.duration || null,
      fileName: body.fileName || null,
      wordCount: body.rawContent.split(' ').filter((word: string) => word.length > 0).length,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      createdAt: now,
      updatedAt: now
    };
    
    // Insert into database
    await db.insert(transcriptsTable).values(newTranscriptData);
    
    // Convert to TranscriptView format for response
    const responseTranscript: TranscriptView = {
      id: newTranscriptData.id,
      title: newTranscriptData.title,
      status: newTranscriptData.status,
      sourceType: newTranscriptData.sourceType as TranscriptView['sourceType'],
      sourceUrl: body.sourceUrl,
      fileName: body.fileName,
      rawContent: newTranscriptData.rawContent,
      wordCount: newTranscriptData.wordCount,
      duration: newTranscriptData.duration || undefined,
      createdAt: new Date(newTranscriptData.createdAt),
      updatedAt: new Date(newTranscriptData.updatedAt)
    };
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...responseTranscript,
        createdAt: responseTranscript.createdAt.toISOString(),
        updatedAt: responseTranscript.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to create transcript:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transcript' },
      { status: 500 }
    );
  }
}

// PATCH /api/transcripts/[id] - Update a transcript (including title)
export async function PATCH(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transcript ID is required' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    // Allow updating both status and title
    if (body.status !== undefined) updateData.status = body.status;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.rawContent !== undefined) {
      updateData.rawContent = body.rawContent;
      updateData.wordCount = body.rawContent.split(' ').filter((word: string) => word.length > 0).length;
    }
    
    // Update the transcript
    await db
      .update(transcriptsTable)
      .set(updateData)
      .where(eq(transcriptsTable.id, id));
    
    // Fetch the updated transcript
    const updatedTranscript = await db
      .select()
      .from(transcriptsTable)
      .where(eq(transcriptsTable.id, id))
      .limit(1);
    
    if (updatedTranscript.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Transcript not found' },
        { status: 404 }
      );
    }
    
    const transcriptView = convertToTranscriptView(updatedTranscript[0]);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...transcriptView,
        createdAt: transcriptView.createdAt.toISOString(),
        updatedAt: transcriptView.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to update transcript:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transcript' },
      { status: 500 }
    );
  }
}