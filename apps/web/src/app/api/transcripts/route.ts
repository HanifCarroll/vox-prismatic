import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase,
  TranscriptRepository,
  type TranscriptFilter
} from '@content-creation/database';

// GET /api/transcripts - Get all transcripts
export async function GET(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const transcriptRepo = new TranscriptRepository();
    
    const { searchParams } = new URL(request.url);
    
    // Build filters from query parameters
    const filters: TranscriptFilter = {};
    
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      filters.status = status as TranscriptFilter['status'];
    }
    
    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }
    
    // Fetch transcripts using repository
    const result = await transcriptRepo.findAll(filters);
    
    if (!result.success) {
      throw result.error;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data.map(t => ({
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
    const transcriptRepo = new TranscriptRepository();
    
    const body = await request.json();
    
    // Basic validation
    if (!body.title || !body.rawContent) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    // Create new transcript using repository
    const result = await transcriptRepo.create({
      title: body.title,
      rawContent: body.rawContent,
      sourceType: body.sourceType || 'manual',
      sourceUrl: body.sourceUrl,
      fileName: body.fileName,
      duration: body.duration
    });
    
    if (!result.success) {
      throw result.error;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...result.data,
        createdAt: result.data.createdAt.toISOString(),
        updatedAt: result.data.updatedAt.toISOString()
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
    const transcriptRepo = new TranscriptRepository();
    
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transcript ID is required' },
        { status: 400 }
      );
    }
    
    // Update transcript using repository
    const result = await transcriptRepo.update(id, {
      status: body.status,
      title: body.title,
      rawContent: body.rawContent
    });
    
    if (!result.success) {
      if (result.error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Transcript not found' },
          { status: 404 }
        );
      }
      throw result.error;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...result.data,
        createdAt: result.data.createdAt.toISOString(),
        updatedAt: result.data.updatedAt.toISOString()
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