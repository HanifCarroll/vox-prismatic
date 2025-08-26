import { Hono } from 'hono';
import { 
  TranscriptRepository,
  type TranscriptFilter
} from '../repositories';

const transcripts = new Hono();

// Initialize repository
const transcriptRepo = new TranscriptRepository();

// GET /transcripts - List transcripts with filtering
transcripts.get('/', async (c) => {
  try {
    // Build filters from query parameters
    const filters: TranscriptFilter = {};
    
    const status = c.req.query('status');
    if (status && status !== 'all') {
      filters.status = status as TranscriptFilter['status'];
    }
    
    const search = c.req.query('search');
    if (search) {
      filters.search = search;
    }
    
    // Fetch transcripts using repository
    const result = await transcriptRepo.findAll(filters);
    
    if (!result.success) {
      throw result.error;
    }
    
    return c.json({ 
      success: true, 
      data: result.data.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Failed to fetch transcripts:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch transcripts' 
      },
      500
    );
  }
});

// POST /transcripts - Create new transcript
transcripts.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    // Basic validation
    if (!body.title || !body.rawContent) {
      return c.json(
        { success: false, error: 'Title and content are required' },
        400
      );
    }
    
    // Create new transcript using repository
    const result = await transcriptRepo.create({
      title: body.title,
      rawContent: body.rawContent,
      sourceType: body.sourceType || 'manual',
      sourceUrl: body.sourceUrl,
      fileName: body.fileName,
      duration: body.duration
    });
    
    if (!result.success) {
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
    console.error('Failed to create transcript:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create transcript' 
      },
      500
    );
  }
});

// PATCH /transcripts/:id - Update transcript
transcripts.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    if (!id) {
      return c.json(
        { success: false, error: 'Transcript ID is required' },
        400
      );
    }
    
    // Update transcript using repository
    const result = await transcriptRepo.update(id, {
      status: body.status,
      title: body.title,
      rawContent: body.rawContent
    });
    
    if (!result.success) {
      if (result.error.message.includes('not found')) {
        return c.json(
          { success: false, error: 'Transcript not found' },
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
    console.error('Failed to update transcript:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update transcript' 
      },
      500
    );
  }
});

export default transcripts;