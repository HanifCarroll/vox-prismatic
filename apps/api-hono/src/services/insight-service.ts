import type { Result } from '@content-creation/types';
import type { InsightView, InsightFilter, InsightStatus } from '@content-creation/types';
import { getDatabaseAdapter } from '../database/adapter';

export interface UpdateInsightRequest {
  title?: string;
  summary?: string;
  category?: string;
  status?: InsightStatus;
}

export interface BulkOperationResult {
  updatedCount: number;
  action: string;
}

/**
 * Service layer for insight operations
 * Handles all business logic related to insights
 */
export class InsightService {
  private insightRepo;

  constructor() {
    const adapter = getDatabaseAdapter();
    this.insightRepo = adapter.getInsightRepository();
  }

  /**
   * Get all insights with optional filtering
   * Includes transcript data for context
   */
  async getInsights(filters?: InsightFilter): Promise<Result<InsightView[]>> {
    try {
      return await this.insightRepo.findAllWithTranscripts(filters);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get insights'),
      };
    }
  }

  /**
   * Get a single insight by ID
   */
  async getInsight(id: string): Promise<Result<InsightView>> {
    try {
      return await this.insightRepo.findById(id);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get insight'),
      };
    }
  }

  /**
   * Update an existing insight
   */
  async updateInsight(id: string, data: UpdateInsightRequest): Promise<Result<InsightView>> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      return await this.insightRepo.update(id, updateData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update insight'),
      };
    }
  }

  /**
   * Perform bulk status update on multiple insights
   * Useful for batch approval/rejection workflows
   */
  async bulkUpdateInsights(
    insightIds: string[], 
    action: 'approve' | 'reject' | 'archive' | 'needs_review'
  ): Promise<Result<BulkOperationResult>> {
    try {
      // Map action to status
      const statusMap = {
        approve: 'approved',
        reject: 'rejected',
        archive: 'archived',
        needs_review: 'needs_review',
      } as const;

      const status = statusMap[action] as InsightStatus;
      
      // Perform batch update
      const result = await this.insightRepo.batchUpdateStatus(insightIds, status);

      if (!result.success) {
        return result as any;
      }

      return {
        success: true,
        data: {
          updatedCount: insightIds.length,
          action,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to perform bulk operation'),
      };
    }
  }

  /**
   * Get insights for a specific transcript
   */
  async getInsightsByTranscript(transcriptId: string): Promise<Result<InsightView[]>> {
    try {
      const filters: InsightFilter = { transcriptId };
      return await this.insightRepo.findAllWithTranscripts(filters);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get insights for transcript'),
      };
    }
  }

  /**
   * Approve multiple insights at once
   */
  async approveInsights(insightIds: string[]): Promise<Result<BulkOperationResult>> {
    return this.bulkUpdateInsights(insightIds, 'approve');
  }

  /**
   * Reject multiple insights at once
   */
  async rejectInsights(insightIds: string[]): Promise<Result<BulkOperationResult>> {
    return this.bulkUpdateInsights(insightIds, 'reject');
  }

  /**
   * Archive multiple insights at once
   */
  async archiveInsights(insightIds: string[]): Promise<Result<BulkOperationResult>> {
    return this.bulkUpdateInsights(insightIds, 'archive');
  }
}