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
import { 
  TranscriptStatus, 
  InsightStatus,
  CreatePipelineOptions,
  PipelineProgress,
  PipelineHistory,
  BlockingItem,
  ManualIntervention,
  JobType,
  ProcessingJobStatus,
  BlockingItemType,
  PipelineStatus,
  PipelineStage
} from '@content-creation/types';
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
      const cancelled = await this.queueManager.cancelJob(CONTENT_QUEUE_NAMES.CLEAN_TRANSCRIPT, jobId);
      if (!cancelled) {
        this.logger.warn(`Could not cancel job ${jobId} - it may have already started processing`);
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

  /**
   * Pipeline Management Methods
   * These methods provide high-level pipeline orchestration capabilities
   */

  async startPipeline(options: CreatePipelineOptions): Promise<PipelineProgress> {
    const { transcriptId } = options;
    
    // Start the pipeline by triggering transcript cleaning
    const { jobId } = await this.triggerTranscriptCleaning(transcriptId);
    
    // Create a pipeline progress object
    const progress: PipelineProgress = {
      pipelineId: `pipeline-${transcriptId}-${Date.now()}`,
      transcriptId,
      status: PipelineStatus.PROCESSING,
      currentStage: PipelineStage.TRANSCRIPT_CLEANING,
      progress: 0,
      stages: [
        { name: PipelineStage.TRANSCRIPT_CLEANING, status: 'processing', startedAt: new Date() },
        { name: PipelineStage.INSIGHT_EXTRACTION, status: 'pending' },
        { name: PipelineStage.POST_GENERATION, status: 'pending' },
      ],
      startedAt: new Date(),
      metadata: options.metadata,
    };
    
    // Store pipeline metadata in processing job
    await this.processingStateMachine.updateJobMetadata(jobId, {
      pipelineId: progress.pipelineId,
      pipelineOptions: options.options,
    });
    
    return progress;
  }

  async getProgress(pipelineId: string): Promise<PipelineProgress> {
    // Extract transcript ID from pipeline ID
    const transcriptId = pipelineId.split('-')[1];
    
    if (!transcriptId) {
      throw new Error(`Invalid pipeline ID: ${pipelineId}`);
    }
    
    // Get current state from state machines
    const transcriptState = await this.transcriptStateMachine.getTranscriptState(transcriptId);
    const jobs = await this.processingStateMachine.getJobsBySourceId(transcriptId);
    
    // Calculate progress based on completed jobs, not transcript status
    let currentStage = PipelineStage.TRANSCRIPT_CLEANING;
    let progress = 0;
    let pipelineStatus: PipelineStatus = PipelineStatus.PROCESSING;
    
    // Check what jobs have been completed based on job type
    const cleanJob = jobs.find(j => j.jobType === JobType.CLEAN_TRANSCRIPT);
    const insightJob = jobs.find(j => j.jobType === JobType.EXTRACT_INSIGHTS);
    const postJob = jobs.find(j => j.jobType === JobType.GENERATE_POSTS);
    
    // Determine current stage and progress based on job completions
    if (cleanJob?.status === ProcessingJobStatus.COMPLETED) {
      currentStage = PipelineStage.INSIGHT_EXTRACTION;
      progress = 33;
      
      if (insightJob?.status === ProcessingJobStatus.COMPLETED) {
        currentStage = PipelineStage.POST_GENERATION;
        progress = 66;
        
        if (postJob?.status === ProcessingJobStatus.COMPLETED) {
          currentStage = PipelineStage.COMPLETED;
          progress = 100;
          pipelineStatus = PipelineStatus.COMPLETED;
        }
      }
    }
    
    // Check for failure states
    if (transcriptState?.status === TranscriptStatus.FAILED || 
        jobs.some(j => j.status === ProcessingJobStatus.FAILED)) {
      pipelineStatus = PipelineStatus.FAILED;
    }
    
    const pipelineProgress: PipelineProgress = {
      pipelineId,
      transcriptId,
      status: pipelineStatus,
      currentStage,
      progress,
      stages: [
        { 
          name: PipelineStage.TRANSCRIPT_CLEANING, 
          status: cleanJob?.status === ProcessingJobStatus.COMPLETED ? 'completed' : 
                  cleanJob?.status === ProcessingJobStatus.PROCESSING ? 'processing' : 'pending',
          startedAt: cleanJob?.createdAt,
          completedAt: cleanJob?.status === ProcessingJobStatus.COMPLETED ? cleanJob?.updatedAt : undefined,
        },
        { 
          name: PipelineStage.INSIGHT_EXTRACTION, 
          status: insightJob?.status === ProcessingJobStatus.COMPLETED ? 'completed' : 
                  insightJob?.status === ProcessingJobStatus.PROCESSING ? 'processing' : 
                  cleanJob?.status === ProcessingJobStatus.COMPLETED ? 'pending' : 'pending',
        },
        { 
          name: PipelineStage.POST_GENERATION, 
          status: postJob?.status === ProcessingJobStatus.COMPLETED ? 'completed' : 
                  postJob?.status === ProcessingJobStatus.PROCESSING ? 'processing' :
                  insightJob?.status === ProcessingJobStatus.COMPLETED ? 'pending' : 'pending',
        },
      ],
    };
    
    return pipelineProgress;
  }

  async pausePipeline(pipelineId: string): Promise<PipelineProgress> {
    const progress = await this.getProgress(pipelineId);
    
    // Pause all active jobs for this transcript
    const jobs = await this.processingStateMachine.getJobsBySourceId(progress.transcriptId);
    for (const job of jobs) {
      if (job.status === 'processing') {
        await this.processingStateMachine.transition({
          type: 'PAUSE',
          jobId: job.id,
        });
      }
    }
    
    progress.status = PipelineStatus.PAUSED;
    return progress;
  }

  async resumePipeline(pipelineId: string): Promise<PipelineProgress> {
    const progress = await this.getProgress(pipelineId);
    
    // Resume all paused jobs for this transcript
    const jobs = await this.processingStateMachine.getJobsBySourceId(progress.transcriptId);
    for (const job of jobs) {
      if (job.status === 'paused') {
        await this.processingStateMachine.transition({
          type: 'RESUME',
          jobId: job.id,
        });
      }
    }
    
    progress.status = PipelineStatus.PROCESSING;
    return progress;
  }

  async retryPipeline(pipelineId: string): Promise<PipelineProgress> {
    const progress = await this.getProgress(pipelineId);
    
    // Retry failed jobs for this transcript
    const jobs = await this.processingStateMachine.getJobsBySourceId(progress.transcriptId);
    for (const job of jobs) {
      if (job.status === 'failed') {
        await this.processingStateMachine.transition({
          type: 'RETRY',
          jobId: job.id,
        });
      }
    }
    
    progress.status = PipelineStatus.PROCESSING;
    return progress;
  }

  async cancelPipeline(pipelineId: string, reason?: string): Promise<void> {
    const progress = await this.getProgress(pipelineId);
    
    // Cancel all jobs for this transcript
    const jobs = await this.processingStateMachine.getJobsBySourceId(progress.transcriptId);
    for (const job of jobs) {
      if (job.status !== 'completed' && job.status !== 'cancelled') {
        await this.processingStateMachine.transition({
          type: 'CANCEL',
          jobId: job.id,
          reason,
        });
      }
    }
    
    this.logger.log(`Pipeline ${pipelineId} cancelled${reason ? `: ${reason}` : ''}`);
  }

  async getBlockingItems(pipelineId: string): Promise<BlockingItem[]> {
    const progress = await this.getProgress(pipelineId);
    const blockingItems: BlockingItem[] = [];
    
    // Check for insights needing review  
    const insights = await this.insightGenerator.findByTranscriptId(progress.transcriptId);
    for (const insight of insights) {
      if (insight.status === InsightStatus.NEEDS_REVIEW) {
        blockingItems.push({
          id: `blocking-${insight.id}`,
          type: BlockingItemType.INSIGHT_REVIEW,
          entityId: insight.id,
          entityType: 'insight',
          description: `Insight "${insight.title}" needs review`,
          requiredAction: 'Review and approve or reject the insight',
          createdAt: insight.createdAt,
        });
      }
    }
    
    // Check for posts needing review
    const posts = await this.postComposer.getPostsByTranscriptId(progress.transcriptId);
    for (const post of posts) {
      if (post.status === 'needs_review') {
        blockingItems.push({
          id: `blocking-${post.id}`,
          type: BlockingItemType.POST_REVIEW,
          entityId: post.id,
          entityType: 'post',
          description: `Post for ${post.platform} needs review`,
          requiredAction: 'Review and approve or reject the post',
          createdAt: post.createdAt,
        });
      }
    }
    
    // Check for failed jobs
    const jobs = await this.processingStateMachine.getJobsBySourceId(progress.transcriptId);
    for (const job of jobs) {
      if (job.status === ProcessingJobStatus.FAILED) {
        blockingItems.push({
          id: `blocking-${job.id}`,
          type: BlockingItemType.ERROR,
          entityId: job.id,
          entityType: 'transcript',
          description: `Job ${job.jobType} failed: ${job.errorMessage || 'Unknown error'}`,
          requiredAction: 'Retry the failed job or investigate the error',
          createdAt: job.updatedAt,
        });
      }
    }
    
    return blockingItems;
  }

  async getEstimatedCompletion(pipelineId: string): Promise<Date | null> {
    const progress = await this.getProgress(pipelineId);
    
    if (progress.status === 'completed') {
      return progress.completedAt || null;
    }
    
    // Estimate based on average processing times
    const avgTranscriptTime = 30000; // 30 seconds
    const avgInsightTime = 45000; // 45 seconds
    const avgPostTime = 20000; // 20 seconds per platform
    
    let remainingTime = 0;
    
    if (progress.currentStage === 'transcript_cleaning') {
      remainingTime = avgTranscriptTime + avgInsightTime + avgPostTime;
    } else if (progress.currentStage === 'insight_extraction') {
      remainingTime = avgInsightTime + avgPostTime;
    } else if (progress.currentStage === 'post_generation') {
      remainingTime = avgPostTime;
    }
    
    return remainingTime > 0 ? new Date(Date.now() + remainingTime) : null;
  }

  async getActivePipelines(): Promise<PipelineProgress[]> {
    // Get all active processing jobs
    const activeJobs = await this.processingStateMachine.getJobsByStatus('processing');
    const pipelines: PipelineProgress[] = [];
    
    // Get unique transcript IDs
    const transcriptIds = [...new Set(activeJobs.map(job => job.sourceId))];
    
    for (const transcriptId of transcriptIds) {
      const pipelineId = `pipeline-${transcriptId}-active`;
      const progress = await this.getProgress(pipelineId);
      pipelines.push(progress);
    }
    
    return pipelines;
  }

  async getPipelineHistory(transcriptId: string): Promise<PipelineHistory[]> {
    // Get all jobs for this transcript
    const jobs = await this.processingStateMachine.getJobsBySourceId(transcriptId);
    
    // Group jobs by pipeline run (based on creation time clusters)
    const history: PipelineHistory[] = [];
    
    if (jobs.length > 0) {
      const pipelineRun: PipelineHistory = {
        pipelineId: `pipeline-${transcriptId}-${jobs[0].createdAt.getTime()}`,
        transcriptId,
        status: jobs.some(j => j.status === 'failed') ? 'failed' : 
                jobs.every(j => j.status === 'completed') ? 'completed' : 'processing',
        startedAt: jobs[0].createdAt,
        completedAt: jobs.every(j => j.status === 'completed') ? 
                     jobs[jobs.length - 1].updatedAt : undefined,
        stages: jobs.map(job => ({
          name: job.jobType,
          status: job.status,
          duration: job.updatedAt ? job.updatedAt.getTime() - job.createdAt.getTime() : undefined,
        })),
      };
      
      if (pipelineRun.completedAt) {
        pipelineRun.duration = pipelineRun.completedAt.getTime() - pipelineRun.startedAt.getTime();
      }
      
      history.push(pipelineRun);
    }
    
    return history;
  }

  async startManualIntervention(
    pipelineId: string,
    entityId: string,
    entityType: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const progress = await this.getProgress(pipelineId);
    
    // Create manual intervention record
    const intervention: ManualIntervention = {
      pipelineId,
      entityId,
      entityType,
      reason,
      requiredAction: 'Manual review required',
      metadata,
    };
    
    // Pause the pipeline
    await this.pausePipeline(pipelineId);
    
    this.logger.log(`Manual intervention started for pipeline ${pipelineId}: ${reason}`);
  }

  async completeManualIntervention(
    pipelineId: string,
    entityId: string,
    resolution: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Resume the pipeline
    await this.resumePipeline(pipelineId);
    
    this.logger.log(`Manual intervention completed for pipeline ${pipelineId}: ${resolution}`);
  }
}