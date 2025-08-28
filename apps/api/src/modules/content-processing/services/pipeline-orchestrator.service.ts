import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { createActor, Actor } from 'xstate';
import { 
  contentPipelineStateMachine, 
  PipelineEvent,
  PipelineActor 
} from '../state/content-pipeline-state-machine';
import { 
  PipelineContext, 
  PipelineState,
  PipelineTemplate,
  PipelineOptions,
  BlockingItem,
  createInitialPipelineContext,
  calculateProgress,
  hasBlockingItems
} from '../state/pipeline-context.types';
import { 
  getTemplateConfig, 
  mergeTemplateOptions,
  recommendTemplate 
} from '../state/pipeline-templates';
import {
  PIPELINE_EVENTS,
  PipelineStartedEvent,
  PipelineProgressEvent,
  PipelineCompletedEvent,
  PipelineFailedEvent,
  PipelineBlockedEvent,
  PipelineManualInterventionRequiredEvent,
  PipelineManualInterventionCompletedEvent,
  createPipelineStartedEvent,
  createPipelineProgressEvent,
  createPipelineBlockedEvent,
  createPipelineFailedEvent,
  createManualInterventionRequiredEvent,
  createManualInterventionCompletedEvent
} from '../events/pipeline.events';
import { PrismaService } from '../../database/prisma.service';
import { ContentProcessingService } from '../content-processing.service';
import { TRANSCRIPT_EVENTS } from '../../transcripts/events/transcript.events';
import { INSIGHT_EVENTS } from '../../insights/events/insight.events';
import { POST_EVENTS } from '../../posts/events/post.events';

/**
 * Pipeline creation options
 */
export interface CreatePipelineOptions {
  transcriptId: string;
  template?: PipelineTemplate;
  options?: Partial<PipelineOptions>;
  metadata?: Record<string, any>;
}

/**
 * Pipeline progress information
 */
export interface PipelineProgress {
  pipelineId: string;
  state: PipelineState;
  progress: number;
  currentStep: string | null;
  completedSteps: number;
  totalSteps: number;
  estimatedCompletion: Date | null;
  blockingItems: BlockingItem[];
  canRetry: boolean;
  metadata: Record<string, any>;
}

/**
 * Pipeline Orchestrator Service
 * Manages pipeline lifecycle and coordinates entity state machines
 */
