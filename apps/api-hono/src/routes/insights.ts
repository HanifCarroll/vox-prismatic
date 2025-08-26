import { Hono } from 'hono';
import { z } from 'zod';
import { validateRequest, getValidated } from '../middleware/validation';
import { handleServiceResult } from '../middleware/error-handler';
import { InsightService } from '../services/insight-service';
import { 
  InsightFilterSchema, 
  UpdateInsightSchema, 
  BulkInsightOperationSchema,
  InsightParamsSchema 
} from '../schemas/insights';

const insights = new Hono();
const insightService = new InsightService();

// GET /insights - List insights with filtering
insights.get(
  '/',
  validateRequest({ query: InsightFilterSchema }),
  async (c) => {
    const filters = getValidated(c, 'query');
    const result = await insightService.getInsights(filters);
    const data = handleServiceResult(result);

    return c.json({
      success: true,
      data: data.map(insight => ({
        ...insight,
        createdAt: insight.createdAt.toISOString(),
        updatedAt: insight.updatedAt.toISOString()
      })),
      total: data.length
    });
  }
);

// GET /insights/:id - Get single insight
insights.get(
  '/:id',
  validateRequest({ params: InsightParamsSchema }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    const result = await insightService.getInsight(id);
    const data = handleServiceResult(result, id);

    return c.json({
      success: true,
      data: {
        ...data,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString()
      }
    });
  }
);

// PATCH /insights/:id - Update insight
insights.patch(
  '/:id',
  validateRequest({ 
    params: InsightParamsSchema,
    body: UpdateInsightSchema 
  }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    const body = getValidated(c, 'body');
    
    const result = await insightService.updateInsight(id, body);
    const data = handleServiceResult(result, id);

    return c.json({
      success: true,
      data: {
        ...data,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString()
      }
    });
  }
);

// POST /insights/bulk - Bulk operations on insights
insights.post(
  '/bulk',
  validateRequest({ body: BulkInsightOperationSchema }),
  async (c) => {
    const { action, insightIds } = getValidated(c, 'body');
    
    const result = await insightService.bulkUpdateInsights(insightIds, action);
    const data = handleServiceResult(result);

    return c.json({
      success: true,
      message: `Successfully ${action}ed ${data.updatedCount} insights`,
      updatedCount: data.updatedCount
    });
  }
);

// GET /insights/transcript/:transcriptId - Get insights for a specific transcript
insights.get(
  '/transcript/:transcriptId',
  validateRequest({ params: z.object({ transcriptId: z.string().min(1) }) }),
  async (c) => {
    const { transcriptId } = getValidated(c, 'params');
    const result = await insightService.getInsightsByTranscript(transcriptId);
    const data = handleServiceResult(result);

    return c.json({
      success: true,
      data: data.map(insight => ({
        ...insight,
        createdAt: insight.createdAt.toISOString(),
        updatedAt: insight.updatedAt.toISOString()
      })),
      total: data.length
    });
  }
);

export default insights;