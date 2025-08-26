import { Hono } from 'hono';
import { validateRequest, getValidated } from '../middleware/validation';
import { handleServiceResult } from '../middleware/error-handler';
import { PostService, SchedulingService } from '../services';
import { 
  PostFilterSchema, 
  UpdatePostSchema, 
  SchedulePostSchema,
  PostParamsSchema 
} from '../schemas/posts';

const posts = new Hono();
const postService = new PostService();
const schedulingService = new SchedulingService();

// GET /posts - List posts with filtering and sorting
posts.get(
  '/',
  validateRequest({ query: PostFilterSchema }),
  async (c) => {
    const filters = getValidated(c, 'query');
    
    const result = await postService.getPosts(filters);
    const data = handleServiceResult(result);

    return c.json({
      success: true,
      data,
      meta: {
        total: data.length,
        count: data.length,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: data.length === (filters.limit || 50),
      },
    });
  }
);

// GET /posts/:id - Get single post
posts.get(
  '/:id',
  validateRequest({ params: PostParamsSchema }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    
    // Note: getPost method would need to be added to PostService
    const result = await postService.getPost(id);
    const data = handleServiceResult(result, id);

    return c.json({
      success: true,
      data
    });
  }
);

// PATCH /posts/:id - Update post
posts.patch(
  '/:id',
  validateRequest({ 
    params: PostParamsSchema,
    body: UpdatePostSchema 
  }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    const body = getValidated(c, 'body');
    
    const result = await postService.updatePost(id, body);
    const data = handleServiceResult(result, id);

    return c.json({
      success: true,
      data
    });
  }
);

// POST /posts/:id/schedule - Schedule a post
posts.post(
  '/:id/schedule',
  validateRequest({ 
    params: PostParamsSchema,
    body: SchedulePostSchema 
  }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    const { platform, scheduledTime, metadata } = getValidated(c, 'body');

    const scheduleRequest = {
      postId: id,
      platform,
      scheduledTime,
      metadata: metadata || {}
    };

    const result = await schedulingService.schedulePost(scheduleRequest);
    const data = handleServiceResult(result);

    return c.json({
      success: true,
      data: {
        scheduledPostId: data.scheduledPost.id,
        scheduledTime: data.scheduledPost.scheduledTime,
        platform: data.scheduledPost.platform,
        status: data.scheduledPost.status,
        postId: data.post.id
      }
    });
  }
);

// DELETE /posts/:id - Delete post
posts.delete(
  '/:id',
  validateRequest({ params: PostParamsSchema }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    
    // Note: deletePost method would need to be added to PostService
    const result = await postService.deletePost(id);
    handleServiceResult(result, id);

    return c.json({
      success: true,
      message: `Post ${id} deleted successfully`
    });
  }
);

// POST /posts/:id/unschedule - Unschedule a post
posts.post(
  '/:id/unschedule',
  validateRequest({ params: PostParamsSchema }),
  async (c) => {
    const { id } = getValidated(c, 'params');
    
    const result = await schedulingService.unschedulePost(id);
    handleServiceResult(result, id);

    return c.json({
      success: true,
      message: `Post ${id} unscheduled successfully`
    });
  }
);

export default posts;