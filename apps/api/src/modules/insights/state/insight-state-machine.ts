import { createMachine, assign } from 'xstate';
import { InsightStatus } from '../dto/update-insight.dto';
import { InsightRepository } from '../insight.repository';
import { InsightEntity } from '../entities/insight.entity';

/**
 * Enhanced context data for the insight state machine
 * Phase 1: Now includes repository for database persistence and updated entity storage
 */
export interface InsightStateMachineContext {
  insightId: string;
  transcriptId: string;
  reviewedBy: string | null;
  rejectionReason: string | null;
  approvedBy: string | null;
  score: number | null;
  failureReason: string | null;
  archivedReason: string | null;
  retryCount: number;
  // Phase 1: Repository injection support
  repository?: InsightRepository;
  updatedEntity?: InsightEntity;
}

/**
 * Events that can trigger state transitions
 */
export type InsightStateMachineEvent =
  | { type: 'SUBMIT_FOR_REVIEW' }
  | { type: 'APPROVE'; approvedBy?: string; score?: number }
  | { type: 'REJECT'; reviewedBy?: string; reason?: string }
  | { type: 'ARCHIVE'; reason?: string }
  | { type: 'EDIT' }
  | { type: 'RESTORE' }
  | { type: 'MARK_FAILED'; reason?: string }
  | { type: 'RETRY' }
  | { type: 'DELETE' };

/**
 * Enhanced insight state machine definition following XState best practices
 * Phase 1: Now supports repository injection for future database persistence
 * Maps to InsightStatus enum values and workflow requirements
 */
export const insightStateMachine = createMachine(
  {
    id: 'insight',
    initial: InsightStatus.DRAFT,
    types: {
      context: {} as InsightStateMachineContext,
      events: {} as InsightStateMachineEvent,
    },
    context: ({ input }: { input?: Partial<InsightStateMachineContext> }) => ({
      insightId: input?.insightId || '',
      transcriptId: input?.transcriptId || '',
      reviewedBy: input?.reviewedBy || null,
      rejectionReason: input?.rejectionReason || null,
      approvedBy: input?.approvedBy || null,
      score: input?.score || null,
      failureReason: input?.failureReason || null,
      archivedReason: input?.archivedReason || null,
      retryCount: input?.retryCount || 0,
      repository: input?.repository,
      updatedEntity: input?.updatedEntity,
    }),
    states: {
      [InsightStatus.DRAFT]: {
        on: {
          SUBMIT_FOR_REVIEW: InsightStatus.NEEDS_REVIEW,
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: 'archiveInsight'
          },
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.NEEDS_REVIEW]: {
        on: {
          APPROVE: {
            target: InsightStatus.APPROVED,
            actions: 'approveInsight'
          },
          REJECT: {
            target: InsightStatus.REJECTED,
            actions: 'rejectInsight'
          },
          EDIT: InsightStatus.DRAFT,
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: 'archiveInsight'
          },
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.APPROVED]: {
        on: {
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: 'archiveInsight'
          },
          // Approved insights can trigger post generation, but don't transition state
          // The post generation is handled by event listeners
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.REJECTED]: {
        on: {
          EDIT: InsightStatus.DRAFT,
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: 'archiveInsight'
          },
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.ARCHIVED]: {
        on: {
          RESTORE: InsightStatus.DRAFT,
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.FAILED]: {
        on: {
          RETRY: {
            target: InsightStatus.DRAFT,
            guard: 'canRetry'
          },
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: 'archiveInsight'
          },
          DELETE: 'deleted'
        }
      },
      
      // Terminal state for deleted insights
      deleted: {
        type: 'final'
      }
    }
  },
  {
    actions: {
      approveInsight: assign({
        approvedBy: ({ context, event }) => (event as any).approvedBy || 'system',
        score: ({ context, event }) => (event as any).score || null,
        reviewedBy: null,
        rejectionReason: null,
        failureReason: null
      }),
      
      rejectInsight: assign({
        reviewedBy: ({ context, event }) => (event as any).reviewedBy || 'system',
        rejectionReason: ({ context, event }) => (event as any).reason || 'Rejected during review',
        approvedBy: null,
        score: null
      }),
      
      archiveInsight: assign({
        archivedReason: ({ context, event }) => {
          const baseReason = (event as any).reason || 'Insight archived';
          const stateContext = context.approvedBy ? ' (was approved)' : 
                              context.reviewedBy ? ' (was rejected)' : 
                              context.failureReason ? ' (had failed)' : '';
          return baseReason + stateContext;
        }
      }),
      
      markFailed: assign({
        failureReason: ({ context, event }) => (event as any).reason || 'Processing failed',
        retryCount: ({ context }) => context.retryCount + 1
      }),
      
      clearFailure: assign({
        failureReason: null
      })
    },
    
    guards: {
      canRetry: ({ context }) => context.retryCount < 3
    }
  }
);

/**
 * Type-safe state values that correspond to InsightStatus enum
 */
export type InsightStateMachineState = 
  | InsightStatus.DRAFT
  | InsightStatus.NEEDS_REVIEW
  | InsightStatus.APPROVED
  | InsightStatus.REJECTED
  | InsightStatus.ARCHIVED
  | InsightStatus.FAILED
  | 'deleted';

/**
 * Helper function to get available transitions from current state
 */
export function getAvailableTransitions(currentState: string): string[] {
  // In XState v5, we need to check available events by testing each event type
  // This is a simplified approach that checks the machine definition directly
  const stateConfig = insightStateMachine.config.states?.[currentState as any];
  if (!stateConfig || !stateConfig.on) {
    return [];
  }
  
  return Object.keys(stateConfig.on);
}

/**
 * Helper function to check if a transition is valid from current state
 */
export function canTransition(currentState: string, eventType: string): boolean {
  const state = insightStateMachine.resolveState({ 
    value: currentState,
    context: {
      insightId: '',
      transcriptId: '',
      reviewedBy: null,
      rejectionReason: null,
      approvedBy: null,
      score: null,
      failureReason: null,
      archivedReason: null,
      retryCount: 0,
      repository: undefined,
      updatedEntity: undefined,
    }
  });
  return state.can({ type: eventType } as InsightStateMachineEvent);
}