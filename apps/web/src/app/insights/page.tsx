import { 
  initDatabase, 
  getDatabase, 
  insights as insightsTable,
  transcripts as transcriptsTable
} from '@content-creation/database';
import { desc, eq } from 'drizzle-orm';
import InsightsClient from './InsightsClient';
import { InsightView } from './components/InsightCard';

// Helper function to convert database insight to view format
function convertToInsightView(insight: any): InsightView {
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

// Server-side data fetching function
async function getInsights(): Promise<InsightView[]> {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    // Fetch all insights with transcript titles, ordered by total score desc, then by creation date
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
        metadata: insightsTable.metadata,
        createdAt: insightsTable.createdAt,
        updatedAt: insightsTable.updatedAt,
        transcriptTitle: transcriptsTable.title
      })
      .from(insightsTable)
      .leftJoin(transcriptsTable, eq(insightsTable.cleanedTranscriptId, transcriptsTable.id))
      .orderBy(desc(insightsTable.totalScore), desc(insightsTable.createdAt));
    
    // Convert to InsightView format
    console.log('Raw insights from DB:', dbInsights.length);
    if (dbInsights.length > 0) {
      console.log('Sample insight:', JSON.stringify(dbInsights[0], null, 2));
    }
    return dbInsights.map(convertToInsightView);
  } catch (error) {
    console.error('Failed to fetch insights on server:', error);
    return [];
  }
}

// Server Component - fetches data and renders the page
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Fetch insights on the server
  const insights = await getInsights();
  
  // Await searchParams and get initial filter
  const params = await searchParams;
  const filter = params.filter;
  const initialFilter = (typeof filter === 'string' && ['all', 'needs_review', 'approved', 'rejected', 'archived'].includes(filter)) 
    ? filter 
    : 'needs_review';

  return <InsightsClient initialInsights={insights} initialFilter={initialFilter} />;
}