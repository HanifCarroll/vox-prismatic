import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProcessingJobStatus } from '@content-creation/types';
import type { ProcessingJob, Prisma } from '@prisma/client';

export type ProcessingStateTransition = 
  | { type: 'START'; jobId: string }
  | { type: 'UPDATE_PROGRESS'; jobId: string; progress: number }
  | { type: 'COMPLETE'; jobId: string; resultCount?: number }
  | { type: 'FAIL'; jobId: string; error: string }
  | { type: 'RETRY'; jobId: string }
  | { type: 'CANCEL'; jobId: string; reason?: string };

@Injectable()
export class ProcessingStateMachine {
  private readonly logger = new Logger(ProcessingStateMachine.name);

  constructor(private readonly prisma: PrismaService) {}

  async transition(event: ProcessingStateTransition): Promise<ProcessingJob> {
    const { jobId } = event;
    
    return await this.prisma.$transaction(async (tx) => {
      const job = await tx.processingJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error(`ProcessingJob ${jobId} not found`);
      }

      this.validateTransition(job.status, event.type);

      switch (event.type) {
        case 'START':
          return await this.handleStart(tx, job);
        
        case 'UPDATE_PROGRESS':
          return await this.handleUpdateProgress(tx, job, event.progress);
        
        case 'COMPLETE':
          return await this.handleComplete(tx, job, event.resultCount);
        
        case 'FAIL':
          return await this.handleFail(tx, job, event.error);
        
        case 'RETRY':
          return await this.handleRetry(tx, job);
        
        case 'CANCEL':
          return await this.handleCancel(tx, job, event.reason);
        
        default:
          throw new Error(`Unknown transition type: ${(event as any).type}`);
      }
    });
  }

  private validateTransition(currentStatus: string, eventType: string): void {
    const validTransitions: Record<string, string[]> = {
      'queued': ['START', 'CANCEL'],
      'pending': ['START', 'CANCEL'],
      'processing': ['UPDATE_PROGRESS', 'COMPLETE', 'FAIL', 'CANCEL'],
      'failed': ['RETRY', 'CANCEL'],
      'retrying': ['START'],
      'completed': [],
      'cancelled': [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(eventType)) {
      throw new Error(
        `Invalid transition: ${eventType} from status ${currentStatus}. Allowed: ${allowed.join(', ')}`
      );
    }
  }

  private async handleStart(
    tx: Prisma.TransactionClient,
    job: ProcessingJob
  ): Promise<ProcessingJob> {
    this.logger.log(`Starting job ${job.id}`);
    
    return await tx.processingJob.update({
      where: { id: job.id },
      data: {
        status: 'processing',
        startedAt: new Date().toISOString(),
        progress: 0,
        errorMessage: null,
        updatedAt: new Date(),
      },
    });
  }

  private async handleUpdateProgress(
    tx: Prisma.TransactionClient,
    job: ProcessingJob,
    progress: number
  ): Promise<ProcessingJob> {
    const validProgress = Math.min(100, Math.max(0, progress));
    this.logger.debug(`Updating job ${job.id} progress to ${validProgress}%`);
    
    return await tx.processingJob.update({
      where: { id: job.id },
      data: {
        progress: validProgress,
        updatedAt: new Date(),
      },
    });
  }

  private async handleComplete(
    tx: Prisma.TransactionClient,
    job: ProcessingJob,
    resultCount?: number
  ): Promise<ProcessingJob> {
    const startedAt = job.startedAt ? new Date(job.startedAt) : new Date();
    const durationMs = Date.now() - startedAt.getTime();
    
    this.logger.log(`Completing job ${job.id} with ${resultCount || 0} results`);
    
    return await tx.processingJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
        durationMs,
        resultCount: resultCount || 0,
        updatedAt: new Date(),
      },
    });
  }

  private async handleFail(
    tx: Prisma.TransactionClient,
    job: ProcessingJob,
    error: string
  ): Promise<ProcessingJob> {
    const shouldRetry = job.retryCount < (job.maxRetries || 3);
    const newStatus = shouldRetry ? 'failed' : 'permanently_failed';
    
    this.logger.error(`Job ${job.id} failed: ${error}`);
    
    return await tx.processingJob.update({
      where: { id: job.id },
      data: {
        status: newStatus,
        errorMessage: error,
        lastError: {
          message: error,
          timestamp: new Date().toISOString(),
          attemptNumber: job.retryCount + 1,
        },
        updatedAt: new Date(),
      },
    });
  }

  private async handleRetry(
    tx: Prisma.TransactionClient,
    job: ProcessingJob
  ): Promise<ProcessingJob> {
    const maxRetries = job.maxRetries || 3;
    
    if (job.retryCount >= maxRetries) {
      throw new Error(`Job ${job.id} has exceeded max retries (${maxRetries})`);
    }
    
    this.logger.log(`Retrying job ${job.id} (attempt ${job.retryCount + 1}/${maxRetries})`);
    
    return await tx.processingJob.update({
      where: { id: job.id },
      data: {
        status: 'retrying',
        retryCount: job.retryCount + 1,
        progress: 0,
        updatedAt: new Date(),
      },
    });
  }

  private async handleCancel(
    tx: Prisma.TransactionClient,
    job: ProcessingJob,
    reason?: string
  ): Promise<ProcessingJob> {
    this.logger.log(`Cancelling job ${job.id}: ${reason || 'User requested'}`);
    
    return await tx.processingJob.update({
      where: { id: job.id },
      data: {
        status: 'cancelled',
        errorMessage: reason || 'Job cancelled by user',
        completedAt: new Date().toISOString(),
        updatedAt: new Date(),
      },
    });
  }

  async getJobState(jobId: string): Promise<ProcessingJob | null> {
    return await this.prisma.processingJob.findUnique({
      where: { id: jobId },
    });
  }

  async getJobsByStatus(status: string): Promise<ProcessingJob[]> {
    return await this.prisma.processingJob.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createJob(data: {
    jobType: string;
    sourceId: string;
    metadata?: any;
  }): Promise<ProcessingJob> {
    return await this.prisma.processingJob.create({
      data: {
        jobType: data.jobType,
        sourceId: data.sourceId,
        status: 'queued',
        progress: 0,
        resultCount: 0,
        retryCount: 0,
        metadata: data.metadata,
      },
    });
  }

  canTransition(currentStatus: string, eventType: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'queued': ['START', 'CANCEL'],
      'pending': ['START', 'CANCEL'],
      'processing': ['UPDATE_PROGRESS', 'COMPLETE', 'FAIL', 'CANCEL'],
      'failed': ['RETRY', 'CANCEL'],
      'retrying': ['START'],
      'completed': [],
      'cancelled': [],
    };

    const allowed = validTransitions[currentStatus] || [];
    return allowed.includes(eventType);
  }

  getAvailableTransitions(currentStatus: string): string[] {
    const validTransitions: Record<string, string[]> = {
      'queued': ['START', 'CANCEL'],
      'pending': ['START', 'CANCEL'],
      'processing': ['UPDATE_PROGRESS', 'COMPLETE', 'FAIL', 'CANCEL'],
      'failed': ['RETRY', 'CANCEL'],
      'retrying': ['START'],
      'completed': [],
      'cancelled': [],
    };

    return validTransitions[currentStatus] || [];
  }
}