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
import { InsightStatus } from '@content-creation/types';

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