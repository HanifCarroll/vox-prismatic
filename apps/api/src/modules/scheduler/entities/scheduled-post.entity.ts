/**
 * ScheduledPost Entity
 * Domain entity representing a scheduled social media post
 * Maps from Prisma model to domain object with proper typing
 */

import { SocialPlatform } from '../../common/types/xstate.types';
import { ScheduledPostStatus } from '../state/scheduled-post-state-machine';

export class ScheduledPostEntity {
  id: string;
  postId: string;
  platform: SocialPlatform;
  content: string;
  scheduledTime: Date;
  status: ScheduledPostStatus;
  retryCount: number;
  lastAttempt: Date | null;
  errorMessage: string | null;
  externalPostId: string | null;
  createdAt: Date;
  updatedAt: Date;
  queueJobId: string | null;

  constructor(data: {
    id: string;
    postId: string;
    platform: SocialPlatform;
    content: string;
    scheduledTime: Date;
    status: ScheduledPostStatus;
    retryCount: number;
    lastAttempt: Date | null;
    errorMessage: string | null;
    externalPostId: string | null;
    createdAt: Date;
    updatedAt: Date;
    queueJobId: string | null;
  }) {
    this.id = data.id;
    this.postId = data.postId;
    this.platform = data.platform;
    this.content = data.content;
    this.scheduledTime = data.scheduledTime;
    this.status = data.status;
    this.retryCount = data.retryCount;
    this.lastAttempt = data.lastAttempt;
    this.errorMessage = data.errorMessage;
    this.externalPostId = data.externalPostId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.queueJobId = data.queueJobId;
  }

  /**
   * Check if the scheduled post has expired (past its publication window)
   */
  isExpired(expirationHours: number = 24): boolean {
    const now = new Date();
    const expirationTime = new Date(this.scheduledTime.getTime() + expirationHours * 60 * 60 * 1000);
    return now > expirationTime;
  }

  /**
   * Check if the scheduled post can be retried based on platform-specific limits
   */
  canRetry(maxRetries: number): boolean {
    return this.retryCount < maxRetries;
  }

  /**
   * Get the platform-typed value for type-safe operations
   */
  getPlatform(): SocialPlatform {
    return this.platform;
  }

  /**
   * Check if the scheduled post is in a terminal state
   */
  isTerminal(): boolean {
    return [
      ScheduledPostStatus.PUBLISHED,
      ScheduledPostStatus.CANCELLED,
      ScheduledPostStatus.EXPIRED
    ].includes(this.status);
  }

  /**
   * Check if the scheduled post is in a failed state that might be retryable
   */
  isFailedButRetryable(): boolean {
    return this.status === ScheduledPostStatus.FAILED && this.errorMessage !== null;
  }

  /**
   * Get time until scheduled publication (negative if overdue)
   */
  getTimeUntilPublication(): number {
    return this.scheduledTime.getTime() - Date.now();
  }

  /**
   * Check if it's time to publish (within tolerance window)
   */
  isReadyToPublish(toleranceMinutes: number = 5): boolean {
    const timeUntil = this.getTimeUntilPublication();
    const toleranceMs = toleranceMinutes * 60 * 1000;
    return timeUntil <= toleranceMs && timeUntil > -toleranceMs;
  }
}