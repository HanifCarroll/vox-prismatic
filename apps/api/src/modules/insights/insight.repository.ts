import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { InsightEntity } from './entities/insight.entity';
import { CreateInsightDto, UpdateInsightDto } from './dto';
import { InsightStatus } from '@content-creation/types';
@Injectable()
export class InsightRepository {
  private readonly logger = new Logger(InsightRepository.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateInsightDto & { id: string }): Promise<InsightEntity> {
    const totalScore = data.urgencyScore + data.relatabilityScore + data.specificityScore + data.authorityScore;
    
    const insight = await this.prisma.insight.create({
      data: {
        id: data.id,
        cleanedTranscriptId: data.cleanedTranscriptId,
        title: data.title,
        summary: data.summary,
        verbatimQuote: data.verbatimQuote,
        category: data.category,
        postType: data.postType,
        status: InsightStatus.DRAFT,
        urgencyScore: data.urgencyScore,
        relatabilityScore: data.relatabilityScore,
        specificityScore: data.specificityScore,
        authorityScore: data.authorityScore,
        totalScore,
        processingDurationMs: data.processingDurationMs,
        estimatedTokens: data.estimatedTokens,
        estimatedCost: data.estimatedCost,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.mapToEntity(insight);
  }

  async findById(id: string): Promise<InsightEntity | null> {
    const insight = await this.prisma.insight.findUnique({
      where: { id },
      include: {
        transcript: {
          select: {
            id: true,
            title: true,
            status: true,
            sourceType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!insight) return null;
    return this.mapToEntity(insight);
  }

  async findAll(): Promise<InsightEntity[]> {
    // Simple fetch all, ordered by totalScore
    const insights = await this.prisma.insight.findMany({
      include: {
        transcript: {
          select: {
            id: true,
            title: true,
            status: true,
            sourceType: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        totalScore: 'desc'
      },
      take: 10000, // Safety limit
    });

    return insights.map(insight => this.mapToEntity(insight));
  }

  async update(id: string, data: Partial<UpdateInsightDto>): Promise<InsightEntity> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Only recalculate total score if individual scores are provided
    const scoreUpdates = [
      data.urgencyScore,
      data.relatabilityScore,
      data.specificityScore,
      data.authorityScore
    ].filter(score => score !== undefined);

    if (scoreUpdates.length > 0) {
      // First get the current scores to calculate the new total (safe from SQL injection)
      const currentInsight = await this.prisma.insight.findUnique({
        where: { id },
        select: {
          urgencyScore: true,
          relatabilityScore: true,
          specificityScore: true,
          authorityScore: true,
        }
      });

      if (!currentInsight) {
        throw new Error(`Insight with id ${id} not found`);
      }

      // Calculate the new scores using null coalescing
      const newScores = {
        urgencyScore: data.urgencyScore ?? currentInsight.urgencyScore,
        relatabilityScore: data.relatabilityScore ?? currentInsight.relatabilityScore,
        specificityScore: data.specificityScore ?? currentInsight.specificityScore,
        authorityScore: data.authorityScore ?? currentInsight.authorityScore,
      };

      // Calculate total score
      const totalScore = 
        (newScores.urgencyScore || 0) +
        (newScores.relatabilityScore || 0) +
        (newScores.specificityScore || 0) +
        (newScores.authorityScore || 0);

      // Update with Prisma ORM (safe from SQL injection)
      const updatedInsight = await this.prisma.insight.update({
        where: { id },
        data: {
          ...newScores,
          totalScore,
          updatedAt: new Date(),
        },
        include: {
          transcript: {
            select: {
              id: true,
              title: true,
              sourceType: true,
            }
          },
          posts: {
            select: {
              id: true,
              title: true,
              platform: true,
              status: true,
            }
          }
        }
      });

      return this.mapToEntity(updatedInsight);
    }

    // For non-score updates, use the regular update
    const insight = await this.prisma.insight.update({
      where: { id },
      data: updateData,
      include: {
        transcript: {
          select: {
            id: true,
            title: true,
            status: true,
            sourceType: true,
            createdAt: true,
          },
        },
      },
    });

    return this.mapToEntity(insight);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.insight.delete({ where: { id } });
  }

  async batchUpdateStatus(ids: string[], status: InsightStatus): Promise<number> {
    // Use a transaction for better consistency and performance
    const result = await this.prisma.$transaction(async (tx) => {
      // Update all insights in a single query
      const updateResult = await tx.insight.updateMany({
        where: { id: { in: ids } },
        data: { 
          status,
          updatedAt: new Date(),
        },
      });

      // If status is approved, we might want to trigger other actions
      if (status === InsightStatus.APPROVED && updateResult.count > 0) {
        // Log the approved insights for potential post generation
        this.logger.log(`${updateResult.count} insights approved and ready for post generation`);
      }

      return updateResult;
    });

    this.logger.log(`Batch updated ${result.count} insights to status: ${status}`);
    return result.count;
  }

  async findByTranscriptId(transcriptId: string): Promise<InsightEntity[]> {
    const insights = await this.prisma.insight.findMany({
      where: { cleanedTranscriptId: transcriptId },
      include: {
        transcript: {
          select: {
            id: true,
            title: true,
            status: true,
            sourceType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { totalScore: 'desc' },
    });

    return insights.map(insight => this.mapToEntity(insight));
  }

  async count(): Promise<number> {
    return await this.prisma.insight.count();
  }

  private mapToEntity(data: any): InsightEntity {
    return {
      id: data.id,
      cleanedTranscriptId: data.cleanedTranscriptId,
      title: data.title,
      summary: data.summary,
      verbatimQuote: data.verbatimQuote,
      category: data.category,
      postType: data.postType,
      status: data.status,
      urgencyScore: data.urgencyScore,
      relatabilityScore: data.relatabilityScore,
      specificityScore: data.specificityScore,
      authorityScore: data.authorityScore,
      totalScore: data.totalScore,
      processingDurationMs: data.processingDurationMs,
      estimatedTokens: data.estimatedTokens,
      estimatedCost: data.estimatedCost ? Number(data.estimatedCost) : undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      queueJobId: data.queueJobId || undefined,
      reviewedBy: data.reviewedBy || undefined,
      reviewedAt: data.reviewedAt || undefined,
      rejectionReason: data.rejectionReason || undefined,
      approvedBy: data.approvedBy || undefined,
      approvedAt: data.approvedAt || undefined,
      archivedBy: data.archivedBy || undefined,
      archivedAt: data.archivedAt || undefined,
      archivedReason: data.archivedReason || undefined,
      failureReason: data.failureReason || undefined,
      failedAt: data.failedAt || undefined,
      retryCount: data.retryCount || 0,
      transcript: data.transcript ? {
        id: data.transcript.id,
        title: data.transcript.title,
        status: data.transcript.status,
        sourceType: data.transcript.sourceType,
        createdAt: data.transcript.createdAt,
      } : undefined,
    };
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    const counts = await this.prisma.insight.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    const result: Record<string, number> = {};
    let total = 0;
    
    for (const item of counts) {
      result[item.status] = item._count._all;
      total += item._count._all;
    }
    
    result.total = total;
    return result;
  }

  // Remove findAllWithMetadata method entirely
}