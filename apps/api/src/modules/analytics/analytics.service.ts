import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { InsightStatus } from '@content-creation/types';

// Import all event types for comprehensive analytics
import { POST_EVENTS, type PostApprovedEvent, type PostRejectedEvent } from '../posts/events/post.events';
import { PUBLICATION_EVENTS, type PostPublishedEvent, type PostPublicationFailedEvent } from '../publisher/events/publication.events';
import { SCHEDULER_EVENTS, type PostScheduledEvent } from '../scheduler/events/scheduler.events';
import { TRANSCRIPT_EVENTS, type TranscriptUploadedEvent, type TranscriptProcessingCompletedEvent, type TranscriptStatusChangedEvent } from '../transcripts/events/transcript.events';
import { INSIGHT_EVENTS, type InsightApprovedEvent } from '../insights/events/insight.events';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Track post workflow events
   */
  @OnEvent(POST_EVENTS.APPROVED)
  async trackPostApproved(payload: PostApprovedEvent) {
    try {
      await this.recordEvent('post_approved', {
        postId: payload.postId,
        approvedBy: payload.approvedBy,
        timestamp: payload.timestamp
      });

      // Invalidate dashboard cache
      await this.invalidateDashboardCache();
      
      this.logger.log(`Tracked post approval: ${payload.postId}`);
    } catch (error) {
      this.logger.error('Failed to track post approval event:', error);
    }
  }

  @OnEvent(POST_EVENTS.REJECTED)
  async trackPostRejected(payload: PostRejectedEvent) {
    try {
      await this.recordEvent('post_rejected', {
        postId: payload.postId,
        rejectedBy: payload.rejectedBy,
        reason: payload.reason,
        timestamp: payload.timestamp
      });

      // Invalidate dashboard cache
      await this.invalidateDashboardCache();
      
      this.logger.log(`Tracked post rejection: ${payload.postId}`);
    } catch (error) {
      this.logger.error('Failed to track post rejection event:', error);
    }
  }

  /**
   * Track publication events
   */
  @OnEvent(PUBLICATION_EVENTS.PUBLISHED)
  async trackPostPublished(payload: PostPublishedEvent) {
    try {
      await this.recordEvent('post_published', {
        scheduledPostId: payload.scheduledPostId,
        postId: payload.postId,
        platform: payload.platform,
        externalPostId: payload.externalPostId,
        timestamp: payload.timestamp
      });

      // Update publication metrics
      await this.updatePublicationMetrics(payload.platform, 'success');
      
      // Invalidate dashboard cache
      await this.invalidateDashboardCache();
      
      this.logger.log(`Tracked successful publication: ${payload.scheduledPostId} on ${payload.platform}`);
    } catch (error) {
      this.logger.error('Failed to track post publication event:', error);
    }
  }

  @OnEvent(PUBLICATION_EVENTS.FAILED)
  async trackPostPublicationFailed(payload: PostPublicationFailedEvent) {
    try {
      await this.recordEvent('post_publication_failed', {
        scheduledPostId: payload.scheduledPostId,
        postId: payload.postId,
        platform: payload.platform,
        error: payload.error,
        retryCount: payload.retryCount,
        willRetry: payload.willRetry,
        timestamp: payload.timestamp
      });

      // Update publication metrics
      await this.updatePublicationMetrics(payload.platform, 'failure');
      
      this.logger.log(`Tracked publication failure: ${payload.scheduledPostId} on ${payload.platform}`);
    } catch (error) {
      this.logger.error('Failed to track publication failure event:', error);
    }
  }

  /**
   * Track scheduling events
   */
  @OnEvent(SCHEDULER_EVENTS.SCHEDULED)
  async trackPostScheduled(payload: PostScheduledEvent) {
    try {
      await this.recordEvent('post_scheduled', {
        postId: payload.postId,
        scheduledPostId: payload.scheduledPostId,
        platform: payload.platform,
        scheduledTime: payload.scheduledTime,
        timestamp: payload.timestamp
      });

      // Invalidate dashboard cache
      await this.invalidateDashboardCache();
      
      this.logger.log(`Tracked post scheduling: ${payload.postId} for ${payload.platform}`);
    } catch (error) {
      this.logger.error('Failed to track post scheduling event:', error);
    }
  }

  /**
   * Track transcript events
   */
  @OnEvent(TRANSCRIPT_EVENTS.UPLOADED)
  async trackTranscriptUploaded(payload: TranscriptUploadedEvent) {
    try {
      await this.recordEvent('transcript_uploaded', {
        transcriptId: payload.transcriptId,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        uploadedBy: payload.uploadedBy,
        timestamp: payload.timestamp
      });

      // Update content metrics
      await this.updateContentMetrics('transcript', 'uploaded');
      
      // Invalidate dashboard cache
      await this.invalidateDashboardCache();
      
      this.logger.log(`Tracked transcript upload: ${payload.transcriptId}`);
    } catch (error) {
      this.logger.error('Failed to track transcript upload event:', error);
    }
  }

  @OnEvent(TRANSCRIPT_EVENTS.PROCESSING_COMPLETED)
  async trackTranscriptProcessingCompleted(payload: TranscriptProcessingCompletedEvent) {
    try {
      await this.recordEvent('transcript_processed', {
        transcriptId: payload.transcriptId,
        status: payload.status,
        processingType: payload.processingType,
        timestamp: payload.timestamp
      });

      // Update processing metrics
      await this.updateProcessingMetrics('transcript', 'completed');
      
      // Invalidate dashboard cache
      await this.invalidateDashboardCache();
      
      this.logger.log(`Tracked transcript processing completion: ${payload.transcriptId}`);
    } catch (error) {
      this.logger.error('Failed to track transcript processing event:', error);
    }
  }

  @OnEvent(TRANSCRIPT_EVENTS.STATUS_CHANGED)
  async trackTranscriptStatusChanged(payload: TranscriptStatusChangedEvent) {
    try {
      await this.recordEvent('transcript_status_changed', {
        transcriptId: payload.transcriptId,
        previousStatus: payload.previousStatus,
        newStatus: payload.newStatus,
        changedBy: payload.changedBy,
        reason: payload.reason,
        timestamp: payload.timestamp
      });

      // Invalidate dashboard cache
      await this.invalidateDashboardCache();
      
      this.logger.log(`Tracked transcript status change: ${payload.transcriptId} (${payload.previousStatus} → ${payload.newStatus})`);
    } catch (error) {
      this.logger.error('Failed to track transcript status change event:', error);
    }
  }

  /**
   * Track insight events
   */
  @OnEvent(INSIGHT_EVENTS.APPROVED)
  async trackInsightApproved(payload: InsightApprovedEvent) {
    try {
      await this.recordEvent('insight_approved', {
        insightId: payload.insightId,
        approvedBy: payload.approvedBy,
        approvedAt: payload.approvedAt
      });

      // Update content metrics
      await this.updateContentMetrics('insight', InsightStatus.APPROVED);
      
      // Invalidate dashboard cache
      await this.invalidateDashboardCache();
      
      this.logger.log(`Tracked insight approval: ${payload.insightId}`);
    } catch (error) {
      this.logger.error('Failed to track insight approval event:', error);
    }
  }

  /**
   * Record an analytics event
   */
  private async recordEvent(eventType: string, eventData: any) {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          id: this.generateEventId(),
          eventType,
          entityType: 'system',
          entityId: 'event',
          eventData: JSON.stringify(eventData),
          occurredAt: new Date(),
          createdAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Failed to record analytics event ${eventType}:`, error);
      // Don't throw - analytics failures shouldn't break the main workflow
    }
  }

  /**
   * Update publication metrics
   */
  private async updatePublicationMetrics(platform: string, outcome: 'success' | 'failure') {
    const cacheKey = `metrics:publication:${platform}:${outcome}:${new Date().toISOString().split('T')[0]}`;
    
    try {
      await this.cacheService.increment(cacheKey, 1, 86400); // 24 hour TTL
    } catch (error) {
      this.logger.error(`Failed to update publication metrics for ${platform}:`, error);
    }
  }

  /**
   * Update content processing metrics
   */
  private async updateProcessingMetrics(contentType: string, outcome: string) {
    const cacheKey = `metrics:processing:${contentType}:${outcome}:${new Date().toISOString().split('T')[0]}`;
    
    try {
      await this.cacheService.increment(cacheKey, 1, 86400); // 24 hour TTL
    } catch (error) {
      this.logger.error(`Failed to update processing metrics for ${contentType}:`, error);
    }
  }

  /**
   * Update general content metrics
   */
  private async updateContentMetrics(contentType: string, action: string) {
    const cacheKey = `metrics:content:${contentType}:${action}:${new Date().toISOString().split('T')[0]}`;
    
    try {
      await this.cacheService.increment(cacheKey, 1, 86400); // 24 hour TTL
    } catch (error) {
      this.logger.error(`Failed to update content metrics for ${contentType}:`, error);
    }
  }

  /**
   * Invalidate dashboard cache on any data change
   */
  private async invalidateDashboardCache() {
    try {
      await this.cacheService.deletePattern('^dashboard:');
      this.logger.debug('Dashboard cache invalidated due to data change');
    } catch (error) {
      this.logger.error('Failed to invalidate dashboard cache:', error);
    }
  }

  /**
   * Generate analytics event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `analytics_${timestamp}_${randomPart}`;
  }

  /**
   * Get analytics summary for dashboard
   */
  async getAnalyticsSummary(dateRange?: { start: Date; end: Date }) {
    try {
      // Simplified query to avoid circular type issues
      const where = dateRange ? {
        occurredAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      } : undefined;

      const events = await this.prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where,
        _count: true
      });

      return events.map(event => ({
        eventType: event.eventType,
        count: event._count
      }));
    } catch (error) {
      this.logger.error('Failed to get analytics summary:', error);
      return [];
    }
  }
}