@Injectable()
export class PipelineOrchestratorService implements OnModuleDestroy {
  private readonly logger = new Logger(PipelineOrchestratorService.name);
  private readonly pipelines = new Map<string, PipelineActor>();
  private readonly pipelineContexts = new Map<string, PipelineContext>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly contentProcessingService: ContentProcessingService
  ) {}

  async onModuleDestroy() {
    // Stop all active pipelines
    for (const [pipelineId, actor] of this.pipelines) {
      try {
        actor.stop();
        this.logger.log(`Stopped pipeline ${pipelineId}`);
      } catch (error) {
        this.logger.error(`Error stopping pipeline ${pipelineId}:`, error);
      }
    }
    this.pipelines.clear();
    this.pipelineContexts.clear();
  }

  /**
   * Start a new pipeline for a transcript
   */
  async startPipeline(options: CreatePipelineOptions): Promise<PipelineProgress> {
    const { transcriptId, template = 'standard', options: pipelineOptions = {}, metadata = {} } = options;

    // Validate transcript exists
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: transcriptId }
    });

    if (!transcript) {
      throw new Error(`Transcript ${transcriptId} not found`);
    }

    // Check if pipeline already exists for this transcript
    const existingPipeline = await this.prisma.pipeline.findFirst({
      where: {
        transcriptId,
        state: {
          notIn: [PipelineState.COMPLETED, PipelineState.FAILED, PipelineState.CANCELLED]
        }
      }
    });

    if (existingPipeline) {
      throw new Error(`Active pipeline already exists for transcript ${transcriptId}`);
    }

    // Recommend template if needed
    const recommendedTemplate = template === 'custom' 
      ? recommendTemplate(transcript.wordCount, transcript.sourceType || undefined)
      : template;

    // Get template configuration
    const templateConfig = getTemplateConfig(recommendedTemplate);
    const mergedOptions = mergeTemplateOptions(recommendedTemplate, pipelineOptions);

    // Create pipeline record in database
    const pipeline = await this.prisma.pipeline.create({
      data: {
        transcriptId,
        state: PipelineState.IDLE,
        template: recommendedTemplate,
        options: mergedOptions as any,
        metadata,
        estimatedDuration: templateConfig.estimatedDuration,
        totalSteps: templateConfig.steps.length
      }
    });

    // Create initial context
    const context = createInitialPipelineContext(
      pipeline.id,
      transcriptId,
      mergedOptions
    );

    // Add template steps to context
    context.steps = templateConfig.steps.map(step => ({
      id: step.id,
      name: step.name,
      status: 'pending',
      retryCount: 0
    }));
    context.totalSteps = templateConfig.steps.length;

    // Create and start state machine actor
    const actor = createActor(contentPipelineStateMachine, {
      input: context,
      id: pipeline.id
    });

    // Subscribe to state changes
    actor.subscribe(snapshot => {
      this.handleStateChange(pipeline.id, snapshot);
    });

    // Store actor and context
    this.pipelines.set(pipeline.id, actor);
    this.pipelineContexts.set(pipeline.id, context);

    // Start the actor
    actor.start();

    // Send START event to begin processing
    actor.send({ type: 'START', transcriptId, options: mergedOptions });

    // Emit pipeline started event
    const startedEvent = createPipelineStartedEvent(
      pipeline.id,
      transcriptId,
      mergedOptions,
      recommendedTemplate
    );
    this.eventEmitter.emit(PIPELINE_EVENTS.STARTED, startedEvent);

    this.logger.log(`Started pipeline ${pipeline.id} for transcript ${transcriptId} with template ${recommendedTemplate}`);

    return this.getProgress(pipeline.id);
  }

  /**
   * Pause an active pipeline
   */
  async pausePipeline(pipelineId: string): Promise<PipelineProgress> {
    const actor = this.pipelines.get(pipelineId);
    if (!actor) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    actor.send({ type: 'PAUSE' });

    await this.prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        state: PipelineState.PAUSED,
        pausedAt: new Date()
      }
    });

    this.eventEmitter.emit(PIPELINE_EVENTS.PAUSED, {
      pipelineId,
      timestamp: new Date()
    });

    this.logger.log(`Paused pipeline ${pipelineId}`);
    return this.getProgress(pipelineId);
  }

  /**
   * Resume a paused pipeline
   */
  async resumePipeline(pipelineId: string): Promise<PipelineProgress> {
    const actor = this.pipelines.get(pipelineId);
    if (!actor) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    actor.send({ type: 'RESUME' });

    await this.prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        state: PipelineState.INITIALIZING, // Will be updated by state machine
        pausedAt: null
      }
    });

    this.eventEmitter.emit(PIPELINE_EVENTS.RESUMED, {
      pipelineId,
      timestamp: new Date()
    });

    this.logger.log(`Resumed pipeline ${pipelineId}`);
    return this.getProgress(pipelineId);
  }

  /**
   * Retry a failed pipeline
   */
  async retryPipeline(pipelineId: string): Promise<PipelineProgress> {
    const actor = this.pipelines.get(pipelineId);
    const context = this.pipelineContexts.get(pipelineId);
    
    if (!actor || !context) {
      // Reload from database if not in memory
      const pipeline = await this.prisma.pipeline.findUnique({
        where: { id: pipelineId }
      });

      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      if (pipeline.state !== PipelineState.FAILED && pipeline.state !== PipelineState.PARTIALLY_COMPLETED) {
        throw new Error(`Pipeline ${pipelineId} is not in a retryable state`);
      }

      // Recreate pipeline with incremented retry count
      return this.startPipeline({
        transcriptId: pipeline.transcriptId,
        template: pipeline.template as PipelineTemplate,
        options: pipeline.options as PipelineOptions,
        metadata: {
          ...(pipeline.metadata as any),
          retryCount: pipeline.retryCount + 1,
          previousPipelineId: pipelineId
        }
      });
    }

    actor.send({ type: 'RETRY' });

    await this.prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        retryCount: { increment: 1 },
        state: PipelineState.INITIALIZING
      }
    });

    this.eventEmitter.emit(PIPELINE_EVENTS.RETRY, {
      pipelineId,
      timestamp: new Date()
    });

    this.logger.log(`Retrying pipeline ${pipelineId}`);
    return this.getProgress(pipelineId);
  }

  /**
   * Cancel an active pipeline
   */
  async cancelPipeline(pipelineId: string, reason?: string): Promise<void> {
    const actor = this.pipelines.get(pipelineId);
    if (!actor) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    actor.send({ type: 'CANCEL' });

    await this.prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        state: PipelineState.CANCELLED,
        completedAt: new Date(),
        metadata: {
          ...(await this.prisma.pipeline.findUnique({ where: { id: pipelineId } }))?.metadata as any,
          cancellationReason: reason
        }
      }
    });

    this.eventEmitter.emit(PIPELINE_EVENTS.CANCELLED, {
      pipelineId,
      reason,
      timestamp: new Date()
    });

    // Clean up
    this.pipelines.delete(pipelineId);
    this.pipelineContexts.delete(pipelineId);

    this.logger.log(`Cancelled pipeline ${pipelineId}${reason ? `: ${reason}` : ''}`);
  }

  /**
   * Get pipeline progress
   */
  async getProgress(pipelineId: string): Promise<PipelineProgress> {
    const context = this.pipelineContexts.get(pipelineId);
    const actor = this.pipelines.get(pipelineId);

    if (!context || !actor) {
      // Try to load from database
      const pipeline = await this.prisma.pipeline.findUnique({
        where: { id: pipelineId }
      });

      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      return {
        pipelineId,
        state: pipeline.state as PipelineState,
        progress: pipeline.progress,
        currentStep: pipeline.currentStep,
        completedSteps: pipeline.completedSteps,
        totalSteps: pipeline.totalSteps,
        estimatedCompletion: this.calculateEstimatedCompletion(pipeline),
        blockingItems: (pipeline.blockingItems as any || []) as BlockingItem[],
        canRetry: pipeline.retryCount < 3,
        metadata: pipeline.metadata as Record<string, any> || {}
      };
    }

    const snapshot = actor.getSnapshot();
    const currentState = snapshot.value as PipelineState;

    return {
      pipelineId,
      state: currentState,
      progress: calculateProgress(context),
      currentStep: context.currentStep,
      completedSteps: context.completedSteps,
      totalSteps: context.totalSteps,
      estimatedCompletion: context.estimatedCompletion,
      blockingItems: context.blockingItems,
      canRetry: context.retryCount < context.maxRetries,
      metadata: context.metadata
    };
  }

  /**
   * Get estimated completion time for a pipeline
   */
  async getEstimatedCompletion(pipelineId: string): Promise<Date | null> {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId }
    });

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    return this.calculateEstimatedCompletion(pipeline);
  }

  /**
   * Get blocking items for a pipeline
   */
  async getBlockingItems(pipelineId: string): Promise<BlockingItem[]> {
    const context = this.pipelineContexts.get(pipelineId);
    
    if (context) {
      return context.blockingItems;
    }

    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId }
    });

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    return (pipeline.blockingItems as any || []) as BlockingItem[];
  }

  /**
   * Get all active pipelines
   */
  async getActivePipelines(): Promise<PipelineProgress[]> {
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        state: {
          notIn: [PipelineState.COMPLETED, PipelineState.FAILED, PipelineState.CANCELLED]
        }
      }
    });

    return Promise.all(pipelines.map(p => this.getProgress(p.id)));
  }

  /**
   * Get pipeline history for a transcript
   */
  async getPipelineHistory(transcriptId: string): Promise<any[]> {
    return this.prisma.pipeline.findMany({
      where: { transcriptId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Start manual intervention tracking
   */
  async startManualIntervention(
    pipelineId: string,
    entityId: string,
    userId: string
  ): Promise<void> {
    const context = this.pipelineContexts.get(pipelineId);
    if (!context) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    // Find the blocking item
    const blockingItem = context.blockingItems.find(item => item.entityId === entityId);
    if (!blockingItem) {
      throw new Error(`Blocking item for entity ${entityId} not found`);
    }

    // Update blocking item with start time
    blockingItem.startedAt = new Date();
    
    // Update context
    this.pipelineContexts.set(pipelineId, context);
    
    // Update database
    await this.prisma.pipeline.update({
      where: { id: pipelineId },
      data: { blockingItems: context.blockingItems as any }
    });

    this.logger.log(`Manual intervention started for ${entityId} in pipeline ${pipelineId} by ${userId}`);
  }

  /**
   * Complete manual intervention
   */
  async completeManualIntervention(
    pipelineId: string,
    entityId: string,
    action: 'approved' | 'rejected' | 'resolved' | 'skipped',
    userId: string,
    notes?: string
  ): Promise<void> {
    const context = this.pipelineContexts.get(pipelineId);
    const actor = this.pipelines.get(pipelineId);
    
    if (!context || !actor) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    // Find the blocking item
    const blockingItemIndex = context.blockingItems.findIndex(item => item.entityId === entityId);
    if (blockingItemIndex === -1) {
      throw new Error(`Blocking item for entity ${entityId} not found`);
    }

    const blockingItem = context.blockingItems[blockingItemIndex];
    const duration = blockingItem.startedAt 
      ? Date.now() - blockingItem.startedAt.getTime()
      : 0;

    // Update blocking item
    blockingItem.completedAt = new Date();
    blockingItem.completedBy = userId;
    blockingItem.action = action;

    // Emit manual intervention completed event
    const completedEvent = createManualInterventionCompletedEvent(
      pipelineId,
      context.transcriptId,
      blockingItem.type as 'insight_review' | 'post_review' | 'error_resolution',
      blockingItem.entityType,
      [entityId],
      action,
      userId,
      duration
    );
    this.eventEmitter.emit(PIPELINE_EVENTS.MANUAL_INTERVENTION_COMPLETED, completedEvent);

    // Send appropriate event to state machine based on entity type and action
    if (blockingItem.type === 'insight_review') {
      if (action === 'approved') {
        actor.send({ type: 'INSIGHT_APPROVED', insightId: entityId, approvedBy: userId });
      } else if (action === 'rejected') {
        actor.send({ type: 'INSIGHT_REJECTED', insightId: entityId, reason: notes });
      }
    } else if (blockingItem.type === 'post_review') {
      // Get platform from the post context
      const postState = context.posts.get(entityId);
      if (!postState) {
        throw new Error(`Post ${entityId} not found in pipeline context`);
      }

      if (action === 'approved') {
        actor.send({ type: 'POST_APPROVED', postId: entityId, platform: postState.platform });
      } else if (action === 'rejected') {
        actor.send({ type: 'POST_REJECTED', postId: entityId, reason: notes });
      }
    }

    // Remove blocking item
    context.blockingItems.splice(blockingItemIndex, 1);
    
    // Check if all items are reviewed for the current state
    const remainingInsightReviews = context.blockingItems.filter(i => i.type === 'insight_review').length;
    const remainingPostReviews = context.blockingItems.filter(i => i.type === 'post_review').length;

    if (context.currentStep === 'reviewingInsights' && remainingInsightReviews === 0) {
      actor.send({ type: 'ALL_INSIGHTS_REVIEWED' });
    } else if (context.currentStep === 'reviewingPosts' && remainingPostReviews === 0) {
      actor.send({ type: 'ALL_POSTS_REVIEWED' });
    }

    this.logger.log(`Manual intervention completed for ${entityId} in pipeline ${pipelineId}: ${action} by ${userId}`);
  }

  /**
   * Handle state machine state changes
   */
  private async handleStateChange(pipelineId: string, snapshot: any) {
    const context = snapshot.context as PipelineContext;
    const state = snapshot.value as PipelineState;

    // Update context in memory
    this.pipelineContexts.set(pipelineId, context);

    // Update database
    try {
      await this.prisma.pipeline.update({
        where: { id: pipelineId },
        data: {
          state,
          currentStep: context.currentStep,
          progress: context.progress,
          completedSteps: context.completedSteps,
          insightIds: context.insightIds,
          postIds: context.postIds,
          failedSteps: context.failedSteps,
          successfulSteps: context.successfulSteps,
          blockingItems: context.blockingItems as any,
          lastError: context.lastError,
          startedAt: context.startedAt,
          pausedAt: context.pausedAt,
          completedAt: context.completedAt,
          failedAt: context.failedAt
        }
      });

      // Emit progress event
      const progressEvent = createPipelineProgressEvent(
        pipelineId,
        context.transcriptId,
        state,
        context.progress,
        context.completedSteps,
        context.totalSteps
      );
      this.eventEmitter.emit(PIPELINE_EVENTS.PROGRESS, progressEvent);

      // Check for blocking items and emit intervention events
      if (hasBlockingItems(context)) {
        const blockedEvent = createPipelineBlockedEvent(
          pipelineId,
          context.transcriptId,
          context.blockingItems,
          state
        );
        this.eventEmitter.emit(PIPELINE_EVENTS.BLOCKED, blockedEvent);

        // Emit manual intervention required events for new blocking items
        const newBlockingItems = context.blockingItems.filter(item => !item.startedAt && !item.completedAt);
        
        if (newBlockingItems.length > 0) {
          // Group by type for batch events
          const insightReviews = newBlockingItems.filter(i => i.type === 'insight_review');
          const postReviews = newBlockingItems.filter(i => i.type === 'post_review');
          
          if (insightReviews.length > 0) {
            const interventionEvent = createManualInterventionRequiredEvent(
              pipelineId,
              context.transcriptId,
              'insight_review',
              'insight',
              insightReviews.map(i => i.entityId),
              `${insightReviews.length} insights require review`,
              state === PipelineState.REVIEWING_INSIGHTS ? 'high' : 'medium'
            );
            this.eventEmitter.emit(PIPELINE_EVENTS.MANUAL_INTERVENTION_REQUIRED, interventionEvent);
          }
          
          if (postReviews.length > 0) {
            const interventionEvent = createManualInterventionRequiredEvent(
              pipelineId,
              context.transcriptId,
              'post_review',
              'post',
              postReviews.map(i => i.entityId),
              `${postReviews.length} posts require review`,
              state === PipelineState.REVIEWING_POSTS ? 'high' : 'medium'
            );
            this.eventEmitter.emit(PIPELINE_EVENTS.MANUAL_INTERVENTION_REQUIRED, interventionEvent);
          }
        }
      }

      // Clean up completed/failed pipelines
      if (state === PipelineState.COMPLETED || 
          state === PipelineState.FAILED || 
          state === PipelineState.CANCELLED) {
        setTimeout(() => {
          this.pipelines.delete(pipelineId);
          this.pipelineContexts.delete(pipelineId);
        }, 5000); // Keep in memory for 5 seconds for final queries
      }
    } catch (error) {
      this.logger.error(`Error updating pipeline ${pipelineId} state:`, error);
    }
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(pipeline: any): Date | null {
    if (!pipeline.startedAt || !pipeline.estimatedDuration) {
      return null;
    }

    if (pipeline.state === PipelineState.COMPLETED || 
        pipeline.state === PipelineState.FAILED ||
        pipeline.state === PipelineState.CANCELLED) {
      return pipeline.completedAt;
    }

    const elapsed = Date.now() - new Date(pipeline.startedAt).getTime();
    const progressRatio = pipeline.progress / 100;
    
    if (progressRatio === 0) {
      return new Date(Date.now() + pipeline.estimatedDuration);
    }

    const estimatedTotal = elapsed / progressRatio;
    const remaining = estimatedTotal - elapsed;
    
    return new Date(Date.now() + remaining);
  }

  /**
   * Event handlers for entity state changes
   */

  @OnEvent(TRANSCRIPT_EVENTS.PROCESSING_COMPLETED)
  async handleTranscriptCleaned(event: any) {
    // Find pipeline for this transcript
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        transcriptId: event.transcriptId,
        state: PipelineState.CLEANING_TRANSCRIPT
      }
    });

    if (pipeline) {
      const actor = this.pipelines.get(pipeline.id);
      if (actor) {
        actor.send({
          type: 'TRANSCRIPT_CLEANED',
          transcriptId: event.transcriptId,
          wordCount: event.wordCount || 0
        });
      }
    }
  }

  @OnEvent(INSIGHT_EVENTS.EXTRACTED)
  async handleInsightsExtracted(event: any) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        transcriptId: event.transcriptId,
        state: PipelineState.EXTRACTING_INSIGHTS
      }
    });

    if (pipeline) {
      const actor = this.pipelines.get(pipeline.id);
      if (actor) {
        actor.send({
          type: 'INSIGHTS_EXTRACTED',
          insightIds: event.insightIds,
          count: event.insightIds.length
        });
      }
    }
  }

  @OnEvent(INSIGHT_EVENTS.APPROVED)
  async handleInsightApproved(event: any) {
    // Find pipeline containing this insight
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        insightIds: { has: event.insightId },
        state: PipelineState.REVIEWING_INSIGHTS
      }
    });

    for (const pipeline of pipelines) {
      const actor = this.pipelines.get(pipeline.id);
      if (actor) {
        actor.send({
          type: 'INSIGHT_APPROVED',
          insightId: event.insightId,
          approvedBy: event.approvedBy
        });

        // Check if all insights are reviewed
        const context = this.pipelineContexts.get(pipeline.id);
        if (context) {
          const allReviewed = Array.from(context.insights.values()).every(
            i => i.status === 'approved' || i.status === 'rejected'
          );
          if (allReviewed) {
            actor.send({ type: 'ALL_INSIGHTS_REVIEWED' });
          }
        }
      }
    }
  }

  @OnEvent(POST_EVENTS.GENERATED)
  async handlePostsGenerated(event: any) {
    // Find pipeline for this insight
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        insightIds: { has: event.insightId },
        state: PipelineState.GENERATING_POSTS
      }
    });

    for (const pipeline of pipelines) {
      const actor = this.pipelines.get(pipeline.id);
      if (actor) {
        actor.send({
          type: 'POSTS_GENERATED',
          postIds: event.postIds,
          insightId: event.insightId
        });
      }
    }
  }

  @OnEvent(POST_EVENTS.APPROVED)
  async handlePostApproved(event: any) {
    // Find pipeline containing this post
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        postIds: { has: event.postId },
        state: PipelineState.REVIEWING_POSTS
      }
    });

    for (const pipeline of pipelines) {
      const actor = this.pipelines.get(pipeline.id);
      if (actor) {
        actor.send({
          type: 'POST_APPROVED',
          postId: event.postId,
          platform: event.platform
        });

        // Check if all posts are reviewed
        const context = this.pipelineContexts.get(pipeline.id);
        if (context) {
          const allReviewed = Array.from(context.posts.values()).every(
            p => p.status === 'approved' || p.status === 'rejected' || p.status === 'scheduled'
          );
          if (allReviewed) {
            actor.send({ type: 'ALL_POSTS_REVIEWED' });
          }
        }
      }
    }
  }
}