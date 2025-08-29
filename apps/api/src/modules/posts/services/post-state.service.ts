import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createActor } from 'xstate';
import { 
  postStateMachine, 
  type PostStateMachineContext,
  type PostStateMachineEvent,
  canTransition,
  getAvailableTransitions 
} from '../state/post-state-machine';
import { PostRepository } from '../post.repository';
import { PostEntity } from '../entities/post.entity';
import { PostStatus } from '@content-creation/types';

/**
 * Service responsible for managing post state transitions using XState
 * Provides centralized state management with validation and event emission
 */
@Injectable()
export class PostStateService {
  private readonly logger = new Logger(PostStateService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly postRepository: PostRepository
  ) {}


  /**
   * Check if a transition is valid for a post
   */
  async canTransition(postId: string, eventType: string): Promise<boolean> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return false;
    }
    
    return canTransition(post.status, eventType);
  }

  /**
   * Get available transitions for a post's current state
   */
  async getAvailableActions(postId: string): Promise<string[]> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    return getAvailableTransitions(post.status);
  }

  /**
   * Get available transitions for any state (useful for UI logic)
   */
  getAvailableActionsForState(state: string): string[] {
    return getAvailableTransitions(state);
  }

  /**
   * Validate if a state transition is allowed (static check)
   */
  canTransitionFromState(currentState: string, eventType: string): boolean {
    return canTransition(currentState, eventType);
  }

  /**
   * Get current state machine context for debugging/analysis
   */
  async getMachineContext(postId: string): Promise<PostStateMachineContext> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    return this.createMachineContext(post);
  }

  /**
   * Create machine context from post entity and optional additional data
   */
  private createMachineContext(
    post: PostEntity, 
    additionalData?: Record<string, any>
  ): PostStateMachineContext {
    return {
      postId: post.id,
      platform: post.platform,
      retryCount: 0, // Could be tracked in database if needed
      lastError: post.errorMessage || null,
      approvedBy: post.approvedBy || null,
      rejectedBy: post.rejectedBy || null,
      rejectedReason: post.rejectedReason || null,
      scheduledTime: null, // This would come from ScheduledPost if needed
      archivedReason: post.archivedReason || null,
      repository: this.postRepository, // Phase 1: Repository injection
      ...additionalData
    };
  }

  /**
   * Phase 3: Simplified state transition execution with repository injection
   * Replaces the complex transition() method with XState-owned persistence
   */
  private async executeTransition(
    postId: string,
    event: PostStateMachineEvent
  ): Promise<PostEntity> {
    this.logger.log(`Executing transition for post ${postId}: ${event.type}`);

    // Get current post
    const currentPost = await this.postRepository.findById(postId);
    if (!currentPost) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    // Validate transition
    if (!canTransition(currentPost.status, event.type)) {
      const availableTransitions = getAvailableTransitions(currentPost.status);
      throw new BadRequestException(
        `Invalid transition: Cannot ${event.type} from ${currentPost.status}. ` +
        `Available transitions: ${availableTransitions.join(', ')}`
      );
    }

    // Create actor with repository injection
    const actor = createActor(postStateMachine, {
      input: this.createMachineContext(currentPost)
    });

    try {
      // Start machine and execute transition
      actor.start();
      actor.send(event);
      
      const snapshot = actor.getSnapshot();
      const context = snapshot.context;

      // State machine persistence actions handle database updates
      // Return updated entity from context if available, otherwise fetch fresh
      const updatedPost = context.updatedEntity || await this.postRepository.findById(postId);
      
      if (!updatedPost) {
        throw new Error(`Failed to retrieve updated post ${postId} after transition`);
      }

      // Emit state change event
      this.eventEmitter.emit('post.state.changed', {
        postId,
        previousState: currentPost.status,
        newState: updatedPost.status,
        event: event.type,
        context,
        timestamp: new Date()
      });

      this.logger.log(`Post ${postId} successfully transitioned from ${currentPost.status} to ${updatedPost.status}`);
      return updatedPost;

    } catch (error) {
      this.logger.error(`State transition failed for post ${postId}:`, error);
      throw error;
    } finally {
      actor.stop();
    }
  }

  /**
   * Convenience methods for common transitions
   */
  
  async submitForReview(postId: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'SUBMIT_FOR_REVIEW' });
  }

  async approvePost(postId: string, approvedBy?: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'APPROVE', approvedBy });
  }

  async rejectPost(postId: string, rejectedBy?: string, reason?: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'REJECT', rejectedBy, reason });
  }

  async schedulePost(
    postId: string, 
    scheduledTime: Date, 
    platform: string
  ): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'SCHEDULE', scheduledTime, platform });
  }

  async unschedulePost(postId: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'UNSCHEDULE' });
  }

  async markPublished(postId: string, externalPostId: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'PUBLISH_SUCCESS', externalPostId });
  }

  async markPublishFailed(postId: string, error: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'PUBLISH_FAILED', error });
  }

  async retryPublication(postId: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'RETRY' });
  }

  async archivePost(postId: string, reason?: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'ARCHIVE', reason });
  }

  async editPost(postId: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'EDIT' });
  }

  async deletePost(postId: string): Promise<PostEntity> {
    return this.executeTransition(postId, { type: 'DELETE' });
  }
}