import { Hono } from 'hono';
import { getDatabaseAdapter } from '../database/adapter';
import { PostService, SchedulingService } from '../services';
import { generateId } from '../lib/id-generator';

const scheduler = new Hono();

// Initialize services
const postService = new PostService();
const schedulingService = new SchedulingService();

// Get repository from adapter
const getScheduledPostRepo = () => getDatabaseAdapter().getScheduledPostRepository();

// GET /scheduler/events - List scheduled events
scheduler.get('/events', async (c) => {
  try {
    // Get query parameters for filtering
    const status = c.req.query('status');
    const platform = c.req.query('platform');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // Build filter object
    const filters: any = {};
    if (status) filters.status = status;
    if (platform) filters.platform = platform;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Get calendar events from repository
    const result = await getScheduledPostRepo().findAsCalendarEvents(filters);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to get scheduled events'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Failed to get scheduled events:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduled events'
      },
      500
    );
  }
});

// POST /scheduler/events - Create scheduled event
scheduler.post('/events', async (c) => {
  try {
    // Parse request body
    const body = await c.req.json();
    const { postId, platform, content, scheduledTime, metadata } = body;

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

    // If postId is provided, use existing post scheduling
    if (postId) {
      const scheduleRequest = {
        postId,
        platform: platform as 'linkedin' | 'x',
        scheduledTime,
        metadata: metadata || {}
      };

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

      return c.json({
        success: true,
        data: {
          scheduledPostId: result.data.scheduledPost.id,
          scheduledTime: result.data.scheduledPost.scheduledTime,
          platform: result.data.scheduledPost.platform,
          status: result.data.scheduledPost.status
        }
      });
    }

    // For standalone event creation (without existing post)
    if (!content) {
      return c.json(
        {
          success: false,
          error: 'Content is required when creating event without postId'
        },
        400
      );
    }

    // Create scheduled post directly
    const newScheduledPost = {
      id: generateId('scheduled'),
      postId: null,
      platform: platform as 'linkedin' | 'x',
      content,
      scheduledTime,
      status: 'pending' as const,
      retryCount: 0,
      lastAttempt: null,
      errorMessage: null,
      externalPostId: null,
      metadata: JSON.stringify(metadata || {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await getScheduledPostRepo().create(newScheduledPost);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to create scheduled event'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        scheduledPostId: result.data.id,
        scheduledTime: result.data.scheduledTime,
        platform: result.data.platform,
        status: result.data.status
      }
    });
  } catch (error) {
    console.error('Failed to create scheduled event:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create scheduled event'
      },
      500
    );
  }
});

// DELETE /scheduler/events - Unschedule post by postId
scheduler.delete('/events', async (c) => {
  try {
    const postId = c.req.query('postId');

    if (!postId) {
      return c.json(
        {
          success: false,
          error: 'Missing required query parameter: postId'
        },
        400
      );
    }

    // Use PostService to unschedule the post
    const result = await postService.unschedulePost(postId);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to unschedule post'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        scheduledPostId: result.data.scheduledPostId,
        message: `Post ${postId} has been unscheduled`
      }
    });
  } catch (error) {
    console.error('Failed to unschedule post:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unschedule post'
      },
      500
    );
  }
});

// GET /scheduler/events/:id - Get single scheduled event
scheduler.get('/events/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    // Get scheduled post by ID
    const result = await getScheduledPostRepo().findById(id);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to get scheduled event'
        },
        500
      );
    }

    if (!result.data) {
      return c.json(
        {
          success: false,
          error: `Scheduled event with ID ${id} not found`
        },
        404
      );
    }

    // Transform to calendar event format
    const event = {
      id: result.data.id,
      postId: result.data.postId || '',
      title: result.data.content.substring(0, 50) + (result.data.content.length > 50 ? '...' : ''),
      content: result.data.content,
      platform: result.data.platform,
      status: result.data.status,
      scheduledTime: result.data.scheduledTime,
      retryCount: result.data.retryCount,
      lastAttempt: result.data.lastAttempt,
      errorMessage: result.data.errorMessage,
      externalPostId: result.data.externalPostId,
      createdAt: new Date(result.data.createdAt),
      updatedAt: new Date(result.data.updatedAt)
    };

    return c.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error(`Failed to get scheduled event ${id}:`, error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduled event'
      },
      500
    );
  }
});

// PUT /scheduler/events/:id - Update scheduled event (reschedule)
scheduler.put('/events/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    // Parse request body
    const body = await c.req.json();
    const { scheduledTime, content, platform, metadata } = body;

    // Validate that at least one field is provided for update
    if (!scheduledTime && !content && !platform && !metadata) {
      return c.json(
        {
          success: false,
          error: 'At least one field must be provided for update'
        },
        400
      );
    }

    // Get current scheduled post to validate it exists
    const currentResult = await getScheduledPostRepo().findById(id);
    if (!currentResult.success || !currentResult.data) {
      return c.json(
        {
          success: false,
          error: `Scheduled event with ID ${id} not found`
        },
        404
      );
    }

    // Check if event can be updated (only pending events)
    if (currentResult.data.status !== 'pending') {
      return c.json(
        {
          success: false,
          error: 'Only pending scheduled events can be updated'
        },
        400
      );
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (scheduledTime) {
      // Validate new scheduled time
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

      if (scheduleDate <= new Date()) {
        return c.json(
          {
            success: false,
            error: 'Scheduled time must be in the future'
          },
          400
        );
      }

      updates.scheduledTime = scheduledTime;
    }

    if (content) {
      updates.content = content;
    }

    if (platform) {
      if (!['linkedin', 'x'].includes(platform)) {
        return c.json(
          {
            success: false,
            error: 'Invalid platform. Must be "linkedin" or "x"'
          },
          400
        );
      }
      updates.platform = platform;
    }

    if (metadata) {
      updates.metadata = JSON.stringify(metadata);
    }

    // Update the scheduled post
    const result = await getScheduledPostRepo().update(id, updates);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to update scheduled event'
        },
        500
      );
    }

    // Return updated event
    const updatedResult = await getScheduledPostRepo().findById(id);
    if (!updatedResult.success || !updatedResult.data) {
      return c.json(
        {
          success: false,
          error: 'Event updated but failed to retrieve updated data'
        },
        500
      );
    }

    // Transform to calendar event format
    const event = {
      id: updatedResult.data.id,
      postId: updatedResult.data.postId || '',
      title: updatedResult.data.content.substring(0, 50) + (updatedResult.data.content.length > 50 ? '...' : ''),
      content: updatedResult.data.content,
      platform: updatedResult.data.platform,
      status: updatedResult.data.status,
      scheduledTime: updatedResult.data.scheduledTime,
      retryCount: updatedResult.data.retryCount,
      lastAttempt: updatedResult.data.lastAttempt,
      errorMessage: updatedResult.data.errorMessage,
      externalPostId: updatedResult.data.externalPostId,
      createdAt: new Date(updatedResult.data.createdAt),
      updatedAt: new Date(updatedResult.data.updatedAt)
    };

    return c.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error(`Failed to update scheduled event ${id}:`, error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update scheduled event'
      },
      500
    );
  }
});

// DELETE /scheduler/events/:id - Delete/cancel scheduled event
scheduler.delete('/events/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    // Use PostService to cancel the scheduled post (handles status updates)
    const result = await postService.cancelScheduledPost(id);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to cancel scheduled event'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        scheduledPostId: id,
        message: `Scheduled event ${id} has been cancelled`
      }
    });
  } catch (error) {
    console.error(`Failed to cancel scheduled event ${id}:`, error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel scheduled event'
      },
      500
    );
  }
});

export default scheduler;