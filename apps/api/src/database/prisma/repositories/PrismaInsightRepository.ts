import type { IInsightRepository } from '../../interfaces';
import type { 
  Result, 
  InsightView, 
  InsightFilter, 
  StatsResult,
  InsightStatus,
  PostType,
  BulkInsightsResponse,
  GenerateInsightsResponse
} from '@content-creation/types';
import type { NewInsight } from '@content-creation/types/database';
import type { Insight, Transcript } from '../generated';
import { PrismaBaseRepository } from './PrismaBaseRepository';

/**
 * Prisma Insight Repository
 * Implements insight data operations using Prisma
 */
export class PrismaInsightRepository 
  extends PrismaBaseRepository 
  implements IInsightRepository {

  /**
   * Convert Prisma insight to InsightView format
   */
  private convertToView(
    insight: Insight & { transcript?: Transcript }
  ): InsightView {
    return {
      id: insight.id,
      cleanedTranscriptId: insight.cleanedTranscriptId,
      title: insight.title,
      summary: insight.summary,
      verbatimQuote: insight.verbatimQuote,
      category: insight.category,
      postType: insight.postType as PostType,
      scores: {
        urgency: insight.urgencyScore,
        relatability: insight.relatabilityScore,
        specificity: insight.specificityScore,
        authority: insight.authorityScore,
        total: insight.totalScore
      },
      status: insight.status as InsightStatus,
      processingDurationMs: insight.processingDurationMs || undefined,
      estimatedTokens: insight.estimatedTokens || undefined,
      estimatedCost: insight.estimatedCost || undefined,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
      // Include transcript title if available
      transcriptTitle: insight.transcript?.title
    };
  }

  /**
   * Find all insights with filtering and pagination
   */
  async findAll(filters?: InsightFilter): Promise<Result<InsightView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Build where clause
      const where: any = {};
      
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status;
      }
      
      if (filters?.postType) {
        where.postType = filters.postType;
      }
      
      if (filters?.category) {
        where.category = filters.category;
      }
      
      if (filters?.transcriptId) {
        where.cleanedTranscriptId = filters.transcriptId;
      }
      
      if (filters?.minScore !== undefined) {
        where.totalScore = { gte: filters.minScore };
      }
      
      if (filters?.maxScore !== undefined) {
        where.totalScore = {
          ...where.totalScore,
          lte: filters.maxScore
        };
      }
      
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { summary: { contains: filters.search, mode: 'insensitive' } },
          { verbatimQuote: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      
      // Build query options
      const options = {
        where,
        ...this.buildPagination(filters?.limit, filters?.offset),
        orderBy: this.buildOrderBy(filters?.sortBy || 'totalScore', filters?.sortOrder),
        include: {
          transcript: true
        }
      };
      
      const insights = await prisma.insight.findMany(options);
      return insights.map(insight => this.convertToView(insight));
    }, 'Failed to fetch insights');
  }

  /**
   * Find insight by ID
   */
  async findById(id: string): Promise<Result<InsightView | null>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const insight = await prisma.insight.findUnique({
        where: { id },
        include: { transcript: true }
      });
      
      return insight ? this.convertToView(insight) : null;
    }, 'Failed to fetch insight');
  }

  /**
   * Find insights by transcript ID
   */
  async findByTranscriptId(transcriptId: string): Promise<Result<InsightView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const insights = await prisma.insight.findMany({
        where: { cleanedTranscriptId: transcriptId },
        orderBy: { totalScore: 'desc' },
        include: { transcript: true }
      });
      
      return insights.map(insight => this.convertToView(insight));
    }, 'Failed to fetch insights by transcript ID');
  }

  /**
   * Create new insight
   */
  async create(data: NewInsight): Promise<Result<InsightView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const insight = await prisma.insight.create({
        data: {
          id: data.id || this.generateId('ins'),
          cleanedTranscriptId: data.cleanedTranscriptId,
          title: data.title,
          summary: data.summary,
          verbatimQuote: data.verbatimQuote,
          category: data.category,
          postType: data.postType,
          urgencyScore: data.urgencyScore,
          relatabilityScore: data.relatabilityScore,
          specificityScore: data.specificityScore,
          authorityScore: data.authorityScore,
          totalScore: data.totalScore,
          status: data.status || 'draft',
          processingDurationMs: data.processingDurationMs,
          estimatedTokens: data.estimatedTokens,
          estimatedCost: data.estimatedCost
        },
        include: { transcript: true }
      });
      
      return this.convertToView(insight);
    }, 'Failed to create insight');
  }

  /**
   * Create multiple insights
   */
  async createMany(data: NewInsight[]): Promise<Result<InsightView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Prepare data with generated IDs
      const insightsData = data.map(item => ({
        id: item.id || this.generateId('ins'),
        cleanedTranscriptId: item.cleanedTranscriptId,
        title: item.title,
        summary: item.summary,
        verbatimQuote: item.verbatimQuote,
        category: item.category,
        postType: item.postType,
        urgencyScore: item.urgencyScore,
        relatabilityScore: item.relatabilityScore,
        specificityScore: item.specificityScore,
        authorityScore: item.authorityScore,
        totalScore: item.totalScore,
        status: item.status || 'draft',
        processingDurationMs: item.processingDurationMs,
        estimatedTokens: item.estimatedTokens,
        estimatedCost: item.estimatedCost
      }));
      
      // Prisma createMany doesn't return created records, so we need to do it differently
      // Use a transaction to create all insights and then fetch them
      const createdInsights = await prisma.$transaction(async (tx) => {
        await tx.insight.createMany({
          data: insightsData
        });
        
        // Fetch the created insights
        return await tx.insight.findMany({
          where: {
            id: { in: insightsData.map(d => d.id) }
          },
          include: { transcript: true },
          orderBy: { createdAt: 'desc' }
        });
      });
      
      return createdInsights.map(insight => this.convertToView(insight));
    }, 'Failed to create multiple insights');
  }

  /**
   * Update existing insight
   */
  async update(
    id: string, 
    data: Partial<NewInsight>
  ): Promise<Result<InsightView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const insight = await prisma.insight.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.summary && { summary: data.summary }),
          ...(data.verbatimQuote && { verbatimQuote: data.verbatimQuote }),
          ...(data.category && { category: data.category }),
          ...(data.postType && { postType: data.postType }),
          ...(data.urgencyScore !== undefined && { urgencyScore: data.urgencyScore }),
          ...(data.relatabilityScore !== undefined && { relatabilityScore: data.relatabilityScore }),
          ...(data.specificityScore !== undefined && { specificityScore: data.specificityScore }),
          ...(data.authorityScore !== undefined && { authorityScore: data.authorityScore }),
          ...(data.totalScore !== undefined && { totalScore: data.totalScore }),
          ...(data.status && { status: data.status }),
          ...(data.processingDurationMs !== undefined && { processingDurationMs: data.processingDurationMs }),
          ...(data.estimatedTokens !== undefined && { estimatedTokens: data.estimatedTokens }),
          ...(data.estimatedCost !== undefined && { estimatedCost: data.estimatedCost })
        },
        include: { transcript: true }
      });
      
      return this.convertToView(insight);
    }, 'Failed to update insight');
  }

  /**
   * Delete insight by ID
   */
  async delete(id: string): Promise<Result<void>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      await prisma.insight.delete({
        where: { id }
      });
    }, 'Failed to delete insight');
  }

  /**
   * Get insight statistics
   */
  async getStats(): Promise<Result<StatsResult>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const [total, byStatus] = await Promise.all([
        prisma.insight.count(),
        prisma.insight.groupBy({
          by: ['status'],
          _count: true
        })
      ]);
      
      const statusMap: Record<string, number> = {};
      for (const item of byStatus) {
        statusMap[item.status] = item._count;
      }
      
      return {
        total,
        byStatus: statusMap
      };
    }, 'Failed to get insight statistics');
  }

  /**
   * Update insight status
   */
  async updateStatus(
    id: string, 
    status: InsightView['status']
  ): Promise<Result<InsightView>> {
    return this.update(id, { status });
  }

  /**
   * Find insights ready for post generation
   */
  async findReadyForPosts(limit = 10): Promise<Result<InsightView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const insights = await prisma.insight.findMany({
        where: {
          status: 'approved',
          posts: {
            none: {}  // No posts created yet
          }
        },
        orderBy: { totalScore: 'desc' },
        take: limit,
        include: { transcript: true }
      });
      
      return insights.map(insight => this.convertToView(insight));
    }, 'Failed to find insights ready for posts');
  }

  /**
   * Batch update insight statuses
   */
  async batchUpdateStatus(
    ids: string[], 
    status: InsightView['status']
  ): Promise<Result<number>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const result = await prisma.insight.updateMany({
        where: {
          id: { in: ids }
        },
        data: { status }
      });
      
      return result.count;
    }, 'Failed to batch update insight statuses');
  }

  /**
   * Process selected insights (generate posts or update status)
   */
  async processSelected(
    insightIds: string[],
    action: 'generate_posts' | 'approve' | 'reject'
  ): Promise<Result<BulkInsightsResponse>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      let insightsProcessed = insightIds.length;
      let postsGenerated = 0;
      
      switch (action) {
        case 'approve':
          await prisma.insight.updateMany({
            where: { id: { in: insightIds } },
            data: { status: 'approved' }
          });
          break;
          
        case 'reject':
          await prisma.insight.updateMany({
            where: { id: { in: insightIds } },
            data: { status: 'rejected' }
          });
          break;
          
        case 'generate_posts':
          // This would typically trigger post generation logic
          // For now, just update the status
          await prisma.insight.updateMany({
            where: { id: { in: insightIds } },
            data: { status: 'approved' }
          });
          // Count existing posts for these insights
          const postCount = await prisma.post.count({
            where: { insightId: { in: insightIds } }
          });
          postsGenerated = postCount;
          break;
      }
      
      return {
        insightsProcessed,
        postsGenerated,
        action
      };
    }, 'Failed to process selected insights');
  }

  /**
   * Get insights with their associated transcript titles
   */
  async findAllWithTranscripts(filters?: InsightFilter): Promise<Result<InsightView[]>> {
    // This is the same as findAll since we always include transcript
    return this.findAll(filters);
  }
}