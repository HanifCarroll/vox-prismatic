import { createActor } from 'xstate';
import { 
  scheduledPostStateMachine,
  canTransition,
  getAvailableTransitions,
  canRetryPost,
  getRetryDelay 
} from './scheduled-post-state-machine';
import { ScheduledPostStatus } from '@content-creation/types';

describe('ScheduledPostStateMachine', () => {
  describe('State Transitions', () => {
    it('should transition from PENDING to QUEUED when time is reached', () => {
      const actor = createActor(scheduledPostStateMachine, {
        input: {
          scheduledPostId: 'test-1',
          postId: 'post-1',
          platform: 'linkedin',
          scheduledTime: new Date(Date.now() - 1000), // Past time
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

      actor.start();
      expect(actor.getSnapshot().value).toBe(ScheduledPostStatus.PENDING);

      actor.send({ type: 'TIME_REACHED' });
      expect(actor.getSnapshot().value).toBe(ScheduledPostStatus.QUEUED);
    });

    it('should transition from QUEUED to PUBLISHING when publishing starts', () => {
      const actor = createActor(scheduledPostStateMachine, {
        input: {
          scheduledPostId: 'test-2',
          postId: 'post-2',
          platform: 'x',
          scheduledTime: new Date(),
          externalPostId: null,
          retryCount: 0,
          maxRetries: 5,
          lastError: null,
          publishedAt: null,
          queueJobId: 'job-123',
          lastAttemptAt: null,
          cancelledAt: null,
          expiredAt: null,
          cancelReason: null
        }
      });

      actor.start();
      actor.send({ type: 'QUEUE_FOR_PUBLISHING', queueJobId: 'job-123' });
      expect(actor.getSnapshot().value).toBe(ScheduledPostStatus.QUEUED);

      actor.send({ type: 'START_PUBLISHING' });
      expect(actor.getSnapshot().value).toBe(ScheduledPostStatus.PUBLISHING);
    });

    it('should transition from PUBLISHING to PUBLISHED on success', () => {
      const actor = createActor(scheduledPostStateMachine, {
        input: {
          scheduledPostId: 'test-3',
          postId: 'post-3',
          platform: 'linkedin',
          scheduledTime: new Date(),
          externalPostId: null,
          retryCount: 0,
          maxRetries: 3,
          lastError: null,
          publishedAt: null,
          queueJobId: 'job-456',
          lastAttemptAt: null,
          cancelledAt: null,
          expiredAt: null,
          cancelReason: null
        }
      });

      actor.start();
      actor.send({ type: 'QUEUE_FOR_PUBLISHING', queueJobId: 'job-456' });
      actor.send({ type: 'START_PUBLISHING' });
      actor.send({ type: 'PUBLISH_SUCCESS', externalPostId: 'ext-123' });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe(ScheduledPostStatus.PUBLISHED);
      expect(snapshot.context.externalPostId).toBe('ext-123');
      expect(snapshot.context.publishedAt).toBeDefined();
    });

    it('should transition from PUBLISHING to FAILED on error', () => {
      const actor = createActor(scheduledPostStateMachine, {
        input: {
          scheduledPostId: 'test-4',
          postId: 'post-4',
          platform: 'x',
          scheduledTime: new Date(),
          externalPostId: null,
          retryCount: 0,
          maxRetries: 5,
          lastError: null,
          publishedAt: null,
          queueJobId: 'job-789',
          lastAttemptAt: null,
          cancelledAt: null,
          expiredAt: null,
          cancelReason: null
        }
      });

      actor.start();
      actor.send({ type: 'QUEUE_FOR_PUBLISHING', queueJobId: 'job-789' });
      actor.send({ type: 'START_PUBLISHING' });
      actor.send({ type: 'PUBLISH_FAILED', error: 'Network error' });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe(ScheduledPostStatus.FAILED);
      expect(snapshot.context.lastError).toBe('Network error');
    });

    it('should allow retry from FAILED state if under max retries', () => {
      const actor = createActor(scheduledPostStateMachine, {
        input: {
          scheduledPostId: 'test-5',
          postId: 'post-5',
          platform: 'linkedin',
          scheduledTime: new Date(),
          externalPostId: null,
          retryCount: 1,
          maxRetries: 3,
          lastError: 'Previous error',
          publishedAt: null,
          queueJobId: 'job-999',
          lastAttemptAt: null,
          cancelledAt: null,
          expiredAt: null,
          cancelReason: null
        }
      });

      actor.start();
      
      // Force into FAILED state
      actor.send({ type: 'QUEUE_FOR_PUBLISHING', queueJobId: 'job-999' });
      actor.send({ type: 'START_PUBLISHING' });
      actor.send({ type: 'PUBLISH_FAILED', error: 'Another error' });
      
      // Try to retry
      actor.send({ type: 'RETRY' });
      expect(actor.getSnapshot().value).toBe(ScheduledPostStatus.RETRYING);
      expect(actor.getSnapshot().context.retryCount).toBe(1);
    });

    it('should transition to CANCELLED from any non-final state', () => {
      const states = [
        ScheduledPostStatus.PENDING,
        ScheduledPostStatus.QUEUED,
        ScheduledPostStatus.PUBLISHING,
        ScheduledPostStatus.FAILED,
        ScheduledPostStatus.RETRYING
      ];

      states.forEach(state => {
        const actor = createActor(scheduledPostStateMachine, {
          input: {
            scheduledPostId: `test-cancel-${state}`,
            postId: 'post-cancel',
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

        actor.start();
        
        // Set initial state (simplified for test)
        if (state !== ScheduledPostStatus.PENDING) {
          actor.send({ type: 'QUEUE_FOR_PUBLISHING', queueJobId: 'test-job' });
        }
        
        if (state === ScheduledPostStatus.PUBLISHING) {
          actor.send({ type: 'START_PUBLISHING' });
        }
        
        if (state === ScheduledPostStatus.FAILED) {
          actor.send({ type: 'START_PUBLISHING' });
          actor.send({ type: 'PUBLISH_FAILED', error: 'Test error' });
        }

        // Cancel should work from current state
        actor.send({ type: 'CANCEL', reason: 'Test cancellation' });
        
        const snapshot = actor.getSnapshot();
        expect(snapshot.value).toBe(ScheduledPostStatus.CANCELLED);
        expect(snapshot.context.cancelReason).toBe('Test cancellation');
      });
    });
  });

  describe('Helper Functions', () => {
    it('should correctly identify available transitions', () => {
      const pendingTransitions = getAvailableTransitions(ScheduledPostStatus.PENDING);
      expect(pendingTransitions).toContain('TIME_REACHED');
      expect(pendingTransitions).toContain('QUEUE_FOR_PUBLISHING');
      expect(pendingTransitions).toContain('CANCEL');

      const publishingTransitions = getAvailableTransitions(ScheduledPostStatus.PUBLISHING);
      expect(publishingTransitions).toContain('PUBLISH_SUCCESS');
      expect(publishingTransitions).toContain('PUBLISH_FAILED');
      expect(publishingTransitions).toContain('CANCEL');
    });

    it('should validate transitions correctly', () => {
      expect(canTransition(ScheduledPostStatus.PENDING, 'TIME_REACHED')).toBe(true);
      expect(canTransition(ScheduledPostStatus.PENDING, 'PUBLISH_SUCCESS')).toBe(false);
      
      expect(canTransition(ScheduledPostStatus.PUBLISHING, 'PUBLISH_SUCCESS')).toBe(true);
      expect(canTransition(ScheduledPostStatus.PUBLISHING, 'TIME_REACHED')).toBe(false);
      
      expect(canTransition(ScheduledPostStatus.PUBLISHED, 'CANCEL')).toBe(false);
    });

    it('should calculate retry delays correctly for LinkedIn', () => {
      expect(getRetryDelay('linkedin', 0)).toBe(60000);   // 1 min
      expect(getRetryDelay('linkedin', 1)).toBe(300000);  // 5 min
      expect(getRetryDelay('linkedin', 2)).toBe(900000);  // 15 min
      expect(getRetryDelay('linkedin', 10)).toBe(900000); // Max delay
    });

    it('should calculate retry delays correctly for X', () => {
      expect(getRetryDelay('x', 0)).toBe(60000);   // 1 min
      expect(getRetryDelay('x', 1)).toBe(180000);  // 3 min
      expect(getRetryDelay('x', 2)).toBe(300000);  // 5 min
      expect(getRetryDelay('x', 3)).toBe(600000);  // 10 min
      expect(getRetryDelay('x', 4)).toBe(900000);  // 15 min
      expect(getRetryDelay('x', 10)).toBe(900000); // Max delay
    });

    it('should determine retry eligibility correctly', () => {
      // LinkedIn: max 3 retries
      expect(canRetryPost('linkedin', 0)).toBe(true);
      expect(canRetryPost('linkedin', 2)).toBe(true);
      expect(canRetryPost('linkedin', 3)).toBe(false);
      
      // X: max 5 retries
      expect(canRetryPost('x', 0)).toBe(true);
      expect(canRetryPost('x', 4)).toBe(true);
      expect(canRetryPost('x', 5)).toBe(false);
    });
  });

  describe('Expiration Logic', () => {
    it('should expire posts older than 24 hours', () => {
      const oldScheduledTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      const actor = createActor(scheduledPostStateMachine, {
        input: {
          scheduledPostId: 'test-expire',
          postId: 'post-expire',
          platform: 'linkedin',
          scheduledTime: oldScheduledTime,
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

      actor.start();
      // Should automatically transition to EXPIRED
      expect(actor.getSnapshot().value).toBe(ScheduledPostStatus.EXPIRED);
    });

    it('should not expire posts within 24 hours', () => {
      const recentScheduledTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      
      const actor = createActor(scheduledPostStateMachine, {
        input: {
          scheduledPostId: 'test-not-expire',
          postId: 'post-not-expire',
          platform: 'x',
          scheduledTime: recentScheduledTime,
          externalPostId: null,
          retryCount: 0,
          maxRetries: 5,
          lastError: null,
          publishedAt: null,
          queueJobId: null,
          lastAttemptAt: null,
          cancelledAt: null,
          expiredAt: null,
          cancelReason: null
        }
      });

      actor.start();
      // Should remain in PENDING state
      expect(actor.getSnapshot().value).toBe(ScheduledPostStatus.PENDING);
    });
  });
});