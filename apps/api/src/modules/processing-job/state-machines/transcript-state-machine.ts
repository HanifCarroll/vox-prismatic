import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TranscriptStatus } from '@content-creation/types';
import type { Transcript, Prisma } from '@prisma/client';

export type TranscriptStateTransition = 
  | { type: 'START_PROCESSING'; transcriptId: string; queueJobId: string }
  | { type: 'MARK_CLEANED'; transcriptId: string }
  | { type: 'MARK_FAILED'; transcriptId: string; error: string }
  | { type: 'RETRY'; transcriptId: string }
  | { type: 'START_INSIGHT_EXTRACTION'; transcriptId: string; queueJobId: string }
  | { type: 'COMPLETE_INSIGHT_EXTRACTION'; transcriptId: string };

@Injectable()
export class TranscriptStateMachine {
  private readonly logger = new Logger(TranscriptStateMachine.name);

  constructor(private readonly prisma: PrismaService) {}

  async transition(event: TranscriptStateTransition): Promise<Transcript> {
    const { transcriptId } = event;
    
    return await this.prisma.$transaction(async (tx) => {
      const transcript = await tx.transcript.findUnique({
        where: { id: transcriptId },
      });

      if (!transcript) {
        throw new Error(`Transcript ${transcriptId} not found`);
      }

      this.validateTransition(transcript.status as TranscriptStatus, event.type);

      switch (event.type) {
        case 'START_PROCESSING':
          return await this.handleStartProcessing(tx, transcript, event.queueJobId);
        
        case 'MARK_CLEANED':
          return await this.handleMarkCleaned(tx, transcript);
        
        case 'MARK_FAILED':
          return await this.handleMarkFailed(tx, transcript, event.error);
        
        case 'RETRY':
          return await this.handleRetry(tx, transcript);
        
        case 'START_INSIGHT_EXTRACTION':
          return await this.handleStartInsightExtraction(tx, transcript, event.queueJobId);
        
        case 'COMPLETE_INSIGHT_EXTRACTION':
          return await this.handleCompleteInsightExtraction(tx, transcript);
        
        default:
          throw new Error(`Unknown transition type: ${(event as any).type}`);
      }
    });
  }

