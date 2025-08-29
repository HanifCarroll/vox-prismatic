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
          SUBMIT_FOR_REVIEW: {
            target: InsightStatus.NEEDS_REVIEW,
            actions: 'persistSubmitForReview'
          },
          MARK_FAILED: {
            target: InsightStatus.FAILED,
            actions: ['markFailed', 'persistFailure']
          },
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: ['archiveInsight', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.NEEDS_REVIEW]: {
        on: {
          APPROVE: {
            target: InsightStatus.APPROVED,
            actions: ['approveInsight', 'persistApproval']
          },
          REJECT: {
            target: InsightStatus.REJECTED,
            actions: ['rejectInsight', 'persistRejection']
          },
          EDIT: {
            target: InsightStatus.DRAFT,
            actions: 'persistEdit'
          },
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: ['archiveInsight', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.APPROVED]: {
        on: {
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: ['archiveInsight', 'persistArchiving']
          },
          // Approved insights can trigger post generation, but don't transition state
          // The post generation is handled by event listeners
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.REJECTED]: {
        on: {
          EDIT: {
            target: InsightStatus.DRAFT,
            actions: 'persistEdit'
          },
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: ['archiveInsight', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.ARCHIVED]: {
        on: {
          RESTORE: {
            target: InsightStatus.DRAFT,
            actions: 'persistRestore'
          },
          DELETE: 'deleted'
        }
      },
      
      [InsightStatus.FAILED]: {
        on: {
          RETRY: {
            target: InsightStatus.DRAFT,
            guard: 'canRetry',
            actions: ['clearFailure', 'persistEdit']
          },
          ARCHIVE: {
            target: InsightStatus.ARCHIVED,
            actions: ['archiveInsight', 'persistArchiving']
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
      }),

      // Phase 2: Database persistence actions
      persistSubmitForReview: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into insight state machine');
          return;
        }

        try {
          // Update insight status to NEEDS_REVIEW
          const updated = await context.repository.update(context.insightId, {
            updatedAt: new Date()
          });

          // Update status directly via Prisma (bypassing DTO restrictions)
          const statusUpdated = await (context.repository as any).prisma.insight.update({
            where: { id: context.insightId },
            data: { status: InsightStatus.NEEDS_REVIEW }
          });

          // Store updated entity in context for service to return
          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist submit for review:', error);
          throw error;
        }
      },

      persistApproval: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into insight state machine');
          return;
        }

        try {
          const approveEvent = event as Extract<InsightStateMachineEvent, { type: 'APPROVE' }>;
          
          // Update insight with approval data
          const updated = await context.repository.update(context.insightId, {
            approvedBy: approveEvent.approvedBy || 'system',
            approvedAt: new Date(),
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.insight.update({
            where: { id: context.insightId },
            data: { status: InsightStatus.APPROVED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist approval:', error);
          throw error;
        }
      },

      persistRejection: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into insight state machine');
          return;
        }

        try {
          const rejectEvent = event as Extract<InsightStateMachineEvent, { type: 'REJECT' }>;
          
          // Update insight with rejection data
          const updated = await context.repository.update(context.insightId, {
            reviewedBy: rejectEvent.reviewedBy || 'system',
            reviewedAt: new Date(),
            rejectionReason: rejectEvent.reason || 'Rejected during review',
            approvedBy: null,
            approvedAt: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.insight.update({
            where: { id: context.insightId },
            data: { status: InsightStatus.REJECTED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist rejection:', error);
          throw error;
        }
      },

      persistArchiving: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into insight state machine');
          return;
        }

        try {
          const archiveEvent = event as Extract<InsightStateMachineEvent, { type: 'ARCHIVE' }>;
          const baseReason = archiveEvent.reason || 'Insight archived';
          const stateContext = context.approvedBy ? ' (was approved)' : 
                              context.reviewedBy ? ' (was rejected)' : 
                              context.failureReason ? ' (had failed)' : '';
          
          // Update insight with archive data
          const updated = await context.repository.update(context.insightId, {
            archivedBy: 'system', // Could be passed via event if needed
            archivedReason: baseReason + stateContext,
            archivedAt: new Date(),
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.insight.update({
            where: { id: context.insightId },
            data: { status: InsightStatus.ARCHIVED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist archiving:', error);
          throw error;
        }
      },

      persistEdit: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into insight state machine');
          return;
        }

        try {
          // Reset to draft status and clear approval/rejection data
          const updated = await context.repository.update(context.insightId, {
            approvedBy: null,
            approvedAt: null,
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.insight.update({
            where: { id: context.insightId },
            data: { status: InsightStatus.DRAFT }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist edit:', error);
          throw error;
        }
      },

      persistRestore: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into insight state machine');
          return;
        }

        try {
          // Clear archived data and reset to draft
          const updated = await context.repository.update(context.insightId, {
            archivedBy: null,
            archivedAt: null,
            archivedReason: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.insight.update({
            where: { id: context.insightId },
            data: { status: InsightStatus.DRAFT }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist restore:', error);
          throw error;
        }
      },

      persistFailure: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into insight state machine');
          return;
        }

        try {
          const failEvent = event as Extract<InsightStateMachineEvent, { type: 'MARK_FAILED' }>;
          
          // Update insight with failure data
          const updated = await context.repository.update(context.insightId, {
            failureReason: failEvent.reason || 'Processing failed',
            failedAt: new Date(),
            retryCount: context.retryCount + 1,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.insight.update({
            where: { id: context.insightId },
            data: { status: InsightStatus.FAILED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist failure:', error);
          throw error;
        }
      }
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