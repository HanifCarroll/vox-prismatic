/**
 * ProcessingJobRepository
 * Data access layer for ProcessingJob entities
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProcessingJobEntity } from './processing-job.entity';
import { ProcessingJobStatus, JobError, JobMetadata } from './types/processing-job.types';
import { JobType } from '@content-creation/types';
import { Prisma } from '@prisma/client';

/**
 * Repository for ProcessingJob database operations
 */
@Injectable()
export class ProcessingJobRepository {
  private readonly logger = new Logger(ProcessingJobRepository.name);

  constructor(public readonly prisma: PrismaService) {}

  /**
   * Find a processing job by ID
   */
  async findById(id: string): Promise<ProcessingJobEntity | null> {
    const job = await this.prisma.processingJob.findUnique({
      where: { id }
    });

    return job ? this.toEntity(job) : null;
  }

  /**
   * Find processing jobs by status
   */
  async findByStatus(status: ProcessingJobStatus): Promise<ProcessingJobEntity[]> {
    const jobs = await this.prisma.processingJob.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' }
    });

    return jobs.map(job => this.toEntity(job));
  }

  /**
   * Find processing jobs by source ID
   */
  async findBySourceId(sourceId: string): Promise<ProcessingJobEntity[]> {
    const jobs = await this.prisma.processingJob.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' }
    });

    return jobs.map(job => this.toEntity(job));
  }

  /**
   * Find processing jobs by job type
   */
  async findByJobType(jobType: JobType): Promise<ProcessingJobEntity[]> {
    const jobs = await this.prisma.processingJob.findMany({
      where: { jobType },
      orderBy: { createdAt: 'desc' }
    });

    return jobs.map(job => this.toEntity(job));
  }

  /**
   * Find stale processing jobs
   * Jobs that have been processing for longer than their threshold
   */
  async findStaleJobs(thresholdMs: number): Promise<ProcessingJobEntity[]> {
    const thresholdDate = new Date(Date.now() - thresholdMs);
    
    const jobs = await this.prisma.processingJob.findMany({
      where: {
        status: ProcessingJobStatus.PROCESSING,
        startedAt: {
          lte: thresholdDate.toISOString()
        }
      },
      orderBy: { startedAt: 'asc' }
    });

    return jobs.map(job => this.toEntity(job));
  }

  /**
   * Find failed jobs that can be retried
   */
  async findRetryableJobs(): Promise<ProcessingJobEntity[]> {
    const jobs = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM processing_jobs
      WHERE status = ${ProcessingJobStatus.FAILED}
      AND (retry_count IS NULL OR retry_count < 
        CASE job_type
          WHEN 'clean_transcript' THEN 3
          WHEN 'extract_insights' THEN 5
          WHEN 'generate_posts' THEN 4
          ELSE 3
        END
      )
      ORDER BY created_at DESC
    `;

    return jobs.map(job => this.toEntity(job));
  }

  /**
   * Create a new processing job
   */
  async create(data: {
    jobType: JobType;
    sourceId: string;
    status?: ProcessingJobStatus;
    metadata?: JobMetadata;
  }): Promise<ProcessingJobEntity> {
    const job = await this.prisma.processingJob.create({
      data: {
        jobType: data.jobType,
        sourceId: data.sourceId,
        status: data.status || ProcessingJobStatus.QUEUED,
        progress: 0,
        resultCount: 0
      }
    });

    return this.toEntity(job);
  }

  /**
   * Update a processing job
   */
  async update(
    id: string, 
    data: Partial<{
      status: ProcessingJobStatus;
      progress: number;
      resultCount: number;
      errorMessage: string | null;
      startedAt: string | null;
      completedAt: string | null;
      durationMs: number | null;
      estimatedTokens: number | null;
      estimatedCost: number | null;
      retryCount: number;
      updatedAt: Date;
    }>
  ): Promise<ProcessingJobEntity> {
    const job = await this.prisma.processingJob.update({
      where: { id },
      data
    });

    return this.toEntity(job);
  }

  /**
   * Delete a processing job
   */
  async delete(id: string): Promise<void> {
    await this.prisma.processingJob.delete({
      where: { id }
    });
  }

  /**
   * Batch update multiple jobs
   */
  async batchUpdate(
    ids: string[],
    data: Partial<{
      status: ProcessingJobStatus;
      errorMessage: string;
    }>
  ): Promise<number> {
    const result = await this.prisma.processingJob.updateMany({
      where: {
        id: { in: ids }
      },
      data
    });

    return result.count;
  }

  /**
   * Get job statistics by type
   */
  async getStatsByJobType(jobType: JobType): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    averageDuration: number | null;
    averageCost: number | null;
  }> {
    const [stats] = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = ${ProcessingJobStatus.QUEUED} THEN 1 END) as queued,
        COUNT(CASE WHEN status = ${ProcessingJobStatus.PROCESSING} THEN 1 END) as processing,
        COUNT(CASE WHEN status = ${ProcessingJobStatus.COMPLETED} THEN 1 END) as completed,
        COUNT(CASE WHEN status IN (${ProcessingJobStatus.FAILED}, ${ProcessingJobStatus.PERMANENTLY_FAILED}) THEN 1 END) as failed,
        AVG(duration_ms) as average_duration,
        AVG(estimated_cost) as average_cost
      FROM processing_jobs
      WHERE job_type = ${jobType}
    `;

    return {
      total: Number(stats.total) || 0,
      queued: Number(stats.queued) || 0,
      processing: Number(stats.processing) || 0,
      completed: Number(stats.completed) || 0,
      failed: Number(stats.failed) || 0,
      averageDuration: stats.average_duration ? Number(stats.average_duration) : null,
      averageCost: stats.average_cost ? Number(stats.average_cost) : null
    };
  }

  /**
   * Get overall job statistics
   */
  async getOverallStats(): Promise<{
    byJobType: Record<JobType, {
      total: number;
      completed: number;
      failed: number;
      processing: number;
    }>;
    totals: {
      all: number;
      completed: number;
      failed: number;
      processing: number;
      queued: number;
    };
  }> {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        job_type,
        status,
        COUNT(*) as count
      FROM processing_jobs
      GROUP BY job_type, status
    `;

    // Initialize result structure
    const byJobType: Record<string, any> = {};
    const totals = {
      all: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      queued: 0
    };

    // Process stats
    for (const row of stats) {
      const jobType = row.job_type;
      const status = row.status;
      const count = Number(row.count);

      // Initialize job type stats if needed
      if (!byJobType[jobType]) {
        byJobType[jobType] = {
          total: 0,
          completed: 0,
          failed: 0,
          processing: 0
        };
      }

      // Update job type stats
      byJobType[jobType].total += count;
      
      if (status === ProcessingJobStatus.COMPLETED) {
        byJobType[jobType].completed += count;
        totals.completed += count;
      } else if (status === ProcessingJobStatus.FAILED || status === ProcessingJobStatus.PERMANENTLY_FAILED) {
        byJobType[jobType].failed += count;
        totals.failed += count;
      } else if (status === ProcessingJobStatus.PROCESSING) {
        byJobType[jobType].processing += count;
        totals.processing += count;
      } else if (status === ProcessingJobStatus.QUEUED) {
        totals.queued += count;
      }

      totals.all += count;
    }

    return {
      byJobType: byJobType as Record<JobType, any>,
      totals
    };
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.processingJob.deleteMany({
      where: {
        status: ProcessingJobStatus.COMPLETED,
        completedAt: {
          lte: cutoffDate.toISOString()
        }
      }
    });

    this.logger.log(`Cleaned up ${result.count} old completed jobs`);
    return result.count;
  }

  /**
   * Convert Prisma model to entity
   */
  public toEntity(job: any): ProcessingJobEntity {
    // Parse lastError if it's stored as JSON string
    let lastError: JobError | null = null;
    if (job.errorMessage) {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(job.errorMessage);
        if (parsed && typeof parsed === 'object') {
          lastError = parsed as JobError;
        }
      } catch {
        // If not JSON, create a simple error object
        lastError = {
          message: job.errorMessage,
          timestamp: job.updatedAt,
          isRetryable: true
        };
      }
    }

    // Parse metadata if stored
    let metadata: JobMetadata | null = null;
    // Note: This would need to be added to the Prisma schema
    // if (job.metadata) {
    //   try {
    //     metadata = JSON.parse(job.metadata);
    //   } catch {
    //     metadata = null;
    //   }
    // }

    return new ProcessingJobEntity({
      id: job.id,
      jobType: job.jobType as JobType,
      sourceId: job.sourceId,
      status: job.status as ProcessingJobStatus,
      progress: job.progress,
      resultCount: job.resultCount,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      durationMs: job.durationMs,
      estimatedTokens: job.estimatedTokens,
      estimatedCost: job.estimatedCost,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      // Extended fields (to be added via migration)
      retryCount: job.retryCount || 0,
      maxRetries: job.maxRetries || undefined,
      lastError,
      metadata
    });
  }

}