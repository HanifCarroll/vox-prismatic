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
      reviewedBy: null,
      rejectionReason: null,
      approvedBy: null,
      score: insight.totalScore || null, // Using total score instead of urgency score
      failureReason: null,
      archivedReason: null,
      retryCount: 0, // Could be tracked in database if needed
      ...additionalData
    };
  }

  /**
   * Convenience methods for common transitions
   */
  
  async submitForReview(insightId: string): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'SUBMIT_FOR_REVIEW' });
  }

  async approveInsight(insightId: string, approvedBy?: string, score?: number): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'APPROVE', approvedBy, score });
  }

  async rejectInsight(insightId: string, reviewedBy?: string, reason?: string): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'REJECT', reviewedBy, reason });
  }

  async archiveInsight(insightId: string, reason?: string): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'ARCHIVE', reason });
  }

  async editInsight(insightId: string): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'EDIT' });
  }

  async restoreInsight(insightId: string): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'RESTORE' });
  }

  async markFailed(insightId: string, reason?: string): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'MARK_FAILED', reason });
  }

  async retryInsight(insightId: string): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'RETRY' });
  }

  async deleteInsight(insightId: string): Promise<InsightEntity> {
    return this.transition(insightId, { type: 'DELETE' });
  }
}