import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createActor, ActorRefFrom } from 'xstate';
import { ScheduledPostStatus } from '@content-creation/types';
import { ScheduledPostRepository } from '../scheduled-post.repository';
import {
  scheduledPostStateMachine,
  ScheduledPostStateMachineContext,
  ScheduledPostStateMachineEvent,
  canTransition,
  getAvailableTransitions,
  getMaxRetries,
  canRetryPost,
  getRetryDelay
} from '../state/scheduled-post-state-machine';
import { ScheduledPostEntity } from '../entities/scheduled-post.entity';

/**
 * Service responsible for managing scheduled post state transitions using XState
 * Provides centralized state management with database synchronization and event emission
 */
@Injectable()
export class ScheduledPostStateService {
  private readonly logger = new Logger(ScheduledPostStateService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly scheduledPostRepository: ScheduledPostRepository
  ) {}


  /**
   * Queue a scheduled post for publishing when time is reached
   */
  async queueForPublishing(scheduledPostId: string, queueJobId?: string): Promise<ScheduledPostEntity> {
    this.logger.log(`Queueing scheduled post ${scheduledPostId} for publishing`);
    
    const event: ScheduledPostStateMachineEvent = queueJobId 
      ? { type: 'QUEUE_FOR_PUBLISHING', queueJobId }
      : { type: 'TIME_REACHED' };
    
    const result = await this.executeTransition(scheduledPostId, event);
    
    // Emit queued event
    this.eventEmitter.emit('scheduled.post.queued', {
      scheduledPostId,
      postId: result.postId,
      platform: result.platform,
      queueJobId: queueJobId || result.queueJobId,
      timestamp: new Date()
    });
    
    return result;
  }

  /**
   * Start the publishing process for a queued post
   */
  async startPublishing(scheduledPostId: string): Promise<ScheduledPostEntity> {
    this.logger.log(`Starting publishing process for scheduled post ${scheduledPostId}`);
    
    const result = await this.executeTransition(scheduledPostId, { type: 'START_PUBLISHING' });
    
    // Emit publishing event
    this.eventEmitter.emit('scheduled.post.publishing', {
      scheduledPostId,
      postId: result.postId,
      platform: result.platform,
      timestamp: new Date()
    });
    
    return result;
  }

  /**
   * Mark a scheduled post as successfully published
   */
  async markPublished(scheduledPostId: string, externalPostId: string): Promise<ScheduledPostEntity> {
    this.logger.log(`Marking scheduled post ${scheduledPostId} as published with external ID ${externalPostId}`);
    
    const result = await this.executeTransition(scheduledPostId, {
      type: 'PUBLISH_SUCCESS',
      externalPostId
    });
    
    // Emit published event (already handled by PublisherService but we can emit our own too)
    this.eventEmitter.emit('scheduled.post.published', {
      scheduledPostId,
      postId: result.postId,
      platform: result.platform,
      externalPostId,
      publishedAt: new Date(),
      timestamp: new Date()
    });
    
    return result;
  }

  /**
   * Mark a scheduled post as failed
   */
  async markFailed(scheduledPostId: string, error: string): Promise<ScheduledPostEntity> {
    this.logger.log(`Marking scheduled post ${scheduledPostId} as failed: ${error}`);
    
    const scheduledPost = await this.scheduledPostRepository.findById(scheduledPostId);
    
    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }
    
    const result = await this.executeTransition(scheduledPostId, {
      type: 'PUBLISH_FAILED',
      error
    });
    
    // Check if we should automatically retry or mark as permanently failed
    const platform = scheduledPost.platform as 'linkedin' | 'x';
    const canRetry = canRetryPost(platform, result.retryCount);
    
    if (!canRetry) {
      // Emit permanent failure event
      this.eventEmitter.emit('scheduled.post.permanently.failed', {
        scheduledPostId,
        postId: result.postId,
        platform: result.platform,
        finalError: error,
        totalAttempts: result.retryCount + 1,
        timestamp: new Date()
      });
      
      // Transition to expired state
      await this.executeTransition(scheduledPostId, { type: 'MAX_RETRIES_EXCEEDED' });
    } else {
      // Emit failure event with retry info
      this.eventEmitter.emit('scheduled.post.failed', {
        scheduledPostId,
        postId: result.postId,
        platform: result.platform,
        error,
        retryCount: result.retryCount,
        maxRetries: getMaxRetries(platform),
        willRetry: true,
        nextRetryDelay: getRetryDelay(platform, result.retryCount),
        timestamp: new Date()
      });
    }
    
