import { Hono } from 'hono';
import { 
  InsightRepository,
  type InsightFilter
} from '../database/index.ts';

const insights = new Hono();

// Initialize repository
const insightRepo = new InsightRepository();

// GET /insights - List insights with filtering
insights.get('/', async (c) => {
  try {
    // Build filters from query parameters
    const filters: InsightFilter = {};
    
    const status = c.req.query('status');
    if (status && status !== 'all') {
      filters.status = status as InsightFilter['status'];
    }
    
    const postType = c.req.query('postType');
    if (postType) {
      filters.postType = postType as InsightFilter['postType'];
    }
    
    const category = c.req.query('category');
    if (category) {
      filters.category = category;
    }
    
    const minScore = c.req.query('minScore');
    if (minScore) {
      filters.minScore = parseInt(minScore);
    }
    
    const maxScore = c.req.query('maxScore');
    if (maxScore) {
      filters.maxScore = parseInt(maxScore);
    }
    
    const search = c.req.query('search');
    if (search) {
      filters.search = search;
    }
    
    const sortBy = c.req.query('sortBy');
    if (sortBy) {
      filters.sortBy = sortBy;
    }
    
    const sortOrder = c.req.query('sortOrder');
    if (sortOrder) {
      filters.sortOrder = sortOrder as 'asc' | 'desc';
    }
    
    // Fetch insights using repository with all filtering and JOINs handled
    const result = await insightRepo.findWithTranscripts(filters);
    
    if (!result.success) {
      throw result.error;
    }
    
    return c.json({ 
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
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch insights' 
      },
      500
    );
  }
});

// PATCH /insights/:id - Update insight
insights.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    if (!id) {
      return c.json(
        { success: false, error: 'Insight ID is required' },
        400
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
        return c.json(
          { success: false, error: 'Insight not found' },
          404
        );
      }
      throw result.error;
    }
    
    return c.json({ 
      success: true, 
      data: {
        ...result.data,
        createdAt: result.data.createdAt.toISOString(),
        updatedAt: result.data.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to update insight:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update insight' 
      },
      500
    );
  }
});

// POST /insights/bulk - Bulk operations on insights
insights.post('/bulk', async (c) => {
  try {
    const body = await c.req.json();
    const { action, insightIds } = body;
    
    if (!action || !insightIds || !Array.isArray(insightIds)) {
      return c.json(
        { success: false, error: 'Action and insight IDs are required' },
        400
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
        return c.json(
          { success: false, error: 'Invalid action' },
          400
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
    
    return c.json({ 
      success: true, 
      message: `Successfully ${action}ed ${insightIds.length} insights`,
      updatedCount: insightIds.length
    });
  } catch (error) {
    console.error('Failed to perform bulk operation:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to perform bulk operation' 
      },
      500
    );
  }
});

export default insights;