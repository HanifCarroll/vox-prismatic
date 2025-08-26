import { 
  LinkedInConfig,
  XConfig,
  Platform,
  Result
} from '../integrations/types/social-media';
import { createLinkedInClient } from '../integrations/linkedin/client';
import { createXClient, createPostOrThread } from '../integrations/x/client';
import { ScheduledPostRepository } from '../database/repositories/scheduled-post-repository';

/**
 * Publisher Service
 * Handles the actual posting of scheduled content to social media platforms
 */

export interface PublishingCredentials {
  linkedin?: {
    accessToken: string;
    clientId?: string;
    clientSecret?: string;
  };
  x?: {
    accessToken: string;
    clientId?: string;
    clientSecret?: string;
  };
}

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
  platform: Platform;
  content: string;
}

export class PublisherService {
  private scheduledPostRepo: ScheduledPostRepository;

  constructor() {
    this.scheduledPostRepo = new ScheduledPostRepository();
  }

  /**
   * Publish a post to LinkedIn
   */
  async publishToLinkedIn(
    content: string, 
    credentials: { accessToken: string }
  ): Promise<Result<{ externalPostId: string }>> {
    try {
      console.log('📝 Publishing to LinkedIn...');

      const config: LinkedInConfig = {
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
        accessToken: credentials.accessToken
      };

      if (!config.clientId || !config.clientSecret) {
        return {
          success: false,
          error: new Error('LinkedIn client configuration missing')
        };
      }

      const clientResult = await createLinkedInClient(config);
      if (!clientResult.success) {
        return clientResult;
      }

      const postResult = await clientResult.data.createPost(content, 'PUBLIC');
      if (!postResult.success) {
        return postResult;
      }

      console.log('✅ Published to LinkedIn successfully');
      return {
        success: true,
        data: { externalPostId: postResult.data.id }
      };
    } catch (error) {
      console.error('❌ LinkedIn publishing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Publish a post to X (Twitter)
   */
  async publishToX(
    content: string, 
    credentials: { accessToken: string }
  ): Promise<Result<{ externalPostId: string }>> {
    try {
      console.log('🐦 Publishing to X...');

      const config: XConfig = {
        clientId: process.env.X_CLIENT_ID || '',
        clientSecret: process.env.X_CLIENT_SECRET || '',
        redirectUri: process.env.X_REDIRECT_URI || '',
        accessToken: credentials.accessToken
      };

      if (!config.clientId || !config.clientSecret) {
        return {
          success: false,
          error: new Error('X client configuration missing')
        };
      }

      const result = await createPostOrThread(config, content);
      if (!result.success) {
        return result;
      }

      // Handle both single tweet and thread responses
      let externalPostId: string;
      if (Array.isArray(result.data)) {
        // Thread - use the first tweet's ID
        externalPostId = result.data[0].id;
      } else {
        // Single tweet
        externalPostId = result.data.id;
      }

      console.log('✅ Published to X successfully');
      return {
        success: true,
        data: { externalPostId }
      };
    } catch (error) {
      console.error('❌ X publishing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Publish a scheduled post to the specified platform
   */
  async publishScheduledPost(
    scheduledPostId: string,
    credentials: PublishingCredentials
  ): Promise<PublishResult> {
    try {
      // Get the scheduled post
      const postResult = await this.scheduledPostRepo.findById(scheduledPostId);
      if (!postResult.success || !postResult.data) {
        return {
          success: false,
          error: `Scheduled post not found: ${scheduledPostId}`,
          platform: 'linkedin', // Default, will be overridden
          content: ''
        };
      }

      const scheduledPost = postResult.data;
      
      // Check if post is ready to be published
      if (scheduledPost.status !== 'pending') {
        return {
          success: false,
          error: `Post status is ${scheduledPost.status}, cannot publish`,
          platform: scheduledPost.platform as Platform,
          content: scheduledPost.content
        };
      }

      // Check if it's time to publish
      const scheduledTime = new Date(scheduledPost.scheduledTime);
      const now = new Date();
      
      if (scheduledTime > now) {
        return {
          success: false,
          error: `Post is scheduled for ${scheduledTime.toISOString()}, not yet time to publish`,
          platform: scheduledPost.platform as Platform,
          content: scheduledPost.content
        };
      }

      let publishResult: Result<{ externalPostId: string }>;
      
      // Publish to the appropriate platform
      if (scheduledPost.platform === 'linkedin') {
        if (!credentials.linkedin) {
          return {
            success: false,
            error: 'LinkedIn credentials not provided',
            platform: 'linkedin',
            content: scheduledPost.content
          };
        }
        publishResult = await this.publishToLinkedIn(
          scheduledPost.content, 
          credentials.linkedin
        );
      } else if (scheduledPost.platform === 'x') {
        if (!credentials.x) {
          return {
            success: false,
            error: 'X credentials not provided',
            platform: 'x',
            content: scheduledPost.content
          };
        }
        publishResult = await this.publishToX(
          scheduledPost.content, 
          credentials.x
        );
      } else {
        return {
          success: false,
          error: `Unsupported platform: ${scheduledPost.platform}`,
          platform: scheduledPost.platform as Platform,
          content: scheduledPost.content
        };
      }

      // Update the scheduled post based on the result
      if (publishResult.success) {
        // Mark as published with external ID
        await this.scheduledPostRepo.update(scheduledPostId, {
          status: 'published',
          externalPostId: publishResult.data.externalPostId,
          lastAttempt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        return {
          success: true,
          externalPostId: publishResult.data.externalPostId,
          platform: scheduledPost.platform as Platform,
          content: scheduledPost.content
        };
      } else {
        // Mark as failed and increment retry count
        const newRetryCount = scheduledPost.retryCount + 1;
        
        await this.scheduledPostRepo.update(scheduledPostId, {
          status: newRetryCount >= 3 ? 'failed' : 'pending', // Fail after 3 attempts
          errorMessage: publishResult.error instanceof Error ? 
            publishResult.error.message : 'Publishing failed',
          retryCount: newRetryCount,
          lastAttempt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        return {
          success: false,
          error: publishResult.error instanceof Error ? 
            publishResult.error.message : 'Publishing failed',
          platform: scheduledPost.platform as Platform,
          content: scheduledPost.content
        };
      }
    } catch (error) {
      console.error(`Failed to publish scheduled post ${scheduledPostId}:`, error);
      
      // Try to update the post status to failed
      try {
        const postResult = await this.scheduledPostRepo.findById(scheduledPostId);
        if (postResult.success && postResult.data) {
          await this.scheduledPostRepo.update(scheduledPostId, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            lastAttempt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (updateError) {
        console.error('Failed to update post status after error:', updateError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'linkedin', // Default
        content: ''
      };
    }
  }

  /**
   * Get all scheduled posts that are due for publishing
   */
  async getPostsDueForPublishing(): Promise<Result<Array<{ id: string; platform: Platform; scheduledTime: string }>>> {
    try {
      const now = new Date().toISOString();
      
      const result = await this.scheduledPostRepo.findAll({
        status: 'pending',
        scheduledBefore: now
      });
      
      if (!result.success) {
        return result;
      }

      const dueForPublishing = result.data.map(post => ({
        id: post.id,
        platform: post.platform as Platform,
        scheduledTime: post.scheduledTime
      }));

      return {
        success: true,
        data: dueForPublishing
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Process all pending scheduled posts (to be called by a scheduler/cron job)
   */
  async processScheduledPosts(credentials: PublishingCredentials): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    try {
      console.log('🔄 Processing scheduled posts...');

      const postsResult = await this.getPostsDueForPublishing();
      if (!postsResult.success) {
        console.error('Failed to get posts due for publishing:', postsResult.error);
        return {
          processed: 0,
          successful: 0,
          failed: 0,
          errors: [postsResult.error instanceof Error ? postsResult.error.message : 'Failed to get posts']
        };
      }

      const postsDue = postsResult.data;
      console.log(`📋 Found ${postsDue.length} posts due for publishing`);

      if (postsDue.length === 0) {
        return {
          processed: 0,
          successful: 0,
          failed: 0,
          errors: []
        };
      }

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each post
      for (const post of postsDue) {
        console.log(`📤 Publishing post ${post.id} to ${post.platform}...`);
        
        const result = await this.publishScheduledPost(post.id, credentials);
        
        if (result.success) {
          console.log(`✅ Successfully published ${post.id} to ${post.platform}`);
          successful++;
        } else {
          console.error(`❌ Failed to publish ${post.id} to ${post.platform}: ${result.error}`);
          failed++;
          errors.push(`${post.id}: ${result.error}`);
        }

        // Add delay between posts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`📊 Publishing complete: ${successful} successful, ${failed} failed`);

      return {
        processed: postsDue.length,
        successful,
        failed,
        errors
      };
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}