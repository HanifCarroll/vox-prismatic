import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueManager } from '@content-creation/queue';
import type { 
  CleanTranscriptProcessorDependencies, 
  ExtractInsightsProcessorDependencies,
  GeneratePostsProcessorDependencies
} from '@content-creation/queue';
import { TranscriptProcessorService } from './transcript-processor.service';
import { InsightGeneratorService } from './insight-generator.service';
import { PostComposerService } from './post-composer.service';
import { TranscriptStateService } from '../../transcripts/services/transcript-state.service';
import { ProcessingStateMachine } from '../../processing-job/state-machines/processing-state-machine';
import { TranscriptStateMachine } from '../../processing-job/state-machines/transcript-state-machine';
import { TranscriptStatus, InsightStatus } from '@content-creation/types';
import { CONTENT_QUEUE_NAMES, QUEUE_NAMES } from '@content-creation/queue/dist/config';
import { TRANSCRIPT_EVENTS } from '../../transcripts/events/transcript.events';

@Injectable()
export class PipelineOrchestratorService {
  private readonly logger = new Logger(PipelineOrchestratorService.name);

  constructor(
    @Inject('QUEUE_MANAGER') private readonly queueManager: QueueManager,
    private readonly transcriptProcessor: TranscriptProcessorService,
    private readonly insightGenerator: InsightGeneratorService,
    private readonly postComposer: PostComposerService,
    private readonly transcriptStateService: TranscriptStateService,
    private readonly processingStateMachine: ProcessingStateMachine,
    private readonly transcriptStateMachine: TranscriptStateMachine,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async startProcessors(): Promise<void> {
    const cleanTranscriptDeps: CleanTranscriptProcessorDependencies = {
      cleanTranscript: async (transcriptId: string, rawContent: string) => {
        return await this.transcriptProcessor.cleanTranscript(transcriptId, rawContent);
      },
      
      updateTranscript: async (transcriptId: string, updates) => {
        await this.transcriptProcessor.updateTranscript(transcriptId, updates);
        
        // Use persisted state machine for transition with error handling
        if (updates.cleanedContent) {
          try {
            await this.transcriptStateMachine.transition({
              type: 'MARK_CLEANED',
              transcriptId,
            });
          } catch (error) {
            this.logger.error(`Failed to transition transcript ${transcriptId} to CLEANED:`, error);
            this.eventEmitter.emit(TRANSCRIPT_EVENTS.STATUS_CHANGE_FAILED, {
              transcriptId,
              attemptedTransition: 'MARK_CLEANED',
              error: error.message,
              timestamp: new Date(),
            });
          }
        }
      },
      
      triggerInsightExtraction: async (transcriptId: string, cleanedContent: string) => {
        this.logger.log(`Auto-triggering insight extraction for transcript ${transcriptId}`);
        const { jobId } = await this.queueManager.contentQueue.extractInsights({
          transcriptId,
          cleanedContent,
        });
        
        // Use persisted state machine to track job with error handling
        try {
          await this.transcriptStateMachine.transition({
            type: 'START_INSIGHT_EXTRACTION',
            transcriptId,
            queueJobId: jobId,
          });
          
          // Create processing job record
          await this.processingStateMachine.createJob({
            jobType: 'extract_insights',
            sourceId: transcriptId,
            metadata: { transcriptId },
          });
        } catch (error) {
          this.logger.error(`Failed to track insight extraction for transcript ${transcriptId}:`, error);
        }
      },
    };

    const extractInsightsDeps: ExtractInsightsProcessorDependencies = {
      extractInsights: async (transcriptId: string, cleanedContent: string) => {
        return await this.insightGenerator.extractInsights(transcriptId, cleanedContent);
      },
      
      updateTranscriptProcessingStatus: async (transcriptId: string, updates) => {
        const logMessage = updates.status === TranscriptStatus.FAILED 
          ? `Marking transcript ${transcriptId} as failed` 
          : `Clearing processing status for transcript ${transcriptId}`;
        this.logger.log(logMessage);
        
        await this.transcriptProcessor.updateTranscript(transcriptId, updates);
        
        // Use persisted state machine for failure transition with error handling
        if (updates.status === TranscriptStatus.FAILED) {
          const errorMessage = 'Transcript processing failed';
          try {
            await this.transcriptStateMachine.transition({
              type: 'MARK_FAILED',
              transcriptId,
              error: errorMessage,
            });
          } catch (error) {
            this.logger.error(`Failed to transition transcript ${transcriptId} to FAILED:`, error);
            await this.transcriptProcessor.updateTranscript(transcriptId, {
              status: TranscriptStatus.FAILED,
              errorMessage,
              updatedAt: new Date(),
            });
          }
        }
      },
    };

    const generatePostsDeps: GeneratePostsProcessorDependencies = {
      generatePosts: async (insightId: string, insightContent: string, platforms) => {
        return await this.postComposer.generatePosts(insightId, insightContent, platforms);
      },
      
      updateInsightProcessingStatus: async (insightId: string, updates) => {
        await this.insightGenerator.updateInsightProcessingStatus(insightId, updates);
      },
    };

    await Promise.all([
      this.queueManager.startCleanTranscriptProcessor(cleanTranscriptDeps, { concurrency: 2 }),
      this.queueManager.startExtractInsightsProcessor(extractInsightsDeps, { concurrency: 1 }),
      this.queueManager.startGeneratePostsProcessor(generatePostsDeps, { concurrency: 2 }),
    ]);

    this.logger.log('All content processors started');
  }

  async triggerTranscriptCleaning(transcriptId: string): Promise<{ jobId: string }> {
    const transcript = await this.transcriptProcessor.getTranscript(transcriptId);

    if (!transcript) {
      throw new Error(`Transcript ${transcriptId} not found`);
    }

    // Validate state transition before attempting
    const validation = await this.validateTransition('transcript', transcriptId, 'START_PROCESSING');
    if (!validation.valid) {
      throw new Error(validation.reason || `Cannot start processing for transcript ${transcriptId}`);
    }

    const { jobId } = await this.queueManager.contentQueue.cleanTranscript({
      transcriptId,
      rawContent: transcript.rawContent,
      metadata: {
        title: transcript.title,
        sourceType: transcript.sourceType || undefined,
      },
    });

    // Use persisted state machine to transition to PROCESSING state with error handling
    try {
      await this.transcriptStateMachine.transition({
        type: 'START_PROCESSING',
        transcriptId,
        queueJobId: jobId,
      });
      
      // Create processing job record
      await this.processingStateMachine.createJob({
        jobType: 'clean_transcript',
        sourceId: transcriptId,
        metadata: {
          title: transcript.title,
          sourceType: transcript.sourceType,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to start processing for transcript ${transcriptId}:`, error);
      // Cancel the queued job if state transition fails
      try {
        await this.queueManager.cancelJob(CONTENT_QUEUE_NAMES.CLEAN_TRANSCRIPT, jobId);
      } catch (cancelError) {
        this.logger.error(`Failed to cancel job ${jobId}:`, cancelError);
      }
      throw new Error(`Failed to start transcript processing: ${error.message}`);
    }

    this.logger.log(`Triggered transcript cleaning for ${transcriptId} with job ${jobId}`);
    return { jobId };
  }

  async triggerPostGeneration(insightId: string, platforms: ('linkedin' | 'x')[]): Promise<{ jobId: string }> {
    const insight = await this.insightGenerator.getInsight(insightId);

    if (!insight) {
      throw new Error(`Insight ${insightId} not found`);
    }

    if (insight.status !== InsightStatus.APPROVED) {
      throw new Error(`Insight ${insightId} must be approved before generating posts (current: ${insight.status})`);
    }

    const { jobId } = await this.queueManager.contentQueue.generatePosts({
      insightId,
      insightContent: `${insight.title}\n\n${insight.summary}\n\nQuote: "${insight.verbatimQuote}"`,
      platforms,
      metadata: {
        category: insight.category,
      },
    });

    await this.insightGenerator.updateInsightJobId(insightId, jobId);

    this.logger.log(`Triggered post generation for insight ${insightId} with job ${jobId}`);
    return { jobId };
  }

  getQueueNameFromJobId(jobId: string): string | null {
    if (jobId.startsWith('clean-transcript-')) {
      return CONTENT_QUEUE_NAMES.CLEAN_TRANSCRIPT;
    }
    if (jobId.startsWith('extract-insights-')) {
      return CONTENT_QUEUE_NAMES.EXTRACT_INSIGHTS;
    }
    if (jobId.startsWith('generate-posts-')) {
      return CONTENT_QUEUE_NAMES.GENERATE_POSTS;
    }
    if (jobId.startsWith('publish-post-')) {
      return QUEUE_NAMES.PUBLISHER;
    }
    return null;
  }

  async validateTransition(
    entityType: 'transcript' | 'processingJob',
    entityId: string,
    transition: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      if (entityType === 'transcript') {
        const transcript = await this.transcriptStateMachine.getTranscriptState(entityId);
        if (!transcript) {
          return { valid: false, reason: 'Transcript not found' };
        }
        
        const canTransition = this.transcriptStateMachine.canTransition(
          transcript.status as TranscriptStatus,
          transition
        );
        
        if (!canTransition) {
          const availableTransitions = this.transcriptStateMachine.getAvailableTransitions(
            transcript.status as TranscriptStatus
          );
          return {
            valid: false,
            reason: `Cannot transition from ${transcript.status} using ${transition}. Available transitions: ${availableTransitions.join(', ')}`,
          };
        }
        
        return { valid: true };
      } else {
        const job = await this.processingStateMachine.getJobState(entityId);
        if (!job) {
          return { valid: false, reason: 'Processing job not found' };
        }
        
        const canTransition = this.processingStateMachine.canTransition(job.status, transition);
        
        if (!canTransition) {
          const availableTransitions = this.processingStateMachine.getAvailableTransitions(job.status);
          return {
            valid: false,
            reason: `Cannot transition from ${job.status} using ${transition}. Available transitions: ${availableTransitions.join(', ')}`,
          };
        }
        
        return { valid: true };
      }
    } catch (error) {
      this.logger.error(`Failed to validate transition for ${entityType} ${entityId}:`, error);
      return { valid: false, reason: `Validation error: ${error.message}` };
    }
  }

  async updateEntityJobId(oldJobId: string, newJobId: string): Promise<void> {
    if (oldJobId.startsWith('clean-transcript-')) {
      const entityId = oldJobId.replace('clean-transcript-', '');
      await this.transcriptProcessor.updateTranscriptJobId(entityId, newJobId);
    } else if (oldJobId.startsWith('extract-insights-')) {
      const entityId = oldJobId.replace('extract-insights-', '');
      await this.transcriptProcessor.updateTranscriptJobId(entityId, newJobId);
    } else if (oldJobId.startsWith('generate-posts-')) {
      const entityId = oldJobId.replace('generate-posts-', '');
      await this.insightGenerator.updateInsightJobId(entityId, newJobId);
    }
  }
}