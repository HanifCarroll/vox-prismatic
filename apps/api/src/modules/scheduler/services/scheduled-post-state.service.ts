import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createActor } from 'xstate';
import { PrismaService } from '../../database/prisma.service';
import {
  scheduledPostStateMachine,
  ScheduledPostStateMachineContext,
  ScheduledPostStateMachineEvent,
  ScheduledPostStatus,
  canTransition,
  getAvailableTransitions,
  getMaxRetries,
  canRetryPost,
  getRetryDelay
} from '../state/scheduled-post-state-machine';

/**
 * Service responsible for managing scheduled post state transitions using XState
 * Provides centralized state management with database synchronization and event emission
 */
@Injectable()
export class ScheduledPostStateService {
  private readonly logger = new Logger(ScheduledPostStateService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Execute a state transition for a scheduled post
   * Validates transition, updates database, and emits events
   */
  async transition(
    scheduledPostId: string,
    event: ScheduledPostStateMachineEvent,
    additionalData?: Record<string, any>
  ): Promise<any> {
    this.logger.log(`Attempting transition for scheduled post ${scheduledPostId}: ${event.type}`);

    // Get current scheduled post from database
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      include: { post: true }
    });

    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }

    // Validate transition is allowed
    if (!canTransition(scheduledPost.status, event.type)) {
      const availableTransitions = getAvailableTransitions(scheduledPost.status);
      throw new BadRequestException(
        `Invalid transition: Cannot ${event.type} from ${scheduledPost.status}. ` +
        `Available transitions: ${availableTransitions.join(', ')}`
      );
    }

    // Create actor with current context
    const actor = createActor(scheduledPostStateMachine, {
      input: this.createMachineContext(scheduledPost, additionalData)
    });

    // Start machine in current state
    actor.start();
    const initialSnapshot = actor.getSnapshot();

    // Send event to get new state
    actor.send(event);
    const newSnapshot = actor.getSnapshot();
    
    const newState = newSnapshot.value as ScheduledPostStatus;
    const newContext = newSnapshot.context;

    this.logger.log(`Scheduled post ${scheduledPostId} transitioning from ${scheduledPost.status} to ${newState}`);

    // Update database with new state and context
    const updatedScheduledPost = await this.prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: newState,
        retryCount: newContext.retryCount,
        lastAttempt: newContext.lastAttemptAt,
        errorMessage: newContext.lastError,
        externalPostId: newContext.externalPostId,
        queueJobId: newContext.queueJobId,
        updatedAt: new Date()
      }
    });

    // Emit state change event for other services
    this.eventEmitter.emit('scheduled.post.state.changed', {
      scheduledPostId,
      postId: scheduledPost.postId,
      previousState: scheduledPost.status,
      newState,
      event: event.type,
      context: newContext,
      timestamp: new Date()
    });

    // Emit specific events based on state transitions
    this.emitStateSpecificEvents(scheduledPostId, scheduledPost.postId, newState, newContext);

    // Stop the actor to clean up
    actor.stop();

    this.logger.log(`Scheduled post ${scheduledPostId} successfully transitioned to ${newState}`);
    return updatedScheduledPost;
  }

  /**
   * Queue a scheduled post for publishing when time is reached
   */
  async queueForPublishing(scheduledPostId: string, queueJobId?: string): Promise<any> {
    this.logger.log(`Queueing scheduled post ${scheduledPostId} for publishing`);
    
    const event: ScheduledPostStateMachineEvent = queueJobId 
      ? { type: 'QUEUE_FOR_PUBLISHING', queueJobId }
      : { type: 'TIME_REACHED' };
    
    const result = await this.transition(scheduledPostId, event);
    
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
  async startPublishing(scheduledPostId: string): Promise<any> {
    this.logger.log(`Starting publishing process for scheduled post ${scheduledPostId}`);
    
    const result = await this.transition(scheduledPostId, { type: 'START_PUBLISHING' });
    
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
  async markPublished(scheduledPostId: string, externalPostId: string): Promise<any> {
    this.logger.log(`Marking scheduled post ${scheduledPostId} as published with external ID ${externalPostId}`);
    
    const result = await this.transition(scheduledPostId, {
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
  async markFailed(scheduledPostId: string, error: string): Promise<any> {
    this.logger.log(`Marking scheduled post ${scheduledPostId} as failed: ${error}`);
    
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    });
    
    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }
    
    const result = await this.transition(scheduledPostId, {
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
      await this.transition(scheduledPostId, { type: 'MAX_RETRIES_EXCEEDED' });
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
  async retry(scheduledPostId: string): Promise<any> {
    this.logger.log(`Retrying scheduled post ${scheduledPostId}`);
    
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    });
    
    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }
    
    const platform = scheduledPost.platform as 'linkedin' | 'x';
    const canRetry = canRetryPost(platform, scheduledPost.retryCount);
    
    if (!canRetry) {
      throw new BadRequestException(
        `Cannot retry: Maximum retry count (${getMaxRetries(platform)}) exceeded for ${platform}`
      );
    }
    
    const result = await this.transition(scheduledPostId, { type: 'RETRY' });
    
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
  async cancel(scheduledPostId: string, reason?: string): Promise<any> {
    this.logger.log(`Cancelling scheduled post ${scheduledPostId}: ${reason || 'No reason provided'}`);
    
    const result = await this.transition(scheduledPostId, {
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
    const expiredPosts = await this.prisma.scheduledPost.findMany({
      where: {
        status: {
          in: ['pending', 'queued', 'failed']
        },
        scheduledTime: {
          lt: expirationTime
        }
      }
    });
    
    let expiredCount = 0;
    
    for (const post of expiredPosts) {
      try {
        await this.transition(post.id, { type: 'EXPIRE' });
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
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    });
    
    if (!scheduledPost) {
      throw new NotFoundException(`Scheduled post ${scheduledPostId} not found`);
    }
    
    return getAvailableTransitions(scheduledPost.status);
  }

  /**
   * Check if a transition is valid for a scheduled post
   */
  async canTransition(scheduledPostId: string, eventType: string): Promise<boolean> {
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    });
    
    if (!scheduledPost) {
      return false;
    }
    
    return canTransition(scheduledPost.status, eventType);
  }

  /**
   * Get current state machine context for debugging/analysis
   */
  async getMachineContext(scheduledPostId: string): Promise<ScheduledPostStateMachineContext> {
    const scheduledPost = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    });
    
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
        await this.transition(id, event);
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
   */
  private createMachineContext(
    scheduledPost: any,
    additionalData?: Record<string, any>
  ): ScheduledPostStateMachineContext {
    const platform = scheduledPost.platform as 'linkedin' | 'x';
    return {
      scheduledPostId: scheduledPost.id,
      postId: scheduledPost.postId,
      platform,
      scheduledTime: scheduledPost.scheduledTime,
      externalPostId: scheduledPost.externalPostId,
      retryCount: scheduledPost.retryCount || 0,
      maxRetries: getMaxRetries(platform),
      lastError: scheduledPost.errorMessage,
      publishedAt: null,
      queueJobId: scheduledPost.queueJobId,
      lastAttemptAt: scheduledPost.lastAttempt,
      cancelledAt: null,
      expiredAt: null,
      cancelReason: null,
      ...additionalData
    };
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