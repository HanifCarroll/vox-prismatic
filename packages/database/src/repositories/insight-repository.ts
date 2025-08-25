import { eq, desc, like, or, and, gte, lte, count } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { 
  insights as insightsTable, 
  transcripts as transcriptsTable,
  type Insight, 
  type NewInsight 
} from '../schema';
import type { Result } from '../index';
import type { InsightFilter, StatsResult } from '../types/filters';

/**
 * InsightView interface (matches the current API structure)
 */
export interface InsightView {
  id: string;
  cleanedTranscriptId: string;
  title: string;
  summary: string;
  verbatimQuote: string;
  category: string;
  postType: 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };
  status: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived';
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  transcriptTitle?: string;
}

/**
 * InsightRepository - Handle all insight data operations
 * Replaces direct database access and JOIN logic in API routes
 */
export class InsightRepository extends BaseRepository {

  /**
   * Convert database insight (with transcript data) to InsightView format
   */
  private convertToView(insight: Insight & { transcriptTitle?: string | null }): InsightView {
    return {
      id: insight.id || '',
      cleanedTranscriptId: insight.cleanedTranscriptId || '',
      title: insight.title || 'Untitled Insight',
      summary: insight.summary || '',
      verbatimQuote: insight.verbatimQuote || '',
      category: insight.category || 'Uncategorized',
      postType: (insight.postType as InsightView['postType']) || 'Problem',
      scores: {
        urgency: insight.urgencyScore || 0,
        relatability: insight.relatabilityScore || 0,
        specificity: insight.specificityScore || 0,
        authority: insight.authorityScore || 0,
        total: insight.totalScore || 0
      },
      status: (insight.status as InsightView['status']) || 'draft',
      processingDurationMs: insight.processingDurationMs || undefined,
      estimatedTokens: insight.estimatedTokens || undefined,
      estimatedCost: insight.estimatedCost || undefined,
      createdAt: insight.createdAt ? new Date(insight.createdAt) : new Date(),
      updatedAt: insight.updatedAt ? new Date(insight.updatedAt) : new Date(),
      transcriptTitle: insight.transcriptTitle || undefined
    };
  }

  /**
   * Find insights with transcript data (replaces complex JOIN logic)
   */
  async findWithTranscripts(filters?: InsightFilter): Promise<Result<InsightView[]>> {
    return this.execute(async () => {
      // Base query with LEFT JOIN to transcripts
      let query = this.db
        .select({
          id: insightsTable.id,
          cleanedTranscriptId: insightsTable.cleanedTranscriptId,
          title: insightsTable.title,
          summary: insightsTable.summary,
          verbatimQuote: insightsTable.verbatimQuote,
          category: insightsTable.category,
          postType: insightsTable.postType,
          urgencyScore: insightsTable.urgencyScore,
          relatabilityScore: insightsTable.relatabilityScore,
          specificityScore: insightsTable.specificityScore,
          authorityScore: insightsTable.authorityScore,
          totalScore: insightsTable.totalScore,
          status: insightsTable.status,
          processingDurationMs: insightsTable.processingDurationMs,
          estimatedTokens: insightsTable.estimatedTokens,
          estimatedCost: insightsTable.estimatedCost,
          createdAt: insightsTable.createdAt,
          updatedAt: insightsTable.updatedAt,
          transcriptTitle: transcriptsTable.title
        })
        .from(insightsTable)
        .leftJoin(transcriptsTable, eq(insightsTable.cleanedTranscriptId, transcriptsTable.id));

      // Build WHERE conditions
      const conditions = [];

      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'needs_review') {
          conditions.push(eq(insightsTable.status, 'needs_review'));
        } else if (filters.status === 'completed') {
          conditions.push(or(
            eq(insightsTable.status, 'approved'),
            eq(insightsTable.status, 'archived')
          ));
        } else {
          conditions.push(eq(insightsTable.status, filters.status));
        }
      }

      if (filters?.postType) {
        conditions.push(eq(insightsTable.postType, filters.postType));
      }

      if (filters?.category) {
        conditions.push(eq(insightsTable.category, filters.category));
      }

      if (filters?.minScore !== undefined) {
        conditions.push(gte(insightsTable.totalScore, filters.minScore));
      }

      if (filters?.maxScore !== undefined) {
        conditions.push(lte(insightsTable.totalScore, filters.maxScore));
      }

      if (filters?.transcriptId) {
        conditions.push(eq(insightsTable.cleanedTranscriptId, filters.transcriptId));
      }

      // Apply search across multiple fields
      if (filters?.search) {
        const searchPattern = `%${filters.search.toLowerCase()}%`;
        conditions.push(or(
          like(insightsTable.title, searchPattern),
          like(insightsTable.summary, searchPattern),
          like(insightsTable.verbatimQuote, searchPattern),
          like(insightsTable.category, searchPattern),
          like(transcriptsTable.title, searchPattern)
        ));
      }

      // Apply WHERE clause
      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
      }

      // Apply ordering (default by creation date)
      const sortBy = filters?.sortBy || 'createdAt';
      const sortOrder = filters?.sortOrder || 'desc';

