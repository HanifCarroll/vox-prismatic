import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIService } from '../../ai/ai.service';
import { InsightStatus, TranscriptStatus } from '@content-creation/types';
import type { Prisma } from '@prisma/client';

@Injectable()
export class InsightGeneratorService {
  private readonly logger = new Logger(InsightGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async extractInsights(transcriptId: string, cleanedContent: string) {
    this.logger.log(`Processing insight extraction for transcript ${transcriptId}`);
    
    const result = await this.aiService.extractInsights({
      transcriptId,
      content: cleanedContent,
    });
    
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
            status: InsightStatus.NEEDS_REVIEW,
            processingDurationMs: result.duration,
            estimatedTokens: 0,
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
      estimatedTokens: 0,
      estimatedCost: result.cost,
    };
  }

  async updateInsightProcessingStatus(insightId: string, updates: Prisma.InsightUpdateInput) {
    const logMessage = updates.status === InsightStatus.FAILED 
      ? `Marking insight ${insightId} as failed` 
      : `Clearing processing status for insight ${insightId}`;
    
    this.logger.log(logMessage);
    
    await this.prisma.insight.update({
      where: { id: insightId },
      data: updates,
    });
  }

  async getInsight(insightId: string) {
    return await this.prisma.insight.findUnique({
      where: { id: insightId },
    });
  }

  async updateInsightJobId(insightId: string, jobId: string) {
    await this.prisma.insight.update({
      where: { id: insightId },
      data: { queueJobId: jobId },
    });
  }

  async clearInsightQueueJobId(insightId: string) {
    await this.prisma.insight.update({
      where: { id: insightId },
      data: { queueJobId: null },
    });
  }

  async getInsightsWithJobIds() {
    return await this.prisma.insight.findMany({
      where: { queueJobId: { not: null } },
      select: { id: true, queueJobId: true },
    });
  }

  async findByTranscriptId(transcriptId: string) {
    return await this.prisma.insight.findMany({
      where: {
        cleanedTranscriptId: transcriptId
      }
    });
  }
}