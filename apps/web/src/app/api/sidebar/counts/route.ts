import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase,
  InsightRepository,
  PostRepository
} from '@content-creation/database';

// GET /api/sidebar/counts - Get counts for sidebar badges
export async function GET(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const insightRepo = new InsightRepository();
    const postRepo = new PostRepository();
    
    // Get statistics from repositories
    const [insightStats, postStats] = await Promise.all([
      insightRepo.getStats(),
      postRepo.getStats()
    ]);

    // Extract counts for items needing review
    const insightsNeedingReview = insightStats.success ? 
      (insightStats.data.byStatus['needs_review'] || 0) : 0;
    
    const postsNeedingReview = postStats.success ? 
      (postStats.data.byStatus['needs_review'] || 0) : 0;
    
    return NextResponse.json({ 
      success: true, 
      data: {
        insights: insightsNeedingReview,
        posts: postsNeedingReview
      }
    });
  } catch (error) {
    console.error('Failed to fetch sidebar counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sidebar counts' },
      { status: 500 }
    );
  }
}