import { Injectable, Inject } from '@nestjs/common';
import { QueueManager } from '@content-creation/queue';
import { JobStatusDto } from '../content-processing/dto/job-status.dto';

// Queue job status constants
const QUEUE_JOB_STATUS = {
  FAILED: 'failed'
} as const;

/**
 * Helper service to attach queue job status to entities
 */
@Injectable()
export class JobStatusHelper {
  constructor(
    @Inject('QUEUE_MANAGER') private readonly queueManager: QueueManager
  ) {}

  /**
   * Attach job status to a single entity
   */
  async attachJobStatus<T extends { queueJobId?: string | null }>(
    entity: T
  ): Promise<T & { queueJob?: JobStatusDto }> {
    if (!entity.queueJobId) {
      return entity;
    }
    
    try {
      // Determine queue name from job ID pattern
      const queueName = this.getQueueNameFromJobId(entity.queueJobId);
      if (!queueName) {
        return entity;
      }
      
      const jobStatus = await this.queueManager.getJobStatus(queueName, entity.queueJobId);
      if (!jobStatus) {
        return entity;
      }
      
      const dto: JobStatusDto = {
        id: jobStatus.id,
        queueName,
        status: jobStatus.status,
        progress: jobStatus.progress,
        error: jobStatus.error,
        attemptsMade: jobStatus.attemptsMade,
        maxAttempts: jobStatus.maxAttempts,
        timestamps: {
          created: jobStatus.timestamps.created,
          processed: jobStatus.timestamps.processed,
          completed: jobStatus.timestamps.completed,
          failed: jobStatus.timestamps.failed,
        },
      };
      return { ...entity, queueJob: dto };
    } catch (error) {
      // If job doesn't exist anymore, just return entity without job status
      console.warn(`Failed to get job status for ${entity.queueJobId}:`, error);
      return entity;
    }
  }

  /**
   * Attach job status to multiple entities
   */
  async attachJobStatusToMany<T extends { queueJobId?: string | null }>(
    entities: T[]
  ): Promise<Array<T & { queueJob?: JobStatusDto }>> {
    const jobIds = entities
      .filter(e => e.queueJobId)
      .map(e => e.queueJobId as string);
    
    if (jobIds.length === 0) {
      return entities;
    }
    
    try {
      // Group job IDs by queue name
      const jobsByQueue = jobIds.map(jobId => ({
        queueName: this.getQueueNameFromJobId(jobId)!,
        jobId
      })).filter(job => job.queueName);
      
      const jobStatuses = await this.queueManager.getBulkJobStatus(jobsByQueue);
      
      return entities.map(entity => {
        if (!entity.queueJobId) {
          return entity;
        }
        
        const jobStatus = jobStatuses.get(entity.queueJobId);
        if (jobStatus) {
          return { ...entity, queueJob: jobStatus };
        }
        
        return entity;
      });
    } catch (error) {
      console.error('Failed to get bulk job statuses:', error);
      // Return entities without job status on error
      return entities;
    }
  }

  /**
   * Check if an entity is currently processing
   */
  isEntityProcessing(entity: { queueJob?: JobStatusDto }): boolean {
    return entity.queueJob?.status === 'active';
  }

  /**
   * Check if an entity has failed processing
   */
  isEntityFailed(entity: { queueJob?: JobStatusDto; status?: string }): boolean {
    return entity.queueJob?.status === QUEUE_JOB_STATUS.FAILED || entity.status === QUEUE_JOB_STATUS.FAILED;
  }

  /**
   * Get error message from entity
   */
  getEntityError(entity: { queueJob?: JobStatusDto }): string | undefined {
    if (entity.queueJob?.status === QUEUE_JOB_STATUS.FAILED && entity.queueJob?.error) {
      return entity.queueJob.error.message;
    }
    return undefined;
  }

  /**
   * Determine queue name from job ID pattern
   */
  private getQueueNameFromJobId(jobId: string): string | null {
    if (jobId.startsWith('clean_')) {
      return 'content-clean-transcript';
    }
    if (jobId.startsWith('insights_')) {
      return 'content-extract-insights';
    }
    if (jobId.startsWith('posts_')) {
      return 'content-generate-posts';
    }
    if (jobId.startsWith('publish_')) {
      return 'social-publisher';
    }
    return null;
  }
}