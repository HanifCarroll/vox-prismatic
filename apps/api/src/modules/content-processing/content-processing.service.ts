import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { QueueManager } from '@content-creation/queue';
import type { 
  CleanTranscriptProcessorDependencies, 
  ExtractInsightsProcessorDependencies,
  GeneratePostsProcessorDependencies
} from '@content-creation/queue';

import { AIService } from '../ai/ai.service';
import { TranscriptService } from '../transcripts/transcript.service';
import { InsightService } from '../insights/insight.service';
import { PostService } from '../posts/post.service';
import { PrismaService } from '../database/prisma.service';
import { InsightStatus } from '../insights/dto/update-insight.dto';
import { PostStatus } from '../posts/dto/update-post.dto';
import type { Prisma } from '@prisma/client';
import { JobStatusDto } from './dto/job-status.dto';
import { CONTENT_QUEUE_NAMES, QUEUE_NAMES } from '@content-creation/queue/dist/config';

@Injectable()
export class ContentProcessingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContentProcessingService.name);

  constructor(
    @Inject('QUEUE_MANAGER') private readonly queueManager: QueueManager,
    private readonly aiService: AIService,
    private readonly transcriptService: TranscriptService,
    private readonly insightService: InsightService,
    private readonly postService: PostService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      // QueueManager is already connected by QueueModule
      // Start all content processors with their dependencies
      await this.startProcessors();
      
      this.logger.log('Content processing service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize content processing service', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.queueManager.stopContentProcessors();
      // QueueManager shutdown is handled by QueueModule
      this.logger.log('Content processing service shutdown complete');
    } catch (error) {
      this.logger.error('Error during content processing service shutdown', error);
    }
  }

  /**
   * Start all content processors with their dependencies
   */
  private async startProcessors(): Promise<void> {
    // Clean Transcript Processor Dependencies
    const cleanTranscriptDeps: CleanTranscriptProcessorDependencies = {
      cleanTranscript: async (transcriptId: string, rawContent: string) => {
        this.logger.log(`Processing transcript cleaning for ${transcriptId}`);
        
        // Get transcript details for title
        const transcript = await this.prisma.transcript.findUnique({
          where: { id: transcriptId },
        });
        
        const result = await this.aiService.cleanTranscript({
          transcriptId,
          title: transcript?.title || 'Transcript',
          content: rawContent,
        });
        return {
          cleanedContent: result.cleanedText,
          wordCount: result.cleanedText.split(' ').length,
          processingDurationMs: result.duration,
        };
      },
      
      updateTranscript: async (transcriptId: string, updates: Prisma.TranscriptUpdateInput) => {
        this.logger.log(`Updating transcript ${transcriptId} with cleaned content`);
        await this.prisma.transcript.update({
          where: { id: transcriptId },
          data: updates,
        });
      },
      
      triggerInsightExtraction: async (transcriptId: string, cleanedContent: string) => {
        this.logger.log(`Auto-triggering insight extraction for transcript ${transcriptId}`);
        const { jobId } = await this.queueManager.contentQueue.extractInsights({
          transcriptId,
          cleanedContent,
        });
        
        // Update transcript with insight extraction job ID
        await this.prisma.transcript.update({
          where: { id: transcriptId },
          data: { queueJobId: jobId },
        });
      },
    };

    // Extract Insights Processor Dependencies
    const extractInsightsDeps: ExtractInsightsProcessorDependencies = {
      extractInsights: async (transcriptId: string, cleanedContent: string) => {
        this.logger.log(`Processing insight extraction for transcript ${transcriptId}`);
        const result = await this.aiService.extractInsights({
          transcriptId,
          content: cleanedContent,
        });
        
        // Create insights in database
        const insights = await Promise.all(
          result.insights.map(async (insight) => {
            return await this.prisma.insight.create({
              data: {
                cleanedTranscriptId: transcriptId,
                title: insight.title,
                summary: insight.summary,
                verbatimQuote: insight.quote,
                category: insight.category,
                postType: insight.postType,
                urgencyScore: insight.scores.urgency,
                relatabilityScore: insight.scores.relatability,
                specificityScore: insight.scores.specificity,
                authorityScore: insight.scores.authority,
                totalScore: insight.scores.total,
                status: InsightStatus.NEEDS_REVIEW, // Start as needs_review - awaiting human approval
                processingDurationMs: result.duration,
                estimatedTokens: 0, // Not provided by current AI service
                estimatedCost: result.cost,
              },
            });
          })
        );
        
        return {
          insights: insights.map(insight => ({
            id: insight.id,
            title: insight.title,
            summary: insight.summary,
            verbatimQuote: insight.verbatimQuote,
            category: insight.category,
            postType: insight.postType,
            urgencyScore: insight.urgencyScore,
            relatabilityScore: insight.relatabilityScore,
            specificityScore: insight.specificityScore,
            authorityScore: insight.authorityScore,
            totalScore: insight.totalScore,
          })),
          processingDurationMs: result.duration,
          estimatedTokens: 0, // Not provided by current AI service
          estimatedCost: result.cost,
        };
      },
      
      updateTranscriptProcessingStatus: async (transcriptId: string, updates: Prisma.TranscriptUpdateInput) => {
        const logMessage = updates.status === 'failed' 
          ? `Marking transcript ${transcriptId} as failed` 
          : `Clearing processing status for transcript ${transcriptId}`;
        this.logger.log(logMessage);
        await this.prisma.transcript.update({
          where: { id: transcriptId },
          data: updates,
        });
      },
    };

    // Generate Posts Processor Dependencies
    const generatePostsDeps: GeneratePostsProcessorDependencies = {
      generatePosts: async (insightId: string, insightContent: string, platforms) => {
        this.logger.log(`Processing post generation for insight ${insightId}`);
        
        // Get the insight details
        const insight = await this.prisma.insight.findUnique({
          where: { id: insightId },
        });
        
        if (!insight) {
          throw new Error(`Insight ${insightId} not found`);
        }
        
        const result = await this.aiService.generatePosts({
          insightId,
          insightTitle: insight.title,
          content: `${insight.summary}\n\nQuote: "${insight.verbatimQuote}"`,
          platforms: platforms as string[],
        });
        
        // Create posts in database from the result structure
        const posts = [];
        
        if (result.posts.linkedinPost) {
          const linkedinPost = await this.prisma.post.create({
            data: {
              insightId,
              platform: 'linkedin',
              title: result.posts.linkedinPost.hook,
              content: result.posts.linkedinPost.full,
              characterCount: result.posts.linkedinPost.full.length,
              status: PostStatus.NEEDS_REVIEW, // Start as needs_review - awaiting human approval
            },
          });
          posts.push(linkedinPost);
        }
        
        if (result.posts.xPost) {
          const xPost = await this.prisma.post.create({
            data: {
              insightId,
              platform: 'x',
              title: result.posts.xPost.hook,
              content: result.posts.xPost.full,
              characterCount: result.posts.xPost.full.length,
              status: PostStatus.NEEDS_REVIEW, // Start as needs_review - awaiting human approval
            },
          });
          posts.push(xPost);
        }
        
        return {
          posts: posts.map(post => ({
            id: post.id,
            platform: post.platform as 'linkedin' | 'x',
            title: post.title,
            content: post.content,
            characterCount: post.characterCount || 0,
          })),
          processingDurationMs: result.duration,
          estimatedTokens: 0, // Not provided by current AI service
          estimatedCost: result.cost,
        };
      },
      
      updateInsightProcessingStatus: async (insightId: string, updates: Prisma.InsightUpdateInput) => {
        const logMessage = updates.status === 'failed' 
          ? `Marking insight ${insightId} as failed` 
          : `Clearing processing status for insight ${insightId}`;
        this.logger.log(logMessage);
        await this.prisma.insight.update({
          where: { id: insightId },
          data: updates,
        });
      },
    };

    // Start all processors
    await Promise.all([
      this.queueManager.startCleanTranscriptProcessor(cleanTranscriptDeps, { concurrency: 2 }),
      this.queueManager.startExtractInsightsProcessor(extractInsightsDeps, { concurrency: 1 }),
      this.queueManager.startGeneratePostsProcessor(generatePostsDeps, { concurrency: 2 }),
    ]);

    this.logger.log('All content processors started');
  }

  /**
   * Trigger transcript cleaning (entry point to the pipeline)
   */
  async triggerTranscriptCleaning(transcriptId: string): Promise<{ jobId: string }> {
    // Get the transcript
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: transcriptId },
    });

    if (!transcript) {
      throw new Error(`Transcript ${transcriptId} not found`);
    }

    if (transcript.status !== 'raw') {
      throw new Error(`Transcript ${transcriptId} is not in 'raw' status (current: ${transcript.status})`);
    }

    // Add to cleaning queue
    const { jobId } = await this.queueManager.contentQueue.cleanTranscript({
      transcriptId,
      rawContent: transcript.rawContent,
      metadata: {
        title: transcript.title,
        sourceType: transcript.sourceType || undefined,
      },
    });

    // Update transcript with job ID
    await this.prisma.transcript.update({
      where: { id: transcriptId },
      data: { queueJobId: jobId },
    });

    this.logger.log(`Triggered transcript cleaning for ${transcriptId} with job ${jobId}`);
    return { jobId };
  }

  /**
   * Trigger post generation for an approved insight
   */
  async triggerPostGeneration(insightId: string, platforms: ('linkedin' | 'x')[]): Promise<{ jobId: string }> {
    // Get the insight
    const insight = await this.prisma.insight.findUnique({
      where: { id: insightId },
    });

    if (!insight) {
      throw new Error(`Insight ${insightId} not found`);
    }

    if (insight.status !== InsightStatus.APPROVED) {
      throw new Error(`Insight ${insightId} must be approved before generating posts (current: ${insight.status})`);
    }

    // Add to post generation queue
    const { jobId } = await this.queueManager.contentQueue.generatePosts({
      insightId,
      insightContent: `${insight.title}\n\n${insight.summary}\n\nQuote: "${insight.verbatimQuote}"`,
      platforms,
      metadata: {
        category: insight.category,
      },
    });

    // Update insight with job ID
    await this.prisma.insight.update({
      where: { id: insightId },
      data: { queueJobId: jobId },
    });

    this.logger.log(`Triggered post generation for insight ${insightId} with job ${jobId}`);
    return { jobId };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return await this.queueManager.getStats();
  }

  /**
   * Get queue health status
   */
  async getHealthStatus() {
    return await this.queueManager.healthCheck();
  }

  /**
   * Pause all content processing
   */
  async pauseProcessing(): Promise<void> {
    await this.queueManager.contentQueue.pauseAll();
    this.logger.log('Content processing paused');
  }

  /**
   * Resume all content processing
   */
  async resumeProcessing(): Promise<void> {
    await this.queueManager.contentQueue.resumeAll();
    this.logger.log('Content processing resumed');
  }

  /**
   * Get job status by job ID
   */
  async getJobStatus(jobId: string): Promise<JobStatusDto> {
    // Determine queue name from job ID
    const queueName = this.getQueueNameFromJobId(jobId);
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

  /**
   * Get multiple job statuses
   */
  async getBulkJobStatus(jobIds: string[]): Promise<Map<string, JobStatusDto | null>> {
    const jobs = jobIds.map(jobId => {
      const queueName = this.getQueueNameFromJobId(jobId);
      if (!queueName) {
        return null;
      }
      return { queueName, jobId };
    }).filter(Boolean) as Array<{ queueName: string; jobId: string }>;

    return await this.queueManager.getBulkJobStatus(jobs);
  }

  /**
   * Retry a failed job
   */
  async retryFailedJob(jobId: string): Promise<{ jobId: string }> {
    const queueName = this.getQueueNameFromJobId(jobId);
    if (!queueName) {
      throw new Error(`Invalid job ID format: ${jobId}`);
    }

    const result = await this.queueManager.retryJob(queueName, jobId);
    if (!result) {
      throw new Error(`Failed to retry job ${jobId}`);
    }

    // Update the entity with the new job ID
    await this.updateEntityJobId(jobId, result.newJobId);

    return { jobId: result.newJobId };
  }

  /**
   * Clean up stale job references in the database
   */
  async cleanupStaleJobReferences(): Promise<number> {
    this.logger.log('Starting cleanup of stale job references');
    
    // Get all entities with job IDs
    const [transcripts, insights, posts] = await Promise.all([
      this.prisma.transcript.findMany({
        where: { queueJobId: { not: null } },
        select: { id: true, queueJobId: true },
      }),
      this.prisma.insight.findMany({
        where: { queueJobId: { not: null } },
        select: { id: true, queueJobId: true },
      }),
      this.prisma.post.findMany({
        where: { queueJobId: { not: null } },
        select: { id: true, queueJobId: true },
      }),
    ]);

    // Check which jobs still exist
    const allJobIds = [
      ...transcripts.map(t => t.queueJobId!),
      ...insights.map(i => i.queueJobId!),
      ...posts.map(p => p.queueJobId!),
    ];

    const jobStatuses = await this.getBulkJobStatus(allJobIds);

    // Clean up stale references
    const staleTranscripts = transcripts.filter(t => !jobStatuses.get(t.queueJobId!));
    const staleInsights = insights.filter(i => !jobStatuses.get(i.queueJobId!));
    const stalePosts = posts.filter(p => !jobStatuses.get(p.queueJobId!));

    await Promise.all([
      ...staleTranscripts.map(t =>
        this.prisma.transcript.update({
          where: { id: t.id },
          data: { queueJobId: null },
        })
      ),
      ...staleInsights.map(i =>
        this.prisma.insight.update({
          where: { id: i.id },
          data: { queueJobId: null },
        })
      ),
      ...stalePosts.map(p =>
        this.prisma.post.update({
          where: { id: p.id },
          data: { queueJobId: null },
        })
      ),
    ]);

    const cleanedCount = staleTranscripts.length + staleInsights.length + stalePosts.length;
    this.logger.log(`Cleaned up ${cleanedCount} stale job references`);
    return cleanedCount;
  }

  /**
   * Helper: Determine queue name from job ID
   */
  private getQueueNameFromJobId(jobId: string): string | null {
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

  /**
   * Helper: Update entity with new job ID after retry
   */
  private async updateEntityJobId(oldJobId: string, newJobId: string): Promise<void> {
    if (oldJobId.startsWith('clean-transcript-')) {
      const entityId = oldJobId.replace('clean-transcript-', '');
      await this.prisma.transcript.update({
        where: { id: entityId },
        data: { queueJobId: newJobId },
      });
    } else if (oldJobId.startsWith('extract-insights-')) {
      const entityId = oldJobId.replace('extract-insights-', '');
      await this.prisma.transcript.update({
        where: { id: entityId },
        data: { queueJobId: newJobId },
      });
    } else if (oldJobId.startsWith('generate-posts-')) {
      const entityId = oldJobId.replace('generate-posts-', '');
      await this.prisma.insight.update({
        where: { id: entityId },
        data: { queueJobId: newJobId },
      });
    }
  }
}