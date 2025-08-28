import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

// Import all event types for comprehensive notifications
import { POST_EVENTS, type PostApprovedEvent, type PostRejectedEvent } from '../posts/events/post.events';
import { PUBLICATION_EVENTS, type PostPublishedEvent, type PostPublicationFailedEvent, type PostPublicationPermanentlyFailedEvent } from '../publisher/events/publication.events';
import { SCHEDULER_EVENTS, type PostScheduledEvent } from '../scheduler/events/scheduler.events';
import { TRANSCRIPT_EVENTS, type TranscriptUploadedEvent, type TranscriptProcessingCompletedEvent, type TranscriptProcessingFailedEvent } from '../transcripts/events/transcript.events';
import { INSIGHT_EVENTS, type InsightApprovedEvent } from '../insights/events/insight.events';

export interface NotificationPayload {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  userId?: string;
  timestamp: Date;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // In a real implementation, this would integrate with:
  // - WebSocket connections for real-time notifications
  // - Email service for important alerts
  // - Push notification service for mobile apps
  // - Database to persist notifications for users

  /**
   * Post workflow notifications
   */
  @OnEvent(POST_EVENTS.APPROVED)
  async notifyPostApproved(payload: PostApprovedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'success',
      title: 'Post Approved',
      message: `Post "${payload.post.title || payload.postId}" has been approved and is now eligible for scheduling.`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.postId,
      relatedEntityType: 'post',
      actionUrl: `/posts/${payload.postId}`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent post approval notification for: ${payload.postId}`);
  }

  @OnEvent(POST_EVENTS.REJECTED)
  async notifyPostRejected(payload: PostRejectedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'warning',
      title: 'Post Rejected',
      message: `Post "${payload.post.title || payload.postId}" was rejected${payload.reason ? `: ${payload.reason}` : '.'} Please review and resubmit.`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.postId,
      relatedEntityType: 'post',
      actionUrl: `/posts/${payload.postId}/edit`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent post rejection notification for: ${payload.postId}`);
  }

  /**
   * Publication notifications
   */
  @OnEvent(PUBLICATION_EVENTS.PUBLISHED)
  async notifyPostPublished(payload: PostPublishedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'success',
      title: 'Post Published Successfully',
      message: `Your post was successfully published to ${payload.platform.toUpperCase()}!`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.postId || payload.scheduledPostId,
      relatedEntityType: 'scheduledPost',
      actionUrl: payload.externalPostId ? `#external-${payload.externalPostId}` : undefined
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent publication success notification for: ${payload.scheduledPostId} on ${payload.platform}`);
  }

  @OnEvent(PUBLICATION_EVENTS.FAILED)
  async notifyPostPublicationFailed(payload: PostPublicationFailedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: payload.willRetry ? 'warning' : 'error',
      title: payload.willRetry ? 'Publication Failed - Will Retry' : 'Publication Failed',
      message: payload.willRetry 
        ? `Failed to publish to ${payload.platform.toUpperCase()}: ${payload.error}. Retrying automatically (attempt ${payload.retryCount}/${payload.maxRetries}).`
        : `Failed to publish to ${payload.platform.toUpperCase()}: ${payload.error}`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.postId || payload.scheduledPostId,
      relatedEntityType: 'scheduledPost',
      actionUrl: `/scheduler/${payload.scheduledPostId}`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent publication failure notification for: ${payload.scheduledPostId} on ${payload.platform}`);
  }

  @OnEvent(PUBLICATION_EVENTS.PERMANENTLY_FAILED)
  async notifyPostPublicationPermanentlyFailed(payload: PostPublicationPermanentlyFailedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'error',
      title: 'Publication Permanently Failed',
      message: `Failed to publish to ${payload.platform.toUpperCase()} after ${payload.totalAttempts} attempts: ${payload.finalError}. Please review and reschedule manually.`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.postId || payload.scheduledPostId,
      relatedEntityType: 'scheduledPost',
      actionUrl: `/posts/${payload.postId}/schedule`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent permanent publication failure notification for: ${payload.scheduledPostId} on ${payload.platform}`);
  }

  /**
   * Scheduling notifications
   */
  @OnEvent(SCHEDULER_EVENTS.SCHEDULED)
  async notifyPostScheduled(payload: PostScheduledEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'info',
      title: 'Post Scheduled',
      message: `Your post has been scheduled for ${payload.platform.toUpperCase()} on ${payload.scheduledTime.toLocaleDateString()} at ${payload.scheduledTime.toLocaleTimeString()}.`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.postId,
      relatedEntityType: 'post',
      actionUrl: `/scheduler`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent scheduling notification for: ${payload.postId} on ${payload.platform}`);
  }

  /**
   * Content processing notifications
   */
  @OnEvent(TRANSCRIPT_EVENTS.UPLOADED)
  async notifyTranscriptUploaded(payload: TranscriptUploadedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'info',
      title: 'Transcript Uploaded',
      message: `Transcript "${payload.transcript.title}" has been uploaded and processing will begin automatically.`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.transcriptId,
      relatedEntityType: 'transcript',
      actionUrl: `/transcripts/${payload.transcriptId}`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent transcript upload notification for: ${payload.transcriptId}`);
  }

  @OnEvent(TRANSCRIPT_EVENTS.PROCESSING_COMPLETED)
  async notifyTranscriptProcessingCompleted(payload: TranscriptProcessingCompletedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'success',
      title: 'Transcript Processing Complete',
      message: `Transcript "${payload.transcript.title}" has been processed successfully. You can now extract insights from it.`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.transcriptId,
      relatedEntityType: 'transcript',
      actionUrl: `/transcripts/${payload.transcriptId}/insights`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent transcript processing completion notification for: ${payload.transcriptId}`);
  }

  @OnEvent(TRANSCRIPT_EVENTS.FAILED)
  async notifyTranscriptProcessingFailed(payload: TranscriptProcessingFailedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'error',
      title: 'Transcript Processing Failed',
      message: `Failed to process transcript: ${payload.error}. Please check the content and try again.`,
      timestamp: payload.timestamp,
      relatedEntityId: payload.transcriptId,
      relatedEntityType: 'transcript',
      actionUrl: `/transcripts/${payload.transcriptId}`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent transcript processing failure notification for: ${payload.transcriptId}`);
  }

  /**
   * Insight notifications
   */
  @OnEvent(INSIGHT_EVENTS.APPROVED)
  async notifyInsightApproved(payload: InsightApprovedEvent) {
    const notification: NotificationPayload = {
      id: this.generateNotificationId(),
      type: 'success',
      title: 'Insight Approved - Generating Posts',
      message: `Insight has been approved and post generation has started automatically for your selected platforms.`,
      timestamp: payload.approvedAt,
      relatedEntityId: payload.insightId,
      relatedEntityType: 'insight',
      actionUrl: `/insights/${payload.insightId}/posts`
    };

    await this.sendNotification(notification);
    this.logger.log(`Sent insight approval notification for: ${payload.insightId}`);
  }

  /**
   * Send notification (stub implementation)
   */
  private async sendNotification(notification: NotificationPayload) {
    // In a real implementation, this would:
    // 1. Store notification in database for persistence
    // 2. Send via WebSocket to connected clients
    // 3. Queue email notifications for important events
    // 4. Send push notifications to mobile apps
    // 5. Integrate with external notification services

    this.logger.debug(`[NOTIFICATION] ${notification.type.toUpperCase()}: ${notification.title} - ${notification.message}`);

    // For now, just log the notification
    // In production, you would implement actual notification delivery
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `notif_${timestamp}_${randomPart}`;
  }

  /**
   * Get notification preferences for user (future enhancement)
   */
  async getNotificationPreferences(userId: string) {
    // Future: Return user's notification preferences
    return {
      email: true,
      push: true,
      browser: true,
      categories: {
        posts: true,
        publications: true,
        processing: true,
        system: true
      }
    };
  }

  /**
   * Update notification preferences (future enhancement)
   */
  async updateNotificationPreferences(userId: string, preferences: any) {
    // Future: Update user's notification preferences
    this.logger.log(`Updated notification preferences for user: ${userId}`);
  }
}