import { Hono } from 'hono';
import { validateRequest, getValidated } from '../middleware/validation';
import { handleServiceResult } from '../middleware/error-handler';
import { TranscriptService } from '../services/transcript-service';
import { 
  TranscriptFilterSchema, 
  CreateTranscriptSchema, 
  UpdateTranscriptSchema, 
  TranscriptParamsSchema 
} from '../schemas/transcripts';

const transcripts = new Hono();
const transcriptService = new TranscriptService();

// GET /transcripts - List transcripts with filtering
transcripts.get(
  '/',
  validateRequest({ query: TranscriptFilterSchema }),
  async (c) => {
    const filters = getValidated(c, 'query');
    const result = await transcriptService.getTranscripts(filters);
    const data = handleServiceResult(result);

    return c.json({
      success: true,
      data: data.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString()
      }))
    });
  }
);

// POST /transcripts - Create new transcript
transcripts.post(
  '/',
  validateRequest({ body: CreateTranscriptSchema }),
  async (c) => {
    const body = getValidated(c, 'body');
    const result = await transcriptService.createTranscript(body);
    const data = handleServiceResult(result);

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

// GET /transcripts/:id - Get single transcript
transcripts.get(
  '/:id',
  validateRequest({ params: TranscriptParamsSchema }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    const result = await transcriptService.getTranscript(id);
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

// PATCH /transcripts/:id - Update transcript
transcripts.patch(
  '/:id',
  validateRequest({ 
    params: TranscriptParamsSchema,
    body: UpdateTranscriptSchema 
  }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    const body = getValidated(c, 'body');
    
    const result = await transcriptService.updateTranscript(id, body);
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

// DELETE /transcripts/:id - Delete transcript
transcripts.delete(
  '/:id',
  validateRequest({ params: TranscriptParamsSchema }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    const result = await transcriptService.deleteTranscript(id);
    handleServiceResult(result, id);

    return c.json({
      success: true,
      message: `Transcript ${id} deleted successfully`
    });
  }
);

export default transcripts;