  private validateTransition(currentStatus: TranscriptStatus, eventType: string): void {
    const validTransitions: Record<TranscriptStatus, string[]> = {
      [TranscriptStatus.RAW]: ['START_PROCESSING'],
      [TranscriptStatus.PROCESSING]: ['MARK_CLEANED', 'MARK_FAILED'],
      [TranscriptStatus.CLEANED]: ['START_INSIGHT_EXTRACTION'],
      [TranscriptStatus.FAILED]: ['RETRY'],
      [TranscriptStatus.PUBLISHED]: [],
      [TranscriptStatus.ARCHIVED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(eventType)) {
      throw new Error(
        `Invalid transition: ${eventType} from status ${currentStatus}. Allowed: ${allowed.join(', ')}`
      );
    }
  }

  private async handleStartProcessing(
    tx: Prisma.TransactionClient,
    transcript: Transcript,
    queueJobId: string
  ): Promise<Transcript> {
    this.logger.log(`Starting processing for transcript ${transcript.id} with job ${queueJobId}`);
    
    const processingJob = await this.findOrCreateProcessingJob(tx, transcript.id, 'clean_transcript', queueJobId);
    
    return await tx.transcript.update({
      where: { id: transcript.id },
      data: {
        status: TranscriptStatus.PROCESSING,
        queueJobId,
        processingStartedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      },
    });
  }

  private async handleMarkCleaned(
    tx: Prisma.TransactionClient,
    transcript: Transcript
  ): Promise<Transcript> {
    this.logger.log(`Marking transcript ${transcript.id} as cleaned`);
    
    if (transcript.queueJobId) {
      await this.updateProcessingJobStatus(tx, transcript.queueJobId, 'completed');
    }
    
    return await tx.transcript.update({
      where: { id: transcript.id },
      data: {
        status: TranscriptStatus.CLEANED,
        processingCompletedAt: new Date(),
        queueJobId: null,
        updatedAt: new Date(),
      },
    });
  }

  private async handleMarkFailed(
    tx: Prisma.TransactionClient,
    transcript: Transcript,
    error: string
  ): Promise<Transcript> {
    this.logger.error(`Marking transcript ${transcript.id} as failed: ${error}`);
    
    if (transcript.queueJobId) {
      await this.updateProcessingJobStatus(tx, transcript.queueJobId, 'failed', error);
    }
    
    return await tx.transcript.update({
      where: { id: transcript.id },
      data: {
        status: TranscriptStatus.FAILED,
        errorMessage: error,
        processingCompletedAt: new Date(),
        queueJobId: null,
        updatedAt: new Date(),
      },
    });
  }

  private async handleRetry(
    tx: Prisma.TransactionClient,
    transcript: Transcript
  ): Promise<Transcript> {
    this.logger.log(`Retrying transcript ${transcript.id}`);
    
    return await tx.transcript.update({
      where: { id: transcript.id },
      data: {
        status: TranscriptStatus.RAW,
        errorMessage: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        queueJobId: null,
        updatedAt: new Date(),
      },
    });
  }

  private async handleStartInsightExtraction(
    tx: Prisma.TransactionClient,
    transcript: Transcript,
    queueJobId: string
  ): Promise<Transcript> {
    this.logger.log(`Starting insight extraction for transcript ${transcript.id} with job ${queueJobId}`);
    
    const processingJob = await this.findOrCreateProcessingJob(tx, transcript.id, 'extract_insights', queueJobId);
    
    return await tx.transcript.update({
      where: { id: transcript.id },
      data: {
        queueJobId,
        updatedAt: new Date(),
      },
    });
  }

  private async handleCompleteInsightExtraction(
    tx: Prisma.TransactionClient,
    transcript: Transcript
  ): Promise<Transcript> {
    this.logger.log(`Completing insight extraction for transcript ${transcript.id}`);
    
    if (transcript.queueJobId) {
      await this.updateProcessingJobStatus(tx, transcript.queueJobId, 'completed');
    }
    
    return await tx.transcript.update({
      where: { id: transcript.id },
      data: {
        queueJobId: null,
        updatedAt: new Date(),
      },
    });
  }

  private async findOrCreateProcessingJob(
    tx: Prisma.TransactionClient,
    sourceId: string,
    jobType: string,
    jobId: string
  ) {
    const existing = await tx.processingJob.findUnique({
      where: { id: jobId },
    });

    if (existing) {
      return existing;
    }

    return await tx.processingJob.create({
      data: {
        id: jobId,
        jobType,
        sourceId,
        status: 'queued',
        progress: 0,
        resultCount: 0,
        retryCount: 0,
      },
    });
  }

  private async updateProcessingJobStatus(
    tx: Prisma.TransactionClient,
    jobId: string,
    status: string,
    errorMessage?: string
  ) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString();
      updateData.progress = 100;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return await tx.processingJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  async getTranscriptState(transcriptId: string): Promise<Transcript | null> {
    return await this.prisma.transcript.findUnique({
      where: { id: transcriptId },
    });
  }

  async getTranscriptsByStatus(status: TranscriptStatus): Promise<Transcript[]> {
    return await this.prisma.transcript.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  canTransition(currentStatus: TranscriptStatus, eventType: string): boolean {
    const validTransitions: Record<TranscriptStatus, string[]> = {
      [TranscriptStatus.RAW]: ['START_PROCESSING'],
      [TranscriptStatus.PROCESSING]: ['MARK_CLEANED', 'MARK_FAILED'],
      [TranscriptStatus.CLEANED]: ['START_INSIGHT_EXTRACTION'],
      [TranscriptStatus.FAILED]: ['RETRY'],
      [TranscriptStatus.PUBLISHED]: [],
      [TranscriptStatus.ARCHIVED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    return allowed.includes(eventType);
  }

  getAvailableTransitions(currentStatus: TranscriptStatus): string[] {
    const validTransitions: Record<TranscriptStatus, string[]> = {
      [TranscriptStatus.RAW]: ['START_PROCESSING'],
      [TranscriptStatus.PROCESSING]: ['MARK_CLEANED', 'MARK_FAILED'],
      [TranscriptStatus.CLEANED]: ['START_INSIGHT_EXTRACTION'],
      [TranscriptStatus.FAILED]: ['RETRY'],
      [TranscriptStatus.PUBLISHED]: [],
      [TranscriptStatus.ARCHIVED]: [],
    };

    return validTransitions[currentStatus] || [];
  }

  async cleanupStaleProcessing(maxAgeMs: number = 30 * 60 * 1000): Promise<number> {
    const staleDate = new Date(Date.now() - maxAgeMs);
    
    const staleTranscripts = await this.prisma.transcript.findMany({
      where: {
        status: TranscriptStatus.PROCESSING,
        processingStartedAt: {
          lt: staleDate,
        },
      },
    });

    let cleanedCount = 0;
    for (const transcript of staleTranscripts) {
      try {
        await this.transition({
          type: 'MARK_FAILED',
          transcriptId: transcript.id,
          error: 'Processing exceeded timeout threshold',
        });
        cleanedCount++;
        this.logger.warn(`Marked stale transcript ${transcript.id} as failed`);
      } catch (error) {
        this.logger.error(`Failed to clean up stale transcript ${transcript.id}:`, error);
      }
    }

    return cleanedCount;
  }
}