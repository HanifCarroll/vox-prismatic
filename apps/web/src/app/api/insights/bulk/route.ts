import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase,
  InsightRepository
} from '@content-creation/database';

// POST /api/insights/bulk - Bulk operations
export async function POST(request: NextRequest) {
  try {
    // Initialize database connection
    initDatabase();
    const insightRepo = new InsightRepository();
    
    const body = await request.json();
    const { action, insightIds } = body;
    
    if (!action || !insightIds || !Array.isArray(insightIds)) {
      return NextResponse.json(
        { success: false, error: 'Action and insight IDs are required' },
        { status: 400 }
      );
    }
    
    // Map action to status
    let status: string;
    switch (action) {
      case 'approve':
        status = 'approved';
        break;
      case 'reject':
        status = 'rejected';
        break;
      case 'archive':
        status = 'archived';
        break;
      case 'needs_review':
        status = 'needs_review';
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // Perform bulk update using repository
    const result = await insightRepo.bulkUpdateStatus(
      insightIds, 
      status as any
    );
    
    if (!result.success) {
      throw result.error;
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