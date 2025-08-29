import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createActor } from 'xstate';
import { 
  insightStateMachine, 
  type InsightStateMachineContext,
  type InsightStateMachineEvent,
  canTransition,
  getAvailableTransitions 
} from '../state/insight-state-machine';
import { InsightRepository } from '../insight.repository';
import { InsightEntity } from '../entities/insight.entity';
import { InsightStatus } from '../dto/update-insight.dto';

/**
 * Service responsible for managing insight state transitions using XState
 * Provides centralized state management with validation and event emission
 */
@Injectable()
export class InsightStateService {
  private readonly logger = new Logger(InsightStateService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly insightRepository: InsightRepository
  ) {}

  /**
   * Execute a state transition for an insight
   * Validates transition, updates database, and emits events
   * 
   * @deprecated Use executeTransition() instead - this method is kept for API compatibility
   * but doesn't support the new repository injection pattern
   */
  async transition(
    insightId: string, 
    event: InsightStateMachineEvent, 
    additionalData?: Record<string, any>
  ): Promise<InsightEntity> {
    this.logger.log(`Attempting transition for insight ${insightId}: ${event.type}`);

    // Get current insight from database
    const insight = await this.insightRepository.findById(insightId);
    if (!insight) {
      throw new NotFoundException(`Insight ${insightId} not found`);
    }

    // Validate transition is allowed
    if (!canTransition(insight.status, event.type)) {
      const availableTransitions = getAvailableTransitions(insight.status);
      throw new BadRequestException(
        `Invalid transition: Cannot ${event.type} from ${insight.status}. ` +
        `Available transitions: ${availableTransitions.join(', ')}`
      );
    }

    // Create actor with current context
    const actor = createActor(insightStateMachine, {
      input: this.createMachineContext(insight, additionalData)
    });

    // Start machine in current state
    actor.start();
    const initialSnapshot = actor.getSnapshot();

    // Send event to get new state
    actor.send(event);
    const newSnapshot = actor.getSnapshot();
    
    const newState = newSnapshot.value as InsightStatus;
    const newContext = newSnapshot.context;

    this.logger.log(`Insight ${insightId} transitioning from ${insight.status} to ${newState}`);

    // State machine actions should handle database updates, not the service

    // Emit state change event for other services
    this.eventEmitter.emit('insight.state.changed', {
      insightId,
      previousState: insight.status,
      newState,
      event: event.type,
      context: newContext,
      timestamp: new Date()
    });

    // Emit specific events for important state transitions
    if (newState === InsightStatus.APPROVED) {
      this.eventEmitter.emit('insight.approved', {
        insightId,
        platforms: ['linkedin', 'twitter'], // Could come from context or config
        approvedAt: new Date(),
        approvedBy: newContext.approvedBy || 'system'
      });
    } else if (newState === InsightStatus.REJECTED) {
      this.eventEmitter.emit('insight.rejected', {
        insightId,
        rejectedAt: new Date(),
        rejectedBy: newContext.reviewedBy || 'system',
        reason: newContext.rejectionReason
      });
    }

    // Stop the actor to clean up
    actor.stop();

    this.logger.log(`Insight ${insightId} successfully transitioned to ${newState}`);
    // Return the updated insight from repository
    return this.insightRepository.findById(insightId);
  }

  /**
   * Check if a transition is valid for an insight
   */
  async canTransition(insightId: string, eventType: string): Promise<boolean> {
    const insight = await this.insightRepository.findById(insightId);
    if (!insight) {
      return false;
    }
    
    return canTransition(insight.status, eventType);
  }

