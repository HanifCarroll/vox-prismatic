import { createMachine, assign } from 'xstate';
import { PostStatus } from '@content-creation/types';
import { PostRepository } from '../post.repository';
import { PostEntity } from '../entities/post.entity';

/**
 * Enhanced context data for the post state machine
 * Phase 1: Now includes repository for database persistence and updated entity storage
 */
export interface PostStateMachineContext {
  postId: string;
  platform: string;
  retryCount: number;
  lastError: string | null;
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectedReason: string | null;
  scheduledTime: Date | null;
  archivedReason: string | null;
  // Phase 1: Repository injection support
  repository?: PostRepository;
  updatedEntity?: PostEntity;
}

/**
 * Events that can trigger state transitions
 */
export type PostStateMachineEvent =
  | { type: 'SUBMIT_FOR_REVIEW' }
  | { type: 'APPROVE'; approvedBy?: string }
  | { type: 'REJECT'; rejectedBy?: string; reason?: string }
  | { type: 'ARCHIVE'; reason?: string }
  | { type: 'EDIT' }
  | { type: 'SCHEDULE'; scheduledTime: Date; platform: string }
  | { type: 'UNSCHEDULE' }
  | { type: 'PUBLISH_SUCCESS'; externalPostId: string }
  | { type: 'PUBLISH_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'DELETE' };

/**
 * Enhanced post state machine definition following XState best practices
 * Phase 1: Now supports repository injection for future database persistence
 * Maps to PostStatus enum values and workflow requirements
 */
export const postStateMachine = createMachine(
  {
    id: 'post',
    initial: PostStatus.DRAFT,
    types: {
      context: {} as PostStateMachineContext,
      events: {} as PostStateMachineEvent,
    },
    context: ({ input }: { input?: Partial<PostStateMachineContext> }) => ({
      postId: input?.postId || '',
      platform: input?.platform || '',
      retryCount: input?.retryCount || 0,
      lastError: input?.lastError || null,
      approvedBy: input?.approvedBy || null,
      rejectedBy: input?.rejectedBy || null,
      rejectedReason: input?.rejectedReason || null,
      scheduledTime: input?.scheduledTime || null,
      archivedReason: input?.archivedReason || null,
      repository: input?.repository,
      updatedEntity: input?.updatedEntity,
    }),
    states: {
      [PostStatus.DRAFT]: {
        on: {
          SUBMIT_FOR_REVIEW: {
            target: PostStatus.NEEDS_REVIEW,
            actions: 'persistSubmitForReview'
          },
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: ['archivePost', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.NEEDS_REVIEW]: {
        on: {
          APPROVE: {
            target: PostStatus.APPROVED,
            actions: ['approvePost', 'persistApproval']
          },
          REJECT: {
            target: PostStatus.REJECTED,
            actions: ['rejectPost', 'persistRejection']
          },
          EDIT: {
            target: PostStatus.DRAFT,
            actions: 'persistEdit'
          },
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: ['archivePost', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.APPROVED]: {
        on: {
          SCHEDULE: {
            target: PostStatus.SCHEDULED,
            actions: ['schedulePost', 'persistScheduling']
          },
          EDIT: {
            target: PostStatus.NEEDS_REVIEW,
            actions: 'persistSubmitForReview'
          },
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: ['archivePost', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.REJECTED]: {
        on: {
          EDIT: {
            target: PostStatus.DRAFT,
            actions: 'persistEdit'
          },
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: ['archivePost', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.SCHEDULED]: {
        on: {
          PUBLISH_SUCCESS: {
            target: PostStatus.PUBLISHED,
            actions: ['clearError', 'persistPublishSuccess']
          },
          PUBLISH_FAILED: {
            target: PostStatus.FAILED,
            actions: ['recordFailure', 'persistPublishFailed']
          },
          UNSCHEDULE: {
            target: PostStatus.APPROVED,
            actions: 'persistUnschedule'
          },
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: ['archivePost', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.PUBLISHED]: {
        on: {
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: ['archivePost', 'persistArchiving']
          }
        }
      },
      
      [PostStatus.FAILED]: {
        on: {
          RETRY: {
            target: PostStatus.SCHEDULED,
            guard: 'canRetry',
            actions: 'persistRetry'
          },
          UNSCHEDULE: {
            target: PostStatus.APPROVED,
            actions: 'persistUnschedule'
          },
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: ['archivePost', 'persistArchiving']
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.ARCHIVED]: {
        on: {
          EDIT: {
            target: PostStatus.DRAFT,
            actions: 'persistEdit'
          },
          DELETE: 'deleted'
        }
      },
      
      // Terminal state for deleted posts
      deleted: {
        type: 'final'
      }
    }
  },
  {
    actions: {
      approvePost: assign({
        approvedBy: ({ context, event }) => (event as any).approvedBy || 'system',
        rejectedBy: null,
        rejectedReason: null
      }),
      
      rejectPost: assign({
        rejectedBy: ({ context, event }) => (event as any).rejectedBy || 'system',
        rejectedReason: ({ context, event }) => (event as any).reason || 'Rejected during review',
        approvedBy: null
      }),
      
      schedulePost: assign({
        scheduledTime: ({ context, event }) => (event as any).scheduledTime,
        platform: ({ context, event }) => (event as any).platform
      }),
      
      recordFailure: assign({
        lastError: ({ context, event }) => (event as any).error,
        retryCount: ({ context }) => context.retryCount + 1
      }),
      
      clearError: assign({
        lastError: null
      }),
      
      archivePost: assign({
        archivedReason: ({ context, event }) => {
          const baseReason = (event as any).reason || 'Post archived';
          const stateContext = context.approvedBy ? ' (was approved)' : 
                              context.rejectedBy ? ' (was rejected)' : '';
          return baseReason + stateContext;
        }
      }),

      // Phase 2: Database persistence actions
      persistSubmitForReview: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          // Update post status to NEEDS_REVIEW
          const updated = await context.repository.update(context.postId, {
            updatedAt: new Date()
          });

          // Update status directly via Prisma (bypassing DTO restrictions)
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.NEEDS_REVIEW }
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
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          const approveEvent = event as Extract<PostStateMachineEvent, { type: 'APPROVE' }>;
          
          // Update post with approval data
          const updated = await context.repository.update(context.postId, {
            approvedBy: approveEvent.approvedBy || 'system',
            approvedAt: new Date(),
            rejectedBy: null,
            rejectedAt: null,
            rejectedReason: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.APPROVED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist approval:', error);
          throw error;
        }
      },

      persistRejection: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          const rejectEvent = event as Extract<PostStateMachineEvent, { type: 'REJECT' }>;
          
          // Update post with rejection data
          const updated = await context.repository.update(context.postId, {
            rejectedBy: rejectEvent.rejectedBy || 'system',
            rejectedAt: new Date(),
            rejectedReason: rejectEvent.reason || 'Rejected during review',
            approvedBy: null,
            approvedAt: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.REJECTED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist rejection:', error);
          throw error;
        }
      },

      persistScheduling: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          // Update post to scheduled status
          const updated = await context.repository.update(context.postId, {
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.SCHEDULED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist scheduling:', error);
          throw error;
        }
      },

      persistUnschedule: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          // Update post back to approved status
          const updated = await context.repository.update(context.postId, {
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.APPROVED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist unschedule:', error);
          throw error;
        }
      },

      persistPublishSuccess: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          // Update post to published status
          const updated = await context.repository.update(context.postId, {
            errorMessage: null,
            failedAt: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.PUBLISHED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist publish success:', error);
          throw error;
        }
      },

      persistPublishFailed: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          const failEvent = event as Extract<PostStateMachineEvent, { type: 'PUBLISH_FAILED' }>;
          
          // Update post with failure data
          const updated = await context.repository.update(context.postId, {
            errorMessage: failEvent.error,
            failedAt: new Date(),
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.FAILED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist publish failure:', error);
          throw error;
        }
      },

      persistArchiving: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          const archiveEvent = event as Extract<PostStateMachineEvent, { type: 'ARCHIVE' }>;
          const baseReason = archiveEvent.reason || 'Post archived';
          const stateContext = context.approvedBy ? ' (was approved)' : 
                              context.rejectedBy ? ' (was rejected)' : '';
          
          // Update post with archive data
          const updated = await context.repository.update(context.postId, {
            archivedReason: baseReason + stateContext,
            archivedAt: new Date(),
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.ARCHIVED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist archiving:', error);
          throw error;
        }
      },

      persistEdit: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          // Reset to draft status and clear approval/rejection data
          const updated = await context.repository.update(context.postId, {
            approvedBy: null,
            approvedAt: null,
            rejectedBy: null,
            rejectedAt: null,
            rejectedReason: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.DRAFT }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist edit:', error);
          throw error;
        }
      },

      persistRetry: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into post state machine');
          return;
        }

        try {
          // Clear error data and reset to scheduled
          const updated = await context.repository.update(context.postId, {
            errorMessage: null,
            failedAt: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.post.update({
            where: { id: context.postId },
            data: { status: PostStatus.SCHEDULED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist retry:', error);
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
 * Type-safe state values that correspond to PostStatus enum
 */
export type PostStateMachineState = 
  | PostStatus.DRAFT
  | PostStatus.NEEDS_REVIEW
  | PostStatus.APPROVED
  | PostStatus.REJECTED
  | PostStatus.SCHEDULED
  | PostStatus.PUBLISHED
  | PostStatus.FAILED
  | PostStatus.ARCHIVED
  | 'deleted';

/**
 * Helper function to get available transitions from current state
 */
export function getAvailableTransitions(currentState: string): string[] {
  // In XState v5, we need to check available events by testing each event type
  // This is a simplified approach that checks the machine definition directly
  const stateConfig = postStateMachine.config.states?.[currentState as any];
  if (!stateConfig || !stateConfig.on) {
    return [];
  }
  
  return Object.keys(stateConfig.on);
}

/**
 * Helper function to check if a transition is valid from current state
 */
export function canTransition(currentState: string, eventType: string): boolean {
  const state = postStateMachine.resolveState({ 
    value: currentState,
    context: {
      postId: '',
      platform: '',
      retryCount: 0,
      lastError: null,
      approvedBy: null,
      rejectedBy: null,
      rejectedReason: null,
      scheduledTime: null,
      archivedReason: null,
      repository: undefined,
      updatedEntity: undefined,
    }
  });
  return state.can({ type: eventType } as PostStateMachineEvent);
}