      if (sortBy === 'totalScore') {
        query = query.orderBy(
          sortOrder === 'desc' ? desc(insightsTable.totalScore) : insightsTable.totalScore
        );
      } else {
        query = query.orderBy(desc(insightsTable.createdAt));
      }

      // Apply pagination at database level
      if (filters?.limit) {
        query = query.limit(filters.limit);
        if (filters?.offset) {
          query = query.offset(filters.offset);
        }
      }

      const dbInsights = await query;
      let insightViews = dbInsights.map(this.convertToView);

      // Apply additional client-side sorting if needed (for complex sorting)
      if (filters?.sortBy && filters.sortBy !== 'createdAt' && filters.sortBy !== 'totalScore') {
        insightViews = this.applySorting(insightViews, filters.sortBy, filters.sortOrder);
      }

      console.log(`📊 Retrieved ${insightViews.length} insights with transcripts`);
      return insightViews;
    }, 'Failed to fetch insights');
  }

  /**
   * Find insight by ID
   */
  async findById(id: string): Promise<Result<InsightView | null>> {
    return this.execute(async () => {
      const result = await this.db
        .select({
          id: insightsTable.id,
          cleanedTranscriptId: insightsTable.cleanedTranscriptId,
          title: insightsTable.title,
          summary: insightsTable.summary,
          verbatimQuote: insightsTable.verbatimQuote,
          category: insightsTable.category,
          postType: insightsTable.postType,
          urgencyScore: insightsTable.urgencyScore,
          relatabilityScore: insightsTable.relatabilityScore,
          specificityScore: insightsTable.specificityScore,
          authorityScore: insightsTable.authorityScore,
          totalScore: insightsTable.totalScore,
          status: insightsTable.status,
          processingDurationMs: insightsTable.processingDurationMs,
          estimatedTokens: insightsTable.estimatedTokens,
          estimatedCost: insightsTable.estimatedCost,
          createdAt: insightsTable.createdAt,
          updatedAt: insightsTable.updatedAt,
          transcriptTitle: transcriptsTable.title
        })
        .from(insightsTable)
        .leftJoin(transcriptsTable, eq(insightsTable.cleanedTranscriptId, transcriptsTable.id))
        .where(eq(insightsTable.id, id))
        .limit(1);

      return result[0] ? this.convertToView(result[0]) : null;
    }, `Failed to fetch insight ${id}`);
  }

  /**
   * Update insight
   */
  async update(id: string, data: Partial<NewInsight>): Promise<Result<InsightView>> {
    return this.execute(async () => {
      const updateData: any = {
        ...data,
        updatedAt: this.now()
      };

      await this.db
        .update(insightsTable)
        .set(updateData)
        .where(eq(insightsTable.id, id));

      // Fetch updated insight with transcript data
      const result = await this.findById(id);
      if (!result.success || !result.data) {
        throw new Error(`Insight not found after update: ${id}`);
      }

      console.log(`📝 Updated insight: ${id}`);
      return result.data;
    }, `Failed to update insight ${id}`);
  }

  /**
   * Update insight status
   */
  async updateStatus(id: string, status: Insight['status']): Promise<Result<void>> {
    return this.execute(async () => {
      const result = await this.db
        .update(insightsTable)
        .set({ 
          status, 
          updatedAt: this.now() 
        })
        .where(eq(insightsTable.id, id));

      if (result.changes === 0) {
        throw new Error(`Insight not found: ${id}`);
      }

      console.log(`📊 Insight ${id} status updated to: ${status}`);
    }, `Failed to update insight status for ${id}`);
  }

  /**
   * Bulk update insight statuses (for bulk operations)
   */
  async bulkUpdateStatus(ids: string[], status: Insight['status']): Promise<Result<void>> {
    return this.execute(async () => {
      const updateData = {
        status,
        updatedAt: this.now()
      };

      // Update each insight (SQLite doesn't support IN clause with prepared statements easily)
      let updatedCount = 0;
      for (const id of ids) {
        const result = await this.db
          .update(insightsTable)
          .set(updateData)
          .where(eq(insightsTable.id, id));
        
        updatedCount += result.changes;
      }

      console.log(`📊 Bulk updated ${updatedCount} insights to status: ${status}`);
    }, 'Failed to bulk update insights');
  }

  /**
   * Get insights by transcript ID
   */
  async getByTranscriptId(transcriptId: string): Promise<Result<InsightView[]>> {
    return this.findWithTranscripts({ transcriptId });
  }

  /**
   * Get insight statistics for dashboard
   */
  async getStats(): Promise<Result<StatsResult>> {
    return this.execute(async () => {
      // Get total count
      const [totalResult] = await this.db
        .select({ count: count() })
        .from(insightsTable);

      const total = totalResult?.count || 0;

      // Get counts by status using raw SQLite connection
      const statusResults = this.sqlite.prepare(
        'SELECT status, COUNT(*) as count FROM insights GROUP BY status'
      ).all() as { status: string; count: number }[];

      const byStatus: Record<string, number> = {};
      for (const row of statusResults) {
        byStatus[row.status] = Number(row.count);
      }

      console.log(`📊 Insight stats - Total: ${total}, By status:`, byStatus);

      return {
        total,
        byStatus
      };
    }, 'Failed to get insight statistics');
  }
}