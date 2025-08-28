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
import type { Prisma } from '@prisma/client';

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
                status: 'draft', // Start as draft - needs human review
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
        this.logger.log(`Clearing processing status for transcript ${transcriptId}`);
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
              status: 'draft', // Start as draft - needs human review
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
              status: 'draft', // Start as draft - needs human review
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
        this.logger.log(`Clearing processing status for insight ${insightId}`);
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
   * Trigger post generation for a reviewed insight
   */
  async triggerPostGeneration(insightId: string, platforms: ('linkedin' | 'x')[]): Promise<{ jobId: string }> {
    // Get the insight
    const insight = await this.prisma.insight.findUnique({
      where: { id: insightId },
    });

    if (!insight) {
      throw new Error(`Insight ${insightId} not found`);
    }

    if (insight.status !== 'reviewed') {
      throw new Error(`Insight ${insightId} must be reviewed before generating posts (current: ${insight.status})`);
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
}