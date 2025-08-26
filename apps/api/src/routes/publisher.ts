import { Hono } from 'hono';
import { PublisherService } from '../services/publisher';

const publisher = new Hono();

// Initialize publisher service
const publisherService = new PublisherService();

// POST /publisher/process - Manually trigger publishing of scheduled posts
publisher.post('/process', async (c) => {
  try {
    console.log('🚀 [API] Manual publishing trigger requested');

    // Get credentials from request body or environment
    const body = await c.req.json().catch(() => ({}));
    const credentials = {
      linkedin: {
        accessToken: body.linkedin?.accessToken || process.env.LINKEDIN_ACCESS_TOKEN || '',
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      },
      x: {
        accessToken: body.x?.accessToken || process.env.X_ACCESS_TOKEN || '',
        clientId: process.env.X_CLIENT_ID,
        clientSecret: process.env.X_CLIENT_SECRET,
      }
    };

    // Validate that we have at least some credentials
    const hasLinkedInCreds = credentials.linkedin.accessToken && 
                            credentials.linkedin.clientId && 
                            credentials.linkedin.clientSecret;
    const hasXCreds = credentials.x.accessToken && 
                      credentials.x.clientId && 
                      credentials.x.clientSecret;

    if (!hasLinkedInCreds && !hasXCreds) {
      return c.json(
        {
          success: false,
          error: 'No valid credentials provided for LinkedIn or X'
        },
        400
      );
    }

    // Process scheduled posts
    const result = await publisherService.processScheduledPosts(credentials);

    return c.json({
      success: true,
      data: {
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        errors: result.errors,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [API] Manual publishing trigger failed:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process scheduled posts'
      },
      500
    );
  }
});

// GET /publisher/queue - View posts pending publication
publisher.get('/queue', async (c) => {
  try {
    const result = await publisherService.getPostsDueForPublishing();

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to get pending posts'
        },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        postsDue: result.data.length,
        posts: result.data,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [API] Failed to get publishing queue:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get publishing queue'
      },
      500
    );
  }
});

// POST /publisher/retry/:id - Retry failed scheduled post
publisher.post('/retry/:id', async (c) => {
  try {
    const scheduledPostId = c.req.param('id');
    
    if (!scheduledPostId) {
      return c.json(
        {
          success: false,
          error: 'Scheduled post ID is required'
        },
        400
      );
    }

    // Get credentials from request body or environment
    const body = await c.req.json().catch(() => ({}));
    const credentials = {
      linkedin: {
        accessToken: body.linkedin?.accessToken || process.env.LINKEDIN_ACCESS_TOKEN || '',
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      },
      x: {
        accessToken: body.x?.accessToken || process.env.X_ACCESS_TOKEN || '',
        clientId: process.env.X_CLIENT_ID,
        clientSecret: process.env.X_CLIENT_SECRET,
      }
    };

    console.log(`🔄 [API] Retrying scheduled post: ${scheduledPostId}`);

    // Attempt to publish the specific post
    const result = await publisherService.publishScheduledPost(scheduledPostId, credentials);

    if (result.success) {
      return c.json({
        success: true,
        data: {
          scheduledPostId,
          externalPostId: result.externalPostId,
          platform: result.platform,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return c.json(
        {
          success: false,
          error: result.error || 'Failed to retry post',
          scheduledPostId,
          platform: result.platform
        },
        500
      );
    }
  } catch (error) {
    console.error('❌ [API] Failed to retry scheduled post:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry scheduled post'
      },
      500
    );
  }
});

// GET /publisher/status - Check publisher and worker health
publisher.get('/status', async (c) => {
  try {
    // Check how many posts are due
    const queueResult = await publisherService.getPostsDueForPublishing();
    const postsDue = queueResult.success ? queueResult.data.length : 0;

    // Basic health status
    const status = {
      api: {
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      queue: {
        postsDue,
        healthy: true
      },
      credentials: {
        linkedin: {
          configured: !!(process.env.LINKEDIN_ACCESS_TOKEN && 
                        process.env.LINKEDIN_CLIENT_ID && 
                        process.env.LINKEDIN_CLIENT_SECRET)
        },
        x: {
          configured: !!(process.env.X_ACCESS_TOKEN && 
                        process.env.X_CLIENT_ID && 
                        process.env.X_CLIENT_SECRET)
        }
      }
    };

    return c.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ [API] Failed to get publisher status:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get publisher status'
      },
      500
    );
  }
});

// POST /publisher/immediate - Publish a post immediately (bypass scheduling)
publisher.post('/immediate', async (c) => {
  try {
    const body = await c.req.json();
    const { postId, platform, content, accessToken } = body;

    if (!postId || !platform || !content || !accessToken) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: postId, platform, content, accessToken'
        },
        400
      );
    }

    if (platform !== 'linkedin' && platform !== 'x') {
      return c.json(
        {
          success: false,
          error: 'Platform must be either "linkedin" or "x"'
        },
        400
      );
    }

    console.log(`🚀 [API] Immediate publishing requested for post ${postId} on ${platform}`);

    const result = await publisherService.publishImmediately(
      postId,
      platform,
      content,
      accessToken
    );

    if (result.success) {
      return c.json({
        success: true,
        data: {
          postId,
          externalPostId: result.externalPostId,
          platform: result.platform,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return c.json(
        {
          success: false,
          error: result.error,
          postId,
          platform: result.platform
        },
        500
      );
    }
  } catch (error) {
    console.error('❌ [API] Immediate publishing failed:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish immediately'
      },
      500
    );
  }
});

export { publisher };