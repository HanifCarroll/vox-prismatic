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

// POST /posts/:id/schedule - Schedule a post
posts.post('/:id/schedule', async (c) => {
  const id = c.req.param('id');
  
  try {
    // Parse request body
    const body = await c.req.json();
    const { platform, scheduledTime, metadata } = body;

    // Validate required fields
    if (!platform || !scheduledTime) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: platform and scheduledTime'
        },
        400
      );
    }

    // Validate platform
    if (!['linkedin', 'x'].includes(platform)) {
      return c.json(
        {
          success: false,
          error: 'Invalid platform. Must be "linkedin" or "x"'
        },
        400
      );
    }

    // Validate scheduledTime is a valid ISO date
    const scheduleDate = new Date(scheduledTime);
    if (isNaN(scheduleDate.getTime())) {
      return c.json(
        {
          success: false,
          error: 'Invalid scheduledTime. Must be a valid ISO date string'
        },
        400
      );
    }

    // Check if the scheduled time is in the future
    if (scheduleDate <= new Date()) {
      return c.json(
        {
          success: false,
          error: 'Scheduled time must be in the future'
        },
        400
      );
    }

    // Create schedule request
    const scheduleRequest = {
      postId: id,
      platform: platform as 'linkedin' | 'x',
      scheduledTime: scheduledTime,
      metadata: metadata || {}
    };

    // Use PostService to schedule the post
    const result = await postService.schedulePost(scheduleRequest);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to schedule post'
        },
        500
      );
    }

    // Return the scheduled post details
    return c.json({
      success: true,
      data: {
        scheduledPostId: result.data.scheduledPost.id,
        scheduledTime: result.data.scheduledPost.scheduledTime,
        platform: result.data.scheduledPost.platform,
        status: result.data.scheduledPost.status,
        postId: result.data.post.id
      }
    });
  } catch (error) {
    console.error('Failed to schedule post:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule post'
      },
      500
    );
  }
});

export default posts;