import { createMachine, assign } from 'xstate';
import { PostStatus } from '../dto/update-post.dto';
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
          SUBMIT_FOR_REVIEW: PostStatus.NEEDS_REVIEW,
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: 'archivePost'
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.NEEDS_REVIEW]: {
        on: {
          APPROVE: {
            target: PostStatus.APPROVED,
            actions: 'approvePost'
          },
          REJECT: {
            target: PostStatus.REJECTED,
            actions: 'rejectPost'
          },
          EDIT: PostStatus.DRAFT,
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: 'archivePost'
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.APPROVED]: {
        on: {
          SCHEDULE: {
            target: PostStatus.SCHEDULED,
            actions: 'schedulePost'
          },
          EDIT: PostStatus.NEEDS_REVIEW,
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: 'archivePost'
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.REJECTED]: {
        on: {
          EDIT: PostStatus.DRAFT,
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: 'archivePost'
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.SCHEDULED]: {
        on: {
          PUBLISH_SUCCESS: {
            target: PostStatus.PUBLISHED,
            actions: 'clearError'
          },
          PUBLISH_FAILED: {
            target: PostStatus.FAILED,
            actions: 'recordFailure'
          },
          UNSCHEDULE: PostStatus.APPROVED,
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: 'archivePost'
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.PUBLISHED]: {
        on: {
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: 'archivePost'
          }
        }
      },
      
      [PostStatus.FAILED]: {
        on: {
          RETRY: {
            target: PostStatus.SCHEDULED,
            guard: 'canRetry'
          },
          UNSCHEDULE: PostStatus.APPROVED,
          ARCHIVE: {
            target: PostStatus.ARCHIVED,
            actions: 'archivePost'
          },
          DELETE: 'deleted'
        }
      },
      
      [PostStatus.ARCHIVED]: {
        on: {
          EDIT: PostStatus.DRAFT,
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
      })
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