  /**
   * Get available transitions for an insight's current state
   */
  async getAvailableActions(insightId: string): Promise<string[]> {
    const insight = await this.insightRepository.findById(insightId);
    if (!insight) {
      throw new NotFoundException(`Insight ${insightId} not found`);
    }

    return getAvailableTransitions(insight.status);
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
  async getMachineContext(insightId: string): Promise<InsightStateMachineContext> {
    const insight = await this.insightRepository.findById(insightId);
    if (!insight) {
      throw new NotFoundException(`Insight ${insightId} not found`);
    }

    return this.createMachineContext(insight);
  }

  /**
   * Create machine context from insight entity and optional additional data
   */
  private createMachineContext(
    insight: InsightEntity, 
    additionalData?: Record<string, any>
  ): InsightStateMachineContext {
    return {
      insightId: insight.id,
      transcriptId: insight.cleanedTranscriptId,
      reviewedBy: insight.reviewedBy || null,
      rejectionReason: insight.rejectionReason || null,
      approvedBy: insight.approvedBy || null,
      score: insight.totalScore || null, // Using total score instead of urgency score
      failureReason: insight.failureReason || null,
      archivedReason: insight.archivedReason || null,
      retryCount: insight.retryCount || 0,
      repository: this.insightRepository, // Phase 1: Repository injection
      ...additionalData
    };
  }

  /**
   * Phase 3: Simplified state transition execution with repository injection
   * Replaces the complex transition() method with XState-owned persistence
   */
  private async executeTransition(
    insightId: string,
    event: InsightStateMachineEvent
  ): Promise<InsightEntity> {
    this.logger.log(`Executing transition for insight ${insightId}: ${event.type}`);

    // Get current insight
    const currentInsight = await this.insightRepository.findById(insightId);
    if (!currentInsight) {
      throw new NotFoundException(`Insight ${insightId} not found`);
    }

    // Validate transition
    if (!canTransition(currentInsight.status, event.type)) {
      const availableTransitions = getAvailableTransitions(currentInsight.status);
      throw new BadRequestException(
        `Invalid transition: Cannot ${event.type} from ${currentInsight.status}. ` +
        `Available transitions: ${availableTransitions.join(', ')}`
      );
    }

    // Create actor with repository injection
    const actor = createActor(insightStateMachine, {
      input: this.createMachineContext(currentInsight)
    });

    try {
      // Start machine and execute transition
      actor.start();
      actor.send(event);
      
      const snapshot = actor.getSnapshot();
      const context = snapshot.context;

      // State machine persistence actions handle database updates
      // Return updated entity from context if available, otherwise fetch fresh
      const updatedInsight = context.updatedEntity || await this.insightRepository.findById(insightId);
      
      if (!updatedInsight) {
        throw new Error(`Failed to retrieve updated insight ${insightId} after transition`);
      }

      // Emit state change event
      this.eventEmitter.emit('insight.state.changed', {
        insightId,
        previousState: currentInsight.status,
        newState: updatedInsight.status,
        event: event.type,
        context,
        timestamp: new Date()
      });

      // Emit specific events for important state transitions
      if (updatedInsight.status === InsightStatus.APPROVED) {
        this.eventEmitter.emit('insight.approved', {
          insightId,
          platforms: ['linkedin', 'twitter'], // Could come from context or config
          approvedAt: new Date(),
          approvedBy: context.approvedBy || 'system'
        });
      } else if (updatedInsight.status === InsightStatus.REJECTED) {
        this.eventEmitter.emit('insight.rejected', {
          insightId,
          rejectedAt: new Date(),
          rejectedBy: context.reviewedBy || 'system',
          reason: context.rejectionReason
        });
      }

      this.logger.log(`Insight ${insightId} successfully transitioned from ${currentInsight.status} to ${updatedInsight.status}`);
      return updatedInsight;

    } catch (error) {
      this.logger.error(`State transition failed for insight ${insightId}:`, error);
      throw error;
    } finally {
      actor.stop();
    }
  }

  /**
   * Convenience methods for common transitions
   */
  
  async submitForReview(insightId: string): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'SUBMIT_FOR_REVIEW' });
  }

  async approveInsight(insightId: string, approvedBy?: string, score?: number): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'APPROVE', approvedBy, score });
  }

  async rejectInsight(insightId: string, reviewedBy?: string, reason?: string): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'REJECT', reviewedBy, reason });
  }

  async archiveInsight(insightId: string, reason?: string): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'ARCHIVE', reason });
  }

  async editInsight(insightId: string): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'EDIT' });
  }

  async restoreInsight(insightId: string): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'RESTORE' });
  }

  async markFailed(insightId: string, reason?: string): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'MARK_FAILED', reason });
  }

  async retryInsight(insightId: string): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'RETRY' });
  }

  async deleteInsight(insightId: string): Promise<InsightEntity> {
    return this.executeTransition(insightId, { type: 'DELETE' });
  }
}