import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { 
  PublishResultEntity, 
  PublishQueueEntity,
  PublishQueueItemEntity,
  PublisherStatusEntity,
  ImmediatePublishResultEntity,
  RetryPublishResultEntity
} from './entities';
import { ProcessScheduledPostsDto, PublishImmediateDto } from './dto';

// Import social media integrations
import { 
  LinkedInConfig, 
  XConfig,
  Platform 
} from '../../../../api/src/integrations/types/social-media';
import { createLinkedInClient } from '../../../../api/src/integrations/linkedin/client';
import { createXClient, createPostOrThread } from '../../../../api/src/integrations/x/client';

interface PublishingCredentials {
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

interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
  platform: Platform;
}

@Injectable()
export class PublisherService {
  private readonly logger = new Logger(PublisherService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Publish a post to LinkedIn
   */
  private async publishToLinkedIn(
    content: string,
    credentials: { accessToken: string }
  ): Promise<{ success: boolean; externalPostId?: string; error?: Error }> {
    try {
      this.logger.log('Publishing to LinkedIn...');

      const config: LinkedInConfig = {
        clientId: this.configService.get<string>('LINKEDIN_CLIENT_ID') || '',
        clientSecret: this.configService.get<string>('LINKEDIN_CLIENT_SECRET') || '',
        redirectUri: this.configService.get<string>('LINKEDIN_REDIRECT_URI') || '',
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
        return {
          success: false,
          error: clientResult.error
        };
      }

      const postResult = await clientResult.data.createPost(content, 'PUBLIC');
      if (!postResult.success) {
        return {
          success: false,
          error: postResult.error
        };
      }

      this.logger.log('Published to LinkedIn successfully');
      return {
        success: true,
        externalPostId: postResult.data.id
      };
    } catch (error) {
      this.logger.error('LinkedIn publishing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Publish a post to X (Twitter)
   */
  private async publishToX(
    content: string,
    credentials: { accessToken: string }
  ): Promise<{ success: boolean; externalPostId?: string; error?: Error }> {
    try {
      this.logger.log('Publishing to X...');

      const config: XConfig = {
        clientId: this.configService.get<string>('X_CLIENT_ID') || '',
        clientSecret: this.configService.get<string>('X_CLIENT_SECRET') || '',
        redirectUri: this.configService.get<string>('X_REDIRECT_URI') || '',
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
        return {
          success: false,
          error: result.error
        };
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

      this.logger.log('Published to X successfully');
      return {
        success: true,
        externalPostId
      };
    } catch (error) {
      this.logger.error('X publishing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get all scheduled posts that are due for publishing
   */
  private async getPostsDueForPublishing(): Promise<Array<any>> {
    const now = new Date();
    
    const posts = await this.prisma.scheduledPost.findMany({
      where: {
        status: 'pending',
        scheduledTime: {
          lte: now
        }
      },
      include: {
        post: true
      }
    });

    return posts;
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
      const scheduledPost = await this.prisma.scheduledPost.findUnique({
        where: { id: scheduledPostId },
        include: { post: true }
      });

      if (!scheduledPost) {
        return {
          success: false,
          error: `Scheduled post not found: ${scheduledPostId}`,
          platform: 'linkedin'
        };
      }

      // Check if post is ready to be published
      if (scheduledPost.status !== 'pending') {
        return {
          success: false,
          error: `Post status is ${scheduledPost.status}, cannot publish`,
          platform: scheduledPost.platform as Platform
        };
      }

      let publishResult: { success: boolean; externalPostId?: string; error?: Error };
      
      // Publish to the appropriate platform
      if (scheduledPost.platform === 'linkedin') {
        if (!credentials.linkedin) {
          return {
            success: false,
            error: 'LinkedIn credentials not provided',
            platform: 'linkedin'
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
            platform: 'x'
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
          platform: scheduledPost.platform as Platform
        };
      }

      // Update the scheduled post based on the result
      if (publishResult.success) {
        // Mark as published with external ID
        await this.prisma.scheduledPost.update({
          where: { id: scheduledPostId },
          data: {
            status: 'published',
            externalPostId: publishResult.externalPostId,
            lastAttempt: new Date(),
            updatedAt: new Date()
          }
        });

        return {
          success: true,
          externalPostId: publishResult.externalPostId,
          platform: scheduledPost.platform as Platform
        };
      } else {
        // Mark as failed and increment retry count
        const newRetryCount = scheduledPost.retryCount + 1;
        
        await this.prisma.scheduledPost.update({
          where: { id: scheduledPostId },
          data: {
            status: newRetryCount >= 3 ? 'failed' : 'pending', // Fail after 3 attempts
            errorMessage: publishResult.error?.message || 'Publishing failed',
            retryCount: newRetryCount,
            lastAttempt: new Date(),
            updatedAt: new Date()
          }
        });

        return {
          success: false,
          error: publishResult.error?.message || 'Publishing failed',
          platform: scheduledPost.platform as Platform
        };
      }
    } catch (error) {
      this.logger.error(`Failed to publish scheduled post ${scheduledPostId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'linkedin'
      };
    }
  }

  async processScheduledPosts(credentials: ProcessScheduledPostsDto): Promise<PublishResultEntity> {
    this.logger.log('Processing scheduled posts');

    try {
      // Build credentials object
      const formattedCredentials: PublishingCredentials = {
        linkedin: credentials.linkedin ? {
          accessToken: credentials.linkedin.accessToken || this.configService.get<string>('LINKEDIN_ACCESS_TOKEN') || '',
          clientId: this.configService.get<string>('LINKEDIN_CLIENT_ID'),
          clientSecret: this.configService.get<string>('LINKEDIN_CLIENT_SECRET'),
        } : undefined,
        x: credentials.x ? {
          accessToken: credentials.x.accessToken || this.configService.get<string>('X_ACCESS_TOKEN') || '',
          clientId: this.configService.get<string>('X_CLIENT_ID'),
          clientSecret: this.configService.get<string>('X_CLIENT_SECRET'),
        } : undefined
      };

      const postsDue = await this.getPostsDueForPublishing();
      this.logger.log(`Found ${postsDue.length} posts due for publishing`);

      if (postsDue.length === 0) {
        return {
          processed: 0,
          successful: 0,
          failed: 0,
          errors: [],
          timestamp: new Date().toISOString()
        };
      }

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each post
      for (const scheduledPost of postsDue) {
        this.logger.log(`Publishing post ${scheduledPost.id} to ${scheduledPost.platform}...`);
        
        const result = await this.publishScheduledPost(scheduledPost.id, formattedCredentials);
        
        if (result.success) {
          this.logger.log(`Successfully published ${scheduledPost.id} to ${scheduledPost.platform}`);
          successful++;
        } else {
          this.logger.error(`Failed to publish ${scheduledPost.id}: ${result.error}`);
          failed++;
          errors.push(`${scheduledPost.id}: ${result.error}`);
        }

        // Add delay between posts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return {
        processed: postsDue.length,
        successful,
        failed,
        errors,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error processing scheduled posts:', error);
      throw new BadRequestException('Failed to process scheduled posts');
    }
  }

  async getPublishingQueue(): Promise<PublishQueueEntity> {
    this.logger.log('Getting publishing queue');

    try {
      const postsDue = await this.getPostsDueForPublishing();

      const posts: PublishQueueItemEntity[] = postsDue.map(scheduledPost => ({
        id: scheduledPost.id,
        postId: scheduledPost.postId,
        platform: scheduledPost.platform,
        content: scheduledPost.content,
        scheduledTime: scheduledPost.scheduledTime.toISOString(),
        status: scheduledPost.status
      }));

      return {
        postsDue: posts.length,
        posts: posts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get publishing queue:', error);
      throw new BadRequestException('Failed to get publishing queue');
    }
  }

  async retryScheduledPost(scheduledPostId: string, credentials: ProcessScheduledPostsDto): Promise<RetryPublishResultEntity> {
    this.logger.log(`Retrying scheduled post: ${scheduledPostId}`);

    try {
      // Build credentials object
      const formattedCredentials: PublishingCredentials = {
        linkedin: credentials.linkedin ? {
          accessToken: credentials.linkedin.accessToken || this.configService.get<string>('LINKEDIN_ACCESS_TOKEN') || '',
          clientId: this.configService.get<string>('LINKEDIN_CLIENT_ID'),
          clientSecret: this.configService.get<string>('LINKEDIN_CLIENT_SECRET'),
        } : undefined,
        x: credentials.x ? {
          accessToken: credentials.x.accessToken || this.configService.get<string>('X_ACCESS_TOKEN') || '',
          clientId: this.configService.get<string>('X_CLIENT_ID'),
          clientSecret: this.configService.get<string>('X_CLIENT_SECRET'),
        } : undefined
      };

      // Attempt to publish the specific post
      const result = await this.publishScheduledPost(scheduledPostId, formattedCredentials);

      if (result.success) {
        return {
          scheduledPostId,
          externalPostId: result.externalPostId,
          platform: result.platform,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new BadRequestException(result.error || 'Failed to retry post');
      }
    } catch (error) {
      this.logger.error('Failed to retry scheduled post:', error);
      throw error;
    }
  }

  async getPublisherStatus(): Promise<PublisherStatusEntity> {
    this.logger.log('Getting publisher status');

    try {
      // Check how many posts are due
      const postsDue = await this.getPostsDueForPublishing();

      // Basic health status
      const status: PublisherStatusEntity = {
        api: {
          status: 'healthy',
          timestamp: new Date().toISOString()
        },
        queue: {
          postsDue: postsDue.length,
          healthy: true
        },
        credentials: {
          linkedin: {
            configured: !!(
              this.configService.get<string>('LINKEDIN_ACCESS_TOKEN') &&
              this.configService.get<string>('LINKEDIN_CLIENT_ID') &&
              this.configService.get<string>('LINKEDIN_CLIENT_SECRET')
            )
          },
          x: {
            configured: !!(
              this.configService.get<string>('X_ACCESS_TOKEN') &&
              this.configService.get<string>('X_CLIENT_ID') &&
              this.configService.get<string>('X_CLIENT_SECRET')
            )
          }
        }
      };

      return status;
    } catch (error) {
      this.logger.error('Failed to get publisher status:', error);
      throw new BadRequestException('Failed to get publisher status');
    }
  }

  async publishImmediately(publishDto: PublishImmediateDto): Promise<ImmediatePublishResultEntity> {
    this.logger.log(`Immediate publishing requested for post ${publishDto.postId} on ${publishDto.platform}`);

    try {
      let publishResult: { success: boolean; externalPostId?: string; error?: Error };
      
      if (publishDto.platform === 'linkedin') {
        publishResult = await this.publishToLinkedIn(publishDto.content, { 
          accessToken: publishDto.accessToken 
        });
      } else if (publishDto.platform === 'x') {
        publishResult = await this.publishToX(publishDto.content, { 
          accessToken: publishDto.accessToken 
        });
      } else {
        throw new BadRequestException(`Unsupported platform: ${publishDto.platform}`);
      }

      if (publishResult.success) {
        return {
          postId: publishDto.postId,
          externalPostId: publishResult.externalPostId,
          platform: publishDto.platform,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new BadRequestException(publishResult.error?.message || 'Publishing failed');
      }
    } catch (error) {
      this.logger.error('Immediate publishing failed:', error);
      throw error;
    }
  }
}