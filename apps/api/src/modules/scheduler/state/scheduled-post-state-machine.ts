import { createMachine, assign } from 'xstate';
import { ScheduledPostRepository } from '../scheduled-post.repository';
import { ScheduledPostEntity } from '../entities/scheduled-post.entity';

/**
 * States for the ScheduledPost lifecycle
 */
export enum ScheduledPostStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

/**
 * Enhanced context data for the scheduled post state machine
 * Phase 1: Now includes repository for database persistence and updated entity storage
 */
export interface ScheduledPostStateMachineContext {
  scheduledPostId: string;
  postId: string;
  platform: 'linkedin' | 'x';
  scheduledTime: Date;
  externalPostId: string | null;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  publishedAt: Date | null;
  queueJobId: string | null;
  lastAttemptAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  cancelReason: string | null;
  // Phase 1: Repository injection support
  repository?: ScheduledPostRepository;
  updatedEntity?: ScheduledPostEntity;
}

/**
 * Events that can trigger state transitions
 */
export type ScheduledPostStateMachineEvent =
  | { type: 'TIME_REACHED' }
  | { type: 'QUEUE_FOR_PUBLISHING'; queueJobId: string }
  | { type: 'START_PUBLISHING' }
  | { type: 'PUBLISH_SUCCESS'; externalPostId: string }
  | { type: 'PUBLISH_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'CANCEL'; reason?: string }
  | { type: 'EXPIRE' }
  | { type: 'MAX_RETRIES_EXCEEDED' };

/**
 * Platform-specific retry configuration
 */
const PLATFORM_CONFIG = {
  linkedin: {
    maxRetries: 3,
    retryDelays: [60000, 300000, 900000] // 1min, 5min, 15min
  },
  x: {
    maxRetries: 5,
    retryDelays: [60000, 180000, 300000, 600000, 900000] // 1min, 3min, 5min, 10min, 15min
  }
};

/**
 * Scheduled post state machine definition
 * Manages the complete lifecycle of a scheduled social media post
 */
export const scheduledPostStateMachine = createMachine(
  {
    id: 'scheduledPost',
    initial: ScheduledPostStatus.PENDING,
    types: {
      context: {} as ScheduledPostStateMachineContext,
      events: {} as ScheduledPostStateMachineEvent,
    },
    context: ({ input }: { input?: Partial<ScheduledPostStateMachineContext> }) => ({
      scheduledPostId: input?.scheduledPostId || '',
      postId: input?.postId || '',
      platform: input?.platform || 'linkedin',
      scheduledTime: input?.scheduledTime || new Date(),
      externalPostId: input?.externalPostId || null,
      retryCount: input?.retryCount || 0,
      maxRetries: input?.maxRetries || 3,
      lastError: input?.lastError || null,
      publishedAt: input?.publishedAt || null,
      queueJobId: input?.queueJobId || null,
      lastAttemptAt: input?.lastAttemptAt || null,
      cancelledAt: input?.cancelledAt || null,
      expiredAt: input?.expiredAt || null,
      cancelReason: input?.cancelReason || null,
      repository: input?.repository,
      updatedEntity: input?.updatedEntity,
    }),
    states: {
      [ScheduledPostStatus.PENDING]: {
        always: [
          {
            target: ScheduledPostStatus.EXPIRED,
            guard: 'isExpired',
            actions: ['markExpired', 'persistExpiration']
          }
        ],
        on: {
          TIME_REACHED: {
            target: ScheduledPostStatus.QUEUED,
            guard: 'isTimeToPublish',
            actions: ['setQueueJobId', 'persistQueueing']
          },
          QUEUE_FOR_PUBLISHING: {
            target: ScheduledPostStatus.QUEUED,
            actions: ['setQueueJobId', 'persistQueueing']
          },
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: ['markCancelled', 'persistCancellation']
          }
        }
      },

      [ScheduledPostStatus.QUEUED]: {
        always: [
          {
            target: ScheduledPostStatus.EXPIRED,
            guard: 'isExpired',
            actions: ['markExpired', 'persistExpiration']
          }
        ],
        on: {
          START_PUBLISHING: {
            target: ScheduledPostStatus.PUBLISHING,
            actions: ['recordPublishingAttempt', 'persistPublishingStart']
          },
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: ['markCancelled', 'persistCancellation']
          }
        }
      },

      [ScheduledPostStatus.PUBLISHING]: {
        on: {
          PUBLISH_SUCCESS: {
            target: ScheduledPostStatus.PUBLISHED,
            actions: ['recordPublishSuccess', 'persistPublishSuccess']
          },
          PUBLISH_FAILED: {
            target: ScheduledPostStatus.FAILED,
            actions: ['recordPublishFailure', 'persistPublishFailure']
          },
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: ['markCancelled', 'persistCancellation']
          }
        }
      },

      [ScheduledPostStatus.PUBLISHED]: {
        type: 'final',
        entry: 'clearError'
      },

      [ScheduledPostStatus.FAILED]: {
        always: [
          {
            target: ScheduledPostStatus.EXPIRED,
            guard: 'isExpired',
            actions: ['markExpired', 'persistExpiration']
          }
        ],
        on: {
          RETRY: {
            target: ScheduledPostStatus.RETRYING,
            guard: 'canRetry',
            actions: ['incrementRetryCount', 'persistRetry']
          },
          MAX_RETRIES_EXCEEDED: {
            target: ScheduledPostStatus.EXPIRED,
            actions: ['markExpiredDueToRetries', 'persistExpiration']
          },
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: ['markCancelled', 'persistCancellation']
          }
        }
      },

      [ScheduledPostStatus.RETRYING]: {
        after: {
          RETRY_DELAY: {
            target: ScheduledPostStatus.QUEUED,
            actions: ['clearLastAttempt', 'persistQueueing']
          }
        },
        on: {
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: ['markCancelled', 'persistCancellation']
          }
        }
      },

      [ScheduledPostStatus.CANCELLED]: {
        type: 'final'
      },

      [ScheduledPostStatus.EXPIRED]: {
        type: 'final'
      }
    }
  },
  {
    actions: {
      setQueueJobId: assign({
        queueJobId: ({ context, event }) => (event as any).queueJobId
      }),

      recordPublishingAttempt: assign({
        lastAttemptAt: () => new Date()
      }),

      recordPublishSuccess: assign({
        externalPostId: ({ context, event }) => (event as any).externalPostId,
        publishedAt: () => new Date(),
        lastError: null
      }),

      recordPublishFailure: assign({
        lastError: ({ context, event }) => (event as any).error,
        lastAttemptAt: () => new Date()
      }),

      incrementRetryCount: assign({
        retryCount: ({ context }) => context.retryCount + 1
      }),

      clearLastAttempt: assign({
        lastAttemptAt: null
      }),

      clearError: assign({
        lastError: null
      }),

      markCancelled: assign({
        cancelledAt: () => new Date(),
        cancelReason: ({ context, event }) => (event as any).reason || 'Manually cancelled'
      }),

      markExpired: assign({
        expiredAt: () => new Date(),
        lastError: 'Scheduled time expired without successful publication'
      }),

      markExpiredDueToRetries: assign({
        expiredAt: () => new Date(),
        lastError: ({ context }) => `Max retries (${context.maxRetries}) exceeded`
      }),

      // Phase 2: Database persistence actions
      persistQueueing: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into scheduled post state machine');
          return;
        }

        try {
          const queueEvent = event as Extract<ScheduledPostStateMachineEvent, { type: 'TIME_REACHED' | 'QUEUE_FOR_PUBLISHING' }>;
          const queueJobId = (queueEvent as any).queueJobId || null;

          // Update scheduled post with queue information
          const updated = await context.repository.update(context.scheduledPostId, {
            queueJobId,
            updatedAt: new Date()
          });

          // Update status directly via Prisma (bypassing DTO restrictions)
          const statusUpdated = await (context.repository as any).prisma.scheduledPost.update({
            where: { id: context.scheduledPostId },
            data: { status: ScheduledPostStatus.QUEUED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist queueing:', error);
          throw error;
        }
      },

      persistPublishingStart: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into scheduled post state machine');
          return;
        }

        try {
          // Update scheduled post with publishing start
          const updated = await context.repository.update(context.scheduledPostId, {
            lastAttempt: new Date(),
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.scheduledPost.update({
            where: { id: context.scheduledPostId },
            data: { status: ScheduledPostStatus.PUBLISHING }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist publishing start:', error);
          throw error;
        }
      },

      persistPublishSuccess: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into scheduled post state machine');
          return;
        }

        try {
          const successEvent = event as Extract<ScheduledPostStateMachineEvent, { type: 'PUBLISH_SUCCESS' }>;
          
          // Update scheduled post with success data
          const updated = await context.repository.update(context.scheduledPostId, {
            externalPostId: successEvent.externalPostId,
            lastAttempt: new Date(),
            errorMessage: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.scheduledPost.update({
            where: { id: context.scheduledPostId },
            data: { status: ScheduledPostStatus.PUBLISHED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist publish success:', error);
          throw error;
        }
      },

      persistPublishFailure: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into scheduled post state machine');
          return;
        }

        try {
          const failEvent = event as Extract<ScheduledPostStateMachineEvent, { type: 'PUBLISH_FAILED' }>;
          
          // Update scheduled post with failure data
          const updated = await context.repository.update(context.scheduledPostId, {
            errorMessage: failEvent.error,
            lastAttempt: new Date(),
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.scheduledPost.update({
            where: { id: context.scheduledPostId },
            data: { status: ScheduledPostStatus.FAILED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist publish failure:', error);
          throw error;
        }
      },

      persistRetry: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into scheduled post state machine');
          return;
        }

        try {
          // Update scheduled post with retry data
          const updated = await context.repository.update(context.scheduledPostId, {
            retryCount: context.retryCount + 1,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.scheduledPost.update({
            where: { id: context.scheduledPostId },
            data: { status: ScheduledPostStatus.RETRYING }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist retry:', error);
          throw error;
        }
      },

      persistCancellation: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into scheduled post state machine');
          return;
        }

        try {
          const cancelEvent = event as Extract<ScheduledPostStateMachineEvent, { type: 'CANCEL' }>;
          
          // Update scheduled post with cancellation data
          const updated = await context.repository.update(context.scheduledPostId, {
            errorMessage: cancelEvent.reason || 'Manually cancelled',
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.scheduledPost.update({
            where: { id: context.scheduledPostId },
            data: { status: ScheduledPostStatus.CANCELLED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist cancellation:', error);
          throw error;
        }
      },

      persistExpiration: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into scheduled post state machine');
          return;
        }

        try {
          const errorMessage = context.retryCount >= context.maxRetries 
            ? `Max retries (${context.maxRetries}) exceeded`
            : 'Scheduled time expired without successful publication';
          
          // Update scheduled post with expiration data
          const updated = await context.repository.update(context.scheduledPostId, {
            errorMessage,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.scheduledPost.update({
            where: { id: context.scheduledPostId },
            data: { status: ScheduledPostStatus.EXPIRED }
          });

          context.updatedEntity = (context.repository as any).mapToEntity(statusUpdated);
        } catch (error) {
          console.error('Failed to persist expiration:', error);
          throw error;
        }
      }
    },

    guards: {
      isTimeToPublish: ({ context }) => {
        const now = new Date();
        return now >= context.scheduledTime;
      },

      canRetry: ({ context }) => {
        // Platform-specific retry logic
        const config = PLATFORM_CONFIG[context.platform];
        return context.retryCount < config.maxRetries;
      },

      isExpired: ({ context }) => {
        const now = new Date();
        const scheduledTime = new Date(context.scheduledTime);
        const expirationTime = new Date(scheduledTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        return now > expirationTime;
      }
    },

    delays: {
      RETRY_DELAY: ({ context }) => {
        // Platform-specific retry delay with exponential backoff
        const config = PLATFORM_CONFIG[context.platform];
        const delayIndex = Math.min(context.retryCount, config.retryDelays.length - 1);
        return config.retryDelays[delayIndex];
      }
    }
  }
);

/**
 * Type-safe state values
 */
export type ScheduledPostStateMachineState = 
  | ScheduledPostStatus.PENDING
  | ScheduledPostStatus.QUEUED
  | ScheduledPostStatus.PUBLISHING
  | ScheduledPostStatus.PUBLISHED
  | ScheduledPostStatus.FAILED
  | ScheduledPostStatus.RETRYING
  | ScheduledPostStatus.CANCELLED
  | ScheduledPostStatus.EXPIRED;

/**
 * Helper function to get available transitions from current state
 */
export function getAvailableTransitions(currentState: string): string[] {
  const stateConfig = scheduledPostStateMachine.config.states?.[currentState as any];
  if (!stateConfig || !stateConfig.on) {
    return [];
  }
  
  return Object.keys(stateConfig.on);
}

/**
 * Helper function to check if a transition is valid from current state
 */
export function canTransition(currentState: string, eventType: string): boolean {
  const state = scheduledPostStateMachine.resolveState({ 
    value: currentState,
    context: {
      scheduledPostId: '',
      postId: '',
      platform: 'linkedin',
      scheduledTime: new Date(),
      externalPostId: null,
      retryCount: 0,
      maxRetries: 3,
      lastError: null,
      publishedAt: null,
      queueJobId: null,
      lastAttemptAt: null,
      cancelledAt: null,
      expiredAt: null,
      cancelReason: null
    }
  });
  return state.can({ type: eventType } as ScheduledPostStateMachineEvent);
}

/**
 * Get retry delay for a specific platform and retry count
 */
export function getRetryDelay(platform: 'linkedin' | 'x', retryCount: number): number {
  const config = PLATFORM_CONFIG[platform];
  const delayIndex = Math.min(retryCount, config.retryDelays.length - 1);
  return config.retryDelays[delayIndex];
}

/**
 * Check if a scheduled post can be retried
 */
export function canRetryPost(platform: 'linkedin' | 'x', retryCount: number): boolean {
  const config = PLATFORM_CONFIG[platform];
  return retryCount < config.maxRetries;
}

/**
 * Get maximum retries for a platform
 */
export function getMaxRetries(platform: 'linkedin' | 'x'): number {
  return PLATFORM_CONFIG[platform].maxRetries;
}