    return result;
  }

  /**
   * Retry a failed scheduled post
   */
  async retry(scheduledPostId: string): Promise<ScheduledPostEntity> {
    this.logger.log(`Retrying scheduled post ${scheduledPostId}`);
    
    const scheduledPost = await this.scheduledPostRepository.findById(scheduledPostId);
    
    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }
    
    const platform = scheduledPost.getPlatform();
    const canRetry = canRetryPost(platform, scheduledPost.retryCount);
    
    if (!canRetry) {
      throw new BadRequestException(
        `Cannot retry: Maximum retry count (${getMaxRetries(platform)}) exceeded for ${platform}`
      );
    }
    
    const result = await this.executeTransition(scheduledPostId, { type: 'RETRY' });
    
    // Emit retry event
    this.eventEmitter.emit('scheduled.post.retrying', {
      scheduledPostId,
      postId: result.postId,
      platform: result.platform,
      retryCount: result.retryCount,
      retryDelay: getRetryDelay(platform, result.retryCount),
      timestamp: new Date()
    });
    
    return result;
  }

  /**
   * Cancel a scheduled post
   */
  async cancel(scheduledPostId: string, reason?: string): Promise<ScheduledPostEntity> {
    this.logger.log(`Cancelling scheduled post ${scheduledPostId}: ${reason || 'No reason provided'}`);
    
    const result = await this.executeTransition(scheduledPostId, {
      type: 'CANCEL',
      reason
    });
    
    // Emit cancelled event
    this.eventEmitter.emit('scheduled.post.cancelled', {
      scheduledPostId,
      postId: result.postId,
      platform: result.platform,
      reason: reason || 'Manually cancelled',
      cancelledAt: new Date(),
      timestamp: new Date()
    });
    
    return result;
  }

  /**
   * Check and expire old scheduled posts
   * This should be called periodically by a cron job or worker
   */
  async checkAndExpireOldPosts(): Promise<number> {
    this.logger.log('Checking for expired scheduled posts');
    
    const now = new Date();
    const expirationTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    // Find all pending or queued posts that are past their expiration time
    const expiredPosts = await this.scheduledPostRepository.findExpired(24);
    
    let expiredCount = 0;
    
    for (const post of expiredPosts) {
      try {
        await this.executeTransition(post.id, { type: 'EXPIRE' });
        expiredCount++;
        
        // Emit expired event
        this.eventEmitter.emit('scheduled.post.expired', {
          scheduledPostId: post.id,
          postId: post.postId,
          platform: post.platform,
          scheduledTime: post.scheduledTime,
          expiredAt: new Date(),
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error(`Failed to expire scheduled post ${post.id}:`, error);
      }
    }
    
    this.logger.log(`Expired ${expiredCount} scheduled posts`);
    return expiredCount;
  }

  /**
   * Get available transitions for a scheduled post's current state
   */
  async getAvailableActions(scheduledPostId: string): Promise<string[]> {
    const scheduledPost = await this.scheduledPostRepository.findById(scheduledPostId);
    
    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }
    
    return getAvailableTransitions(scheduledPost.status);
  }

  /**
   * Check if a transition is valid for a scheduled post
   */
  async canTransition(scheduledPostId: string, eventType: string): Promise<boolean> {
    const scheduledPost = await this.scheduledPostRepository.findById(scheduledPostId);
    
    if (!scheduledPost) {
      return false;
    }
    
    return canTransition(scheduledPost.status, eventType);
  }

  /**
   * Get current state machine context for debugging/analysis
   */
  async getMachineContext(scheduledPostId: string): Promise<ScheduledPostStateMachineContext> {
    const scheduledPost = await this.scheduledPostRepository.findById(scheduledPostId);
    
    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }
    
    return this.createMachineContext(scheduledPost);
  }

  /**
   * Process bulk state transitions (e.g., for batch operations)
   */
  async bulkTransition(
    scheduledPostIds: string[],
    event: ScheduledPostStateMachineEvent
  ): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    
    for (const id of scheduledPostIds) {
      try {
        await this.executeTransition(id, event);
        successful.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return { successful, failed };
  }

  /**
   * Create machine context from scheduled post entity and optional additional data
   * Phase 1: Now includes repository injection for state machine persistence
   */
  private createMachineContext(
    scheduledPost: ScheduledPostEntity,
    additionalData?: Record<string, any>
  ): ScheduledPostStateMachineContext {
    const platform = scheduledPost.getPlatform();
    return {
      scheduledPostId: scheduledPost.id,
      postId: scheduledPost.postId,
      platform,
      scheduledTime: scheduledPost.scheduledTime,
      externalPostId: scheduledPost.externalPostId,
      retryCount: scheduledPost.retryCount,
      maxRetries: getMaxRetries(platform),
      lastError: scheduledPost.errorMessage,
      publishedAt: null,
      queueJobId: scheduledPost.queueJobId,
      lastAttemptAt: scheduledPost.lastAttempt,
      cancelledAt: null,
      expiredAt: null,
      cancelReason: null,
      repository: this.scheduledPostRepository, // Phase 1: Repository injection
      ...additionalData
    };
  }

  /**
   * Phase 3: Simplified state transition execution with repository injection
   * Replaces the complex transition() method with XState-owned persistence
   * Public method for external access to state transitions
   */
  async executeTransition(
    scheduledPostId: string,
    event: ScheduledPostStateMachineEvent
  ): Promise<ScheduledPostEntity> {
    this.logger.log(`Executing transition for scheduled post ${scheduledPostId}: ${event.type}`);

    // Get current scheduled post
    const currentScheduledPost = await this.scheduledPostRepository.findById(scheduledPostId);
    if (!currentScheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }

    // Validate transition
    if (!canTransition(currentScheduledPost.status, event.type)) {
      const availableTransitions = getAvailableTransitions(currentScheduledPost.status);
      throw new BadRequestException(
        `Invalid transition: Cannot ${event.type} from ${currentScheduledPost.status}. ` +
        `Available transitions: ${availableTransitions.join(', ')}`
      );
    }

    // Create actor with repository injection
    const actor = createActor(scheduledPostStateMachine, {
      input: this.createMachineContext(currentScheduledPost)
    });

    try {
      // Start machine and execute transition
      actor.start();
      actor.send(event);
      
      const snapshot = actor.getSnapshot();
      const context = snapshot.context;

      // State machine persistence actions handle database updates
      // Return updated entity from context if available, otherwise fetch fresh
      const updatedScheduledPost = context.updatedEntity || await this.scheduledPostRepository.findById(scheduledPostId);
      
      if (!updatedScheduledPost) {
        throw new Error(`Failed to retrieve updated scheduled post ${scheduledPostId} after transition`);
      }

      // Emit state change event
      this.eventEmitter.emit('scheduled.post.state.changed', {
        scheduledPostId,
        postId: updatedScheduledPost.postId,
        previousState: currentScheduledPost.status,
        newState: updatedScheduledPost.status,
        event: event.type,
        context,
        timestamp: new Date()
      });

      // Emit specific events for important state transitions
      this.emitStateSpecificEvents(scheduledPostId, updatedScheduledPost.postId, updatedScheduledPost.status as ScheduledPostStatus, context);

      this.logger.log(`Scheduled post ${scheduledPostId} successfully transitioned from ${currentScheduledPost.status} to ${updatedScheduledPost.status}`);
      return updatedScheduledPost;

    } catch (error) {
      this.logger.error(`State transition failed for scheduled post ${scheduledPostId}:`, error);
      throw error;
    } finally {
      actor.stop();
    }
  }

  /**
   * Emit specific events based on state transitions
   */
  private emitStateSpecificEvents(
    scheduledPostId: string,
    postId: string,
    newState: ScheduledPostStatus,
    context: ScheduledPostStateMachineContext
  ): void {
    switch (newState) {
      case ScheduledPostStatus.QUEUED:
        this.eventEmitter.emit('scheduled.post.ready', {
          scheduledPostId,
          postId,
          platform: context.platform,
          timestamp: new Date()
        });
        break;
        
      case ScheduledPostStatus.EXPIRED:
        this.eventEmitter.emit('scheduled.post.lifecycle.ended', {
          scheduledPostId,
          postId,
          platform: context.platform,
          reason: context.lastError || 'Expired',
          timestamp: new Date()
        });
        break;
        
      case ScheduledPostStatus.CANCELLED:
        this.eventEmitter.emit('scheduled.post.lifecycle.ended', {
          scheduledPostId,
          postId,
          platform: context.platform,
          reason: context.cancelReason || 'Cancelled',
          timestamp: new Date()
        });
        break;
    }
  }

  /**
   * Get platform-specific retry strategy information
   */
  getRetryStrategy(platform: 'linkedin' | 'x'): {
    maxRetries: number;
    delays: number[];
  } {
    return {
      maxRetries: getMaxRetries(platform),
      delays: Array.from({ length: getMaxRetries(platform) }, (_, i) => 
        getRetryDelay(platform, i)
      )
    };
  }
}