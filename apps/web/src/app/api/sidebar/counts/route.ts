import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase, 
  getDatabase, 
  insights as insightsTable,
  posts as postsTable
} from '@content-creation/database';
import { eq, count } from 'drizzle-orm';

// GET /api/sidebar/counts - Get counts for sidebar badges
export async function GET(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    // Get insights counts
    const insightsNeedingReview = await db
      .select({ count: count() })
      .from(insightsTable)
      .where(eq(insightsTable.status, 'needs_review'));
    
    // Get posts counts (assuming posts have similar status fields)
    const postsNeedingReview = await db
      .select({ count: count() })
      .from(postsTable)
      .where(eq(postsTable.status, 'needs_review'));
    
    return NextResponse.json({ 
      success: true, 
      data: {
        insights: insightsNeedingReview[0]?.count || 0,
        posts: postsNeedingReview[0]?.count || 0
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