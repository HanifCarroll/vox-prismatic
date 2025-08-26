import { Hono } from 'hono';
import { 
  PostService,
  PostRepository
} from '../database/index.ts';

const posts = new Hono();

// Initialize service and repository
const postService = new PostService();
const postRepo = new PostRepository();

// GET /posts - List posts with filtering and sorting
posts.get('/', async (c) => {
  try {
    // Parse query parameters
    const status = c.req.query('status');
    const platform = c.req.query('platform');
    const search = c.req.query('search');
    const sortBy = c.req.query('sortBy') || 'createdAt';
    const sortOrder = c.req.query('sortOrder') || 'desc';
    const limitStr = c.req.query('limit') || '50';
    const offsetStr = c.req.query('offset') || '0';
    
    const limit = parseInt(limitStr);
    const offset = parseInt(offsetStr);

    // Use PostService for all requests
    const result = await postService.getPosts({
      status,
      platform,
      search,
      limit,
      offset,
      sortBy,
      sortOrder: sortOrder as "asc" | "desc",
    });

    if (!result.success) {
      throw result.error;
    }

    return c.json({
      success: true,
      data: result.data,
      meta: {
        total: result.data.length,
        count: result.data.length,
        limit,
        offset,
        hasMore: result.data.length === limit,
      },
    });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch posts",
      },
      500
    );
  }
});

// PATCH /posts/:id - Update post 
posts.patch('/:id', async (c) => {
  try {
    const postId = c.req.param('id');

    if (!postId) {
      return c.json(
        {
          success: false,
          error: "Post ID is required",
        },
        400
      );
    }

    const updateData = await c.req.json();

    // Update the post using repository
    const result = await postRepo.update(postId, updateData);

    if (!result.success) {
      if (result.error.message.includes("not found")) {
        return c.json(
          {
            success: false,
            error: "Post not found",
          },
          404
        );
      }
      throw result.error;
    }

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Failed to update post:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update post",
      },
      500
    );
  }
});

// POST /posts/:id/schedule - Schedule a post (placeholder for complex scheduling)
posts.post('/:id/schedule', async (c) => {
  const id = c.req.param('id');
  
  // TODO: Implement post scheduling - this will be complex and may stay in Next.js initially
  return c.json({
    success: false,
    message: `Post scheduling for ${id} - complex operation, implement later`,
    data: null
  });
});

export default posts;