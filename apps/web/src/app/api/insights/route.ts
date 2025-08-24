import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase, 
  getDatabase, 
  insights as insightsTable,
  transcripts as transcriptsTable,
  type Insight
} from '@content-creation/database';
import { eq, like, or, desc, asc, and, gte, lte, sql } from 'drizzle-orm';

// Helper function to convert database insight to view format
function convertToInsightView(insight: Insight & { transcriptTitle?: string }) {
  let metadata;
  try {
    metadata = insight.metadata && typeof insight.metadata === 'string'
      ? JSON.parse(insight.metadata)
      : insight.metadata || undefined;
  } catch (error) {
    console.warn('Failed to parse insight metadata:', error);
    metadata = undefined;
  }
  
  // Ensure all required fields have safe defaults
  return {
    id: insight.id || '',
    cleanedTranscriptId: insight.cleanedTranscriptId || '',
    title: insight.title || 'Untitled Insight',
    summary: insight.summary || '',
    verbatimQuote: insight.verbatimQuote || '',
    category: insight.category || 'Uncategorized',
    postType: insight.postType || 'Problem',
    scores: {
      urgency: insight.urgencyScore || 0,
      relatability: insight.relatabilityScore || 0,
      specificity: insight.specificityScore || 0,
      authority: insight.authorityScore || 0,
      total: insight.totalScore || 0
    },
    status: insight.status || 'draft',
    processingDurationMs: insight.processingDurationMs || undefined,
    estimatedTokens: insight.estimatedTokens || undefined,
    createdAt: insight.createdAt ? new Date(insight.createdAt) : new Date(),
    updatedAt: insight.updatedAt ? new Date(insight.updatedAt) : new Date(),
    transcriptTitle: insight.transcriptTitle || undefined,
    metadata
  };
}

// GET /api/insights - Get insights with filtering
export async function GET(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const postType = searchParams.get('postType');
    const category = searchParams.get('category');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'totalScore';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build the base query with transcript join
    let query = db
      .select({
        id: insightsTable.id,
        cleanedTranscriptId: insightsTable.cleanedTranscriptId,
        title: insightsTable.title,
        summary: insightsTable.summary,
        verbatimQuote: insightsTable.verbatimQuote,
        category: insightsTable.category,
        postType: insightsTable.postType,
        urgencyScore: insightsTable.urgencyScore,
        relatabilityScore: insightsTable.relatabilityScore,
        specificityScore: insightsTable.specificityScore,
        authorityScore: insightsTable.authorityScore,
        totalScore: insightsTable.totalScore,
        status: insightsTable.status,
        processingDurationMs: insightsTable.processingDurationMs,
        estimatedTokens: insightsTable.estimatedTokens,
        metadata: insightsTable.metadata,
        createdAt: insightsTable.createdAt,
        updatedAt: insightsTable.updatedAt,
        transcriptTitle: transcriptsTable.title
      })
      .from(insightsTable)
      .leftJoin(transcriptsTable, eq(insightsTable.cleanedTranscriptId, transcriptsTable.id));
    
    // Apply filters
    const conditions = [];
    
    if (status && status !== 'all') {
      if (status === 'needs_review') {
        conditions.push(eq(insightsTable.status, 'needs_review'));
      } else if (status === 'completed') {
        conditions.push(or(
          eq(insightsTable.status, 'approved'),
          eq(insightsTable.status, 'archived')
        ));
      } else {
        conditions.push(eq(insightsTable.status, status as any));
      }
    }
    
    if (postType) {
      conditions.push(eq(insightsTable.postType, postType as any));
    }
    
    if (category) {
      conditions.push(eq(insightsTable.category, category));
    }
    
    if (minScore) {
      conditions.push(gte(insightsTable.totalScore, parseInt(minScore)));
    }
    
    if (maxScore) {
      conditions.push(lte(insightsTable.totalScore, parseInt(maxScore)));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply sorting
    const sortColumn = sortBy === 'createdAt' ? insightsTable.createdAt :
                      sortBy === 'title' ? insightsTable.title :
                      insightsTable.totalScore;
    
    query = sortOrder === 'asc' ? 
      query.orderBy(asc(sortColumn)) : 
      query.orderBy(desc(sortColumn));
    
    // Execute the query
    const dbInsights = await query;
    
    // Convert to view format
    let insightViews = dbInsights.map(convertToInsightView);
    
    // Apply search filter (done in memory for now)
    if (search) {
      const searchQuery = search.toLowerCase();
      insightViews = insightViews.filter(insight =>
        insight.title.toLowerCase().includes(searchQuery) ||
        insight.summary.toLowerCase().includes(searchQuery) ||
        insight.verbatimQuote.toLowerCase().includes(searchQuery) ||
        insight.category.toLowerCase().includes(searchQuery) ||
        insight.transcriptTitle?.toLowerCase().includes(searchQuery)
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: insightViews.map(insight => ({
        ...insight,
        createdAt: insight.createdAt.toISOString(),
        updatedAt: insight.updatedAt.toISOString()
      })),
      total: insightViews.length
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
    const db = getDatabase();
    
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Insight ID is required' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.summary !== undefined) updateData.summary = body.summary;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.metadata !== undefined) updateData.metadata = JSON.stringify(body.metadata);
    
    // Update the insight
    await db
      .update(insightsTable)
      .set(updateData)
      .where(eq(insightsTable.id, id));
    
    // Fetch the updated insight
    const updatedInsight = await db
      .select()
      .from(insightsTable)
      .where(eq(insightsTable.id, id))
      .limit(1);
    
    if (updatedInsight.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insight not found' },
        { status: 404 }
      );
    }
    
    const insightView = convertToInsightView(updatedInsight[0]);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...insightView,
        createdAt: insightView.createdAt.toISOString(),
        updatedAt: insightView.updatedAt.toISOString()
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

// POST /api/insights/bulk - Bulk operations
export async function POST(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    const body = await request.json();
    const { action, insightIds } = body;
    
    if (!action || !insightIds || !Array.isArray(insightIds)) {
      return NextResponse.json(
        { success: false, error: 'Action and insight IDs are required' },
        { status: 400 }
      );
    }
    
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        break;
      case 'reject':
        updateData.status = 'rejected';
        break;
      case 'archive':
        updateData.status = 'archived';
        break;
      case 'needs_review':
        updateData.status = 'needs_review';
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // Update all specified insights
    for (const id of insightIds) {
      await db
        .update(insightsTable)
        .set(updateData)
        .where(eq(insightsTable.id, id));
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully ${action}ed ${insightIds.length} insights`,
      updatedCount: insightIds.length
    });
  } catch (error) {
    console.error('Failed to perform bulk operation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}