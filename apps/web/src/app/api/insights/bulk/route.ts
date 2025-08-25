import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase, 
  getDatabase, 
  insights as insightsTable
} from '@content-creation/database';
import { eq } from 'drizzle-orm';

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