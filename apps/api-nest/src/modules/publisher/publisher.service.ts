import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { 
  PublishResultEntity, 
  PublishQueueEntity,
  PublishQueueItemEntity,
  PublisherStatusEntity,
  ImmediatePublishResultEntity,
  RetryPublishResultEntity
} from './entities';
import { ProcessScheduledPostsDto, PublishImmediateDto } from './dto';

// Import existing publisher service
import { PublisherService as HonoPublisherService } from '../../../../api/src/services/publisher';

@Injectable()
export class PublisherService {
  private readonly logger = new Logger(PublisherService.name);
  private readonly publisherService: HonoPublisherService;

  constructor() {
    this.publisherService = new HonoPublisherService();
  }

  async processScheduledPosts(credentials: ProcessScheduledPostsDto): Promise<PublishResultEntity> {
    this.logger.log('Manual publishing trigger requested');

    try {
      // Build credentials object in the format expected by Hono service
      const formattedCredentials = {
        linkedin: {
          accessToken: credentials.linkedin?.accessToken || process.env.LINKEDIN_ACCESS_TOKEN || '',
          clientId: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        x: {
          accessToken: credentials.x?.accessToken || process.env.X_ACCESS_TOKEN || '',
          clientId: process.env.X_CLIENT_ID,
          clientSecret: process.env.X_CLIENT_SECRET,
        }
      };

      // Validate that we have at least some credentials
      const hasLinkedInCreds = formattedCredentials.linkedin.accessToken && 
                              formattedCredentials.linkedin.clientId && 
                              formattedCredentials.linkedin.clientSecret;
      const hasXCreds = formattedCredentials.x.accessToken && 
                        formattedCredentials.x.clientId && 
                        formattedCredentials.x.clientSecret;

      if (!hasLinkedInCreds && !hasXCreds) {
        throw new BadRequestException('No valid credentials provided for LinkedIn or X');
      }

      // Process scheduled posts using the existing service
      const result = await this.publisherService.processScheduledPosts(formattedCredentials);

      return {
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        errors: result.errors,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Manual publishing trigger failed:', error);
      throw error;
    }
  }

  async getPublishingQueue(): Promise<PublishQueueEntity> {
    this.logger.log('Getting publishing queue');

    try {
      const result = await this.publisherService.getPostsDueForPublishing();

      if (!result.success) {
        throw new BadRequestException(
          result.error instanceof Error ? result.error.message : 'Failed to get pending posts'
        );
      }

      const posts: PublishQueueItemEntity[] = result.data.map(post => ({
        id: post.id,
        postId: post.postId,
        platform: post.platform,
        content: post.content,
        scheduledTime: post.scheduledTime,
        status: post.status
      }));

      return {
        postsDue: result.data.length,
        posts: posts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get publishing queue:', error);
      throw error;
    }
  }

  async retryScheduledPost(scheduledPostId: string, credentials: ProcessScheduledPostsDto): Promise<RetryPublishResultEntity> {
    this.logger.log(`Retrying scheduled post: ${scheduledPostId}`);

    try {
      // Build credentials object in the format expected by Hono service
      const formattedCredentials = {
        linkedin: {
          accessToken: credentials.linkedin?.accessToken || process.env.LINKEDIN_ACCESS_TOKEN || '',
          clientId: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        x: {
          accessToken: credentials.x?.accessToken || process.env.X_ACCESS_TOKEN || '',
          clientId: process.env.X_CLIENT_ID,
          clientSecret: process.env.X_CLIENT_SECRET,
        }
      };

      // Attempt to publish the specific post
      const result = await this.publisherService.publishScheduledPost(scheduledPostId, formattedCredentials);

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
      const queueResult = await this.publisherService.getPostsDueForPublishing();
      const postsDue = queueResult.success ? queueResult.data.length : 0;

      // Basic health status
      const status: PublisherStatusEntity = {
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

      return status;
    } catch (error) {
      this.logger.error('Failed to get publisher status:', error);
      throw error;
    }
  }

  async publishImmediately(publishDto: PublishImmediateDto): Promise<ImmediatePublishResultEntity> {
    this.logger.log(`Immediate publishing requested for post ${publishDto.postId} on ${publishDto.platform}`);

    try {
      const result = await this.publisherService.publishImmediately(
        publishDto.postId,
        publishDto.platform,
        publishDto.content,
        publishDto.accessToken
      );

      if (result.success) {
        return {
          postId: publishDto.postId,
          externalPostId: result.externalPostId,
          platform: result.platform,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new BadRequestException(result.error);
      }
    } catch (error) {
      this.logger.error('Immediate publishing failed:', error);
      throw error;
    }
  }
}