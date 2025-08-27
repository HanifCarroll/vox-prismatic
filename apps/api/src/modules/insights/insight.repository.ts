import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { InsightEntity } from './entities/insight.entity';
import { CreateInsightDto, InsightFilterDto, UpdateInsightDto, InsightStatus } from './dto';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class InsightRepository extends BaseRepository<InsightEntity> {
  private readonly logger = new Logger(InsightRepository.name);

  constructor(private prisma: PrismaService) {
    super();
  }

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
        status: 'draft',
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

  async findAll(filters?: InsightFilterDto): Promise<InsightEntity[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    
    if (filters?.category) {
      where.category = filters.category;
    }
    
    if (filters?.postType) {
      where.postType = filters.postType;
    }
    
    if (filters?.transcriptId) {
      where.cleanedTranscriptId = filters.transcriptId;
    }

    if (filters?.minTotalScore || filters?.maxTotalScore) {
      where.totalScore = {};
      if (filters.minTotalScore) {
        where.totalScore.gte = filters.minTotalScore;
      }
      if (filters.maxTotalScore) {
        where.totalScore.lte = filters.maxTotalScore;
      }
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const insights = await this.prisma.insight.findMany({
      where,
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
      orderBy: filters?.sortBy ? {
        [filters.sortBy]: filters.sortOrder || 'desc'
      } : {
        totalScore: 'desc'
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return insights.map(insight => this.mapToEntity(insight));
  }

  async update(id: string, data: Partial<UpdateInsightDto>): Promise<InsightEntity> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Recalculate total score if any individual scores are updated
    if (data.urgencyScore || data.relatabilityScore || data.specificityScore || data.authorityScore) {
      const current = await this.prisma.insight.findUnique({ where: { id } });
      if (current) {
        updateData.totalScore = 
          (data.urgencyScore ?? current.urgencyScore) +
          (data.relatabilityScore ?? current.relatabilityScore) +
          (data.specificityScore ?? current.specificityScore) +
          (data.authorityScore ?? current.authorityScore);
      }
    }

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
    const result = await this.prisma.insight.updateMany({
      where: { id: { in: ids } },
      data: { 
        status,
        updatedAt: new Date(),
      },
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

  async getStatusCounts(): Promise<Record<string, number>> {
    const counts = await this.prisma.insight.groupBy({
      by: ['status'],
      _count: true,
    });

    return counts.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Count insights matching the given filters
   * Used for proper pagination metadata
   */
  async count(filters?: InsightFilterDto): Promise<number> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    
    if (filters?.category) {
      where.category = filters.category;
    }
    
    if (filters?.postType) {
      where.postType = filters.postType;
    }
    
    if (filters?.transcriptId) {
      where.cleanedTranscriptId = filters.transcriptId;
    }

    if (filters?.minTotalScore || filters?.maxTotalScore) {
      where.totalScore = {};
      if (filters.minTotalScore) {
        where.totalScore.gte = filters.minTotalScore;
      }
      if (filters.maxTotalScore) {
        where.totalScore.lte = filters.maxTotalScore;
      }
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.insight.count({ where });
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
      transcript: data.transcript ? {
        id: data.transcript.id,
        title: data.transcript.title,
        status: data.transcript.status,
        sourceType: data.transcript.sourceType,
        createdAt: data.transcript.createdAt,
      } : undefined,
    };
  }
}