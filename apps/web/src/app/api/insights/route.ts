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
function convertToInsightView(insight: Insight & { transcriptTitle?: string | null }) {
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
    estimatedCost: insight.estimatedCost || undefined,
    createdAt: insight.createdAt ? new Date(insight.createdAt) : new Date(),
    updatedAt: insight.updatedAt ? new Date(insight.updatedAt) : new Date(),
    transcriptTitle: insight.transcriptTitle || undefined
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
    
    // Fetch all insights with joins - simple approach
    const dbInsights = await db
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
        estimatedCost: insightsTable.estimatedCost,
        createdAt: insightsTable.createdAt,
        updatedAt: insightsTable.updatedAt,
        transcriptTitle: transcriptsTable.title
      })
      .from(insightsTable)
      .leftJoin(transcriptsTable, eq(insightsTable.cleanedTranscriptId, transcriptsTable.id))
      .orderBy(desc(insightsTable.createdAt));
    
    // Convert to view format
    let insightViews = dbInsights.map(convertToInsightView);
    
    // Apply filters in memory - simple and reliable
    if (status && status !== 'all') {
      if (status === 'needs_review') {
        insightViews = insightViews.filter(insight => insight.status === 'needs_review');
      } else if (status === 'completed') {
        insightViews = insightViews.filter(insight => 
          insight.status === 'approved' || insight.status === 'archived'
        );
      } else {
        insightViews = insightViews.filter(insight => insight.status === status);
      }
    }
    
    if (postType) {
      insightViews = insightViews.filter(insight => insight.postType === postType);
    }
    
    if (category) {
      insightViews = insightViews.filter(insight => insight.category === category);
    }
    
    if (minScore) {
      insightViews = insightViews.filter(insight => insight.scores.total >= parseInt(minScore));
    }
    
    if (maxScore) {
      insightViews = insightViews.filter(insight => insight.scores.total <= parseInt(maxScore));
    }
    
    // Apply sorting
    if (sortBy && sortBy !== 'createdAt') {
      insightViews.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (sortBy) {
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'totalScore':
            aVal = a.scores.total;
            bVal = b.scores.total;
            break;
          default:
            aVal = a.createdAt;
            bVal = b.createdAt;
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }
    
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

