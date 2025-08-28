import { Injectable } from '@nestjs/common';
import { ContentProcessingService } from './content-processing.service';
import { JobStatusDto } from './dto/job-status.dto';

/**
 * Helper service to attach queue job status to entities
 */
@Injectable()
export class JobStatusHelper {
  constructor(
    private readonly contentProcessingService: ContentProcessingService
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
      const jobStatus = await this.contentProcessingService.getJobStatus(entity.queueJobId);
      return { ...entity, queueJob: jobStatus };
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
      const jobStatuses = await this.contentProcessingService.getBulkJobStatus(jobIds);
      
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
    return entity.queueJob?.status === 'failed' || entity.status === 'failed';
  }

  /**
   * Get error message from entity
   */
  getEntityError(entity: { queueJob?: JobStatusDto }): string | undefined {
    if (entity.queueJob?.status === 'failed' && entity.queueJob?.error) {
      return entity.queueJob.error.message;
    }
    return undefined;
  }
}