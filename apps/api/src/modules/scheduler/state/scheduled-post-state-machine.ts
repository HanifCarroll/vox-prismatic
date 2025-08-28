import { createMachine, assign } from 'xstate';

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
 * Context data for the scheduled post state machine
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
    context: {
      scheduledPostId: '',
      postId: '',
      platform: 'linkedin' as const,
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
    },
    states: {
      [ScheduledPostStatus.PENDING]: {
        always: [
          {
            target: ScheduledPostStatus.EXPIRED,
            guard: 'isExpired',
            actions: 'markExpired'
          }
        ],
        on: {
          TIME_REACHED: {
            target: ScheduledPostStatus.QUEUED,
            guard: 'isTimeToPublish'
          },
          QUEUE_FOR_PUBLISHING: {
            target: ScheduledPostStatus.QUEUED,
            actions: 'setQueueJobId'
          },
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: 'markCancelled'
          }
        }
      },

      [ScheduledPostStatus.QUEUED]: {
        always: [
          {
            target: ScheduledPostStatus.EXPIRED,
            guard: 'isExpired',
            actions: 'markExpired'
          }
        ],
        on: {
          START_PUBLISHING: {
            target: ScheduledPostStatus.PUBLISHING,
            actions: 'recordPublishingAttempt'
          },
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: 'markCancelled'
          }
        }
      },

      [ScheduledPostStatus.PUBLISHING]: {
        on: {
          PUBLISH_SUCCESS: {
            target: ScheduledPostStatus.PUBLISHED,
            actions: 'recordPublishSuccess'
          },
          PUBLISH_FAILED: {
            target: ScheduledPostStatus.FAILED,
            actions: 'recordPublishFailure'
          },
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: 'markCancelled'
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
            actions: 'markExpired'
          }
        ],
        on: {
          RETRY: {
            target: ScheduledPostStatus.RETRYING,
            guard: 'canRetry',
            actions: 'incrementRetryCount'
          },
          MAX_RETRIES_EXCEEDED: {
            target: ScheduledPostStatus.EXPIRED,
            actions: 'markExpiredDueToRetries'
          },
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: 'markCancelled'
          }
        }
      },

      [ScheduledPostStatus.RETRYING]: {
        after: {
          RETRY_DELAY: {
            target: ScheduledPostStatus.QUEUED,
            actions: 'clearLastAttempt'
          }
        },
        on: {
          CANCEL: {
            target: ScheduledPostStatus.CANCELLED,
            actions: 'markCancelled'
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
      })
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