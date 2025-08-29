import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { QueueManager } from '@content-creation/queue';
import { PipelineOrchestratorService } from './services/pipeline-orchestrator.service';
import { TranscriptProcessorService } from './services/transcript-processor.service';
import { InsightGeneratorService } from './services/insight-generator.service';
import { PostComposerService } from './services/post-composer.service';
import { TranscriptStateMachine } from '../processing-job/state-machines/transcript-state-machine';
import { ProcessingStateMachine } from '../processing-job/state-machines/processing-state-machine';
import { JobStatusDto } from './dto/job-status.dto';
import { INSIGHT_EVENTS, type InsightApprovedEvent } from '../insights/events/insight.events';
import { TRANSCRIPT_EVENTS, type TranscriptProcessingCompletedEvent, type TranscriptUploadedEvent, type TranscriptProcessingFailedEvent } from '../transcripts/events/transcript.events';

@Injectable()
export class ContentProcessingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContentProcessingService.name);

  constructor(
    @Inject('QUEUE_MANAGER') private readonly queueManager: QueueManager,
    private readonly pipelineOrchestrator: PipelineOrchestratorService,
    private readonly transcriptProcessor: TranscriptProcessorService,
    private readonly insightGenerator: InsightGeneratorService,
    private readonly postComposer: PostComposerService,
    private readonly transcriptStateMachine: TranscriptStateMachine,
    private readonly processingStateMachine: ProcessingStateMachine,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    try {
      await this.pipelineOrchestrator.startProcessors();
      this.logger.log('Content processing service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize content processing service', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.queueManager.stopContentProcessors();
      this.logger.log('Content processing service shutdown complete');
    } catch (error) {
      this.logger.error('Error during content processing service shutdown', error);
    }
  }

  async triggerTranscriptCleaning(transcriptId: string): Promise<{ jobId: string }> {
    return await this.pipelineOrchestrator.triggerTranscriptCleaning(transcriptId);
  }

  async triggerPostGeneration(insightId: string, platforms: ('linkedin' | 'x')[]): Promise<{ jobId: string }> {
    return await this.pipelineOrchestrator.triggerPostGeneration(insightId, platforms);
  }

  @OnEvent(TRANSCRIPT_EVENTS.UPLOADED)
  async handleTranscriptUploaded(payload: TranscriptUploadedEvent) {
    this.logger.log(`Handling transcript uploaded event for transcript ${payload.transcriptId}`);

    try {
      const result = await this.triggerTranscriptCleaning(payload.transcriptId);
      this.logger.log(`Started transcript cleaning for ${payload.transcriptId} with job ${result.jobId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to start transcript cleaning for ${payload.transcriptId}:`, error);
      
      const failedEvent: TranscriptProcessingFailedEvent = {
        transcriptId: payload.transcriptId,
        transcript: payload.transcript,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      
      this.eventEmitter.emit(TRANSCRIPT_EVENTS.FAILED, failedEvent);
      this.logger.log(`Emitted transcript processing failed event for ${payload.transcriptId}`);
      
      throw error;
    }
  }

  @OnEvent(TRANSCRIPT_EVENTS.PROCESSING_COMPLETED)
  async handleTranscriptProcessingCompleted(payload: TranscriptProcessingCompletedEvent) {
    this.logger.log(`Handling transcript processing completed event for transcript ${payload.transcriptId}`);

    try {
      const transcript = await this.transcriptProcessor.getTranscript(payload.transcriptId);

      if (!transcript || !transcript.cleanedContent) {
        throw new Error(`Transcript ${payload.transcriptId} not found or missing cleaned content`);
      }

      const { jobId } = await this.queueManager.contentQueue.extractInsights({
        transcriptId: payload.transcriptId,
        cleanedContent: transcript.cleanedContent,
      });

      try {
        await this.transcriptStateMachine.transition({
          type: 'START_INSIGHT_EXTRACTION',
          transcriptId: payload.transcriptId,
          queueJobId: jobId,
        });
        
        await this.processingStateMachine.createJob({
          jobType: 'extract_insights',
          sourceId: payload.transcriptId,
          metadata: { transcriptId: payload.transcriptId },
        });
      } catch (error) {
        this.logger.error(`Failed to track insight extraction for transcript ${payload.transcriptId}:`, error);
      }

      this.logger.log(`Started insight extraction for transcript ${payload.transcriptId} with job ${jobId}`);
      return { jobId };
    } catch (error) {
      this.logger.error(`Failed to start insight extraction for transcript ${payload.transcriptId}:`, error);
      throw error;
    }
  }

  @OnEvent(INSIGHT_EVENTS.APPROVED)
  async handleInsightApproved(payload: InsightApprovedEvent) {
    this.logger.log(`Handling insight.approved event for insight ${payload.insightId}`);

    try {
      const result = await this.triggerPostGeneration(payload.insightId, payload.platforms as ('linkedin' | 'x')[]);

      this.eventEmitter.emit(INSIGHT_EVENTS.POSTS_GENERATION_STARTED, {
        insightId: payload.insightId,
        jobId: result.jobId,
        platforms: payload.platforms,
      });

      this.logger.log(`Post generation started for insight ${payload.insightId} with job ${result.jobId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to trigger post generation for insight ${payload.insightId}:`, error);

      this.eventEmitter.emit(INSIGHT_EVENTS.POSTS_GENERATION_FAILED, {
        insightId: payload.insightId,
        error: error instanceof Error ? error.message : 'Unknown error',
        platforms: payload.platforms,
      });

      throw error;
    }
  }

  async getQueueStats() {
    return await this.queueManager.getStats();
  }

  async getHealthStatus() {
    return await this.queueManager.healthCheck();
  }

  async pauseProcessing(): Promise<void> {
    await this.queueManager.contentQueue.pauseAll();
    this.logger.log('Content processing paused');
  }

  async resumeProcessing(): Promise<void> {
    await this.queueManager.contentQueue.resumeAll();
    this.logger.log('Content processing resumed');
  }

  async getJobStatus(jobId: string): Promise<JobStatusDto> {
    const queueName = this.pipelineOrchestrator.getQueueNameFromJobId(jobId);
    if (!queueName) {
      throw new Error(`Invalid job ID format: ${jobId}`);
    }

    const status = await this.queueManager.getJobStatus(queueName, jobId);
    if (!status) {
      throw new Error(`Job ${jobId} not found`);
    }

    return {
      ...status,
      queueName,
    };
  }

  async getBulkJobStatus(jobIds: string[]): Promise<Map<string, JobStatusDto | null>> {
    const jobs = jobIds.map(jobId => {
      const queueName = this.pipelineOrchestrator.getQueueNameFromJobId(jobId);
      if (!queueName) {
        return null;
      }
      return { queueName, jobId };
    }).filter(Boolean) as Array<{ queueName: string; jobId: string }>;

    return await this.queueManager.getBulkJobStatus(jobs);
  }

  async retryFailedJob(jobId: string): Promise<{ jobId: string }> {
    const queueName = this.pipelineOrchestrator.getQueueNameFromJobId(jobId);
    if (!queueName) {
      throw new Error(`Invalid job ID format: ${jobId}`);
    }

    const result = await this.queueManager.retryJob(queueName, jobId);
    if (!result) {
      throw new Error(`Failed to retry job ${jobId}`);
    }

    await this.pipelineOrchestrator.updateEntityJobId(jobId, result.newJobId);

    return { jobId: result.newJobId };
  }

  async retryFailedJobs(): Promise<number> {
    this.logger.log('Retrying failed processing jobs');
    
    try {
      const failedJobs = await this.processingStateMachine.getJobsByStatus('failed');
      
      let retriedCount = 0;
      for (const job of failedJobs) {
        if (this.processingStateMachine.canTransition(job.status, 'RETRY')) {
          try {
            await this.processingStateMachine.transition({
              type: 'RETRY',
              jobId: job.id,
            });
            retriedCount++;
            this.logger.log(`Retried job ${job.id}`);
          } catch (error) {
            this.logger.error(`Failed to retry job ${job.id}:`, error);
          }
        }
      }
      
      return retriedCount;
    } catch (error) {
      this.logger.error('Failed to retry failed jobs:', error);
      return 0;
    }
  }

  async cleanupStaleJobReferences(): Promise<number> {
    this.logger.log('Starting cleanup of stale job references');
    
    const [transcripts, insights, posts] = await Promise.all([
      this.transcriptProcessor.getTranscriptsWithJobIds(),
      this.insightGenerator.getInsightsWithJobIds(),
      this.postComposer.getPostsWithJobIds(),
    ]);

    const allJobIds = [
      ...transcripts.map(t => t.queueJobId!),
      ...insights.map(i => i.queueJobId!),
      ...posts.map(p => p.queueJobId!),
    ];

    const jobStatuses = await this.getBulkJobStatus(allJobIds);

    const staleTranscripts = transcripts.filter(t => !jobStatuses.get(t.queueJobId!));
    const staleInsights = insights.filter(i => !jobStatuses.get(i.queueJobId!));
    const stalePosts = posts.filter(p => !jobStatuses.get(p.queueJobId!));

    await Promise.all([
      ...staleTranscripts.map(t => this.transcriptProcessor.clearTranscriptQueueJobId(t.id)),
      ...staleInsights.map(i => this.insightGenerator.clearInsightQueueJobId(i.id)),
      ...stalePosts.map(p => this.postComposer.clearPostQueueJobId(p.id)),
    ]);

    const cleanedCount = staleTranscripts.length + staleInsights.length + stalePosts.length;
    this.logger.log(`Cleaned up ${cleanedCount} stale job references`);
    return cleanedCount;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleStaleJobCleanup(): Promise<void> {
    try {
      const staleCount = await this.transcriptStateMachine.cleanupStaleProcessing();
      if (staleCount > 0) {
        this.logger.warn(`Cleaned up ${staleCount} stale transcript processing jobs`);
      }
    } catch (error) {
      this.logger.error('Failed to clean up stale jobs:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleFailedJobRetry(): Promise<void> {
    try {
      const retriedCount = await this.retryFailedJobs();
      if (retriedCount > 0) {
        this.logger.log(`Retried ${retriedCount} failed jobs`);
      }
    } catch (error) {
      this.logger.error('Failed to retry failed jobs:', error);
    }
  }

  async validateTransition(
    entityType: 'transcript' | 'processingJob',
    entityId: string,
    transition: string
  ): Promise<{ valid: boolean; reason?: string }> {
    return await this.pipelineOrchestrator.validateTransition(entityType, entityId, transition);
  }
}