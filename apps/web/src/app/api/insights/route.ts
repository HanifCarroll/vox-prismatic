import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase,
  InsightRepository,
  type InsightFilter
} from '@content-creation/database';

// GET /api/insights - Get insights with filtering
export async function GET(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const insightRepo = new InsightRepository();
    
    const { searchParams } = new URL(request.url);
    
    // Build filters from query parameters
    const filters: InsightFilter = {};
    
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      filters.status = status as InsightFilter['status'];
    }
    
    const postType = searchParams.get('postType');
    if (postType) {
      filters.postType = postType as InsightFilter['postType'];
    }
    
    const category = searchParams.get('category');
    if (category) {
      filters.category = category;
    }
    
    const minScore = searchParams.get('minScore');
    if (minScore) {
      filters.minScore = parseInt(minScore);
    }
    
    const maxScore = searchParams.get('maxScore');
    if (maxScore) {
      filters.maxScore = parseInt(maxScore);
    }
    
    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }
    
    const sortBy = searchParams.get('sortBy');
    if (sortBy) {
      filters.sortBy = sortBy;
    }
    
    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder) {
      filters.sortOrder = sortOrder as 'asc' | 'desc';
    }
    
    // Fetch insights using repository with all filtering and JOINs handled
    const result = await insightRepo.findWithTranscripts(filters);
    
    if (!result.success) {
      throw result.error;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data.map(insight => ({
        ...insight,
        createdAt: insight.createdAt.toISOString(),
        updatedAt: insight.updatedAt.toISOString()
      })),
      total: result.data.length
    });
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

// PATCH /api/insights/[id] - Update an insight
export async function PATCH(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const insightRepo = new InsightRepository();
    
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Insight ID is required' },
        { status: 400 }
      );
    }
    
    // Update insight using repository
    const result = await insightRepo.update(id, {
      title: body.title,
      summary: body.summary,
      category: body.category,
      status: body.status
    });
    
    if (!result.success) {
      if (result.error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Insight not found' },
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
    console.error('Failed to update insight:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update insight' },
      { status: 500 }
    );
  }
}

