import type { 
  Result, 
  InsightView, 
  InsightFilter,
  StatsResult,
  BulkInsightsResponse,
  GenerateInsightsResponse
} from '@content-creation/types';
import type { NewInsight } from '@content-creation/types/database';

/**
 * Insight Repository Interface
 * Defines all operations for insight data management
 */
export interface IInsightRepository {
  /**
   * Find all insights with filtering and pagination
   */
  findAll(filters?: InsightFilter): Promise<Result<InsightView[]>>;

  /**
   * Find insight by ID
   */
  findById(id: string): Promise<Result<InsightView | null>>;

  /**
   * Find insights by transcript ID
   */
  findByTranscriptId(transcriptId: string): Promise<Result<InsightView[]>>;

  /**
   * Create new insight
   */
  create(data: NewInsight): Promise<Result<InsightView>>;

  /**
   * Create multiple insights
   */
  createMany(data: NewInsight[]): Promise<Result<InsightView[]>>;

  /**
   * Update existing insight
   */
  update(id: string, data: Partial<NewInsight>): Promise<Result<InsightView>>;

  /**
   * Delete insight by ID
   */
  delete(id: string): Promise<Result<void>>;

  /**
   * Get insight statistics
   */
  getStats(): Promise<Result<StatsResult>>;

  /**
   * Update insight status
   */
  updateStatus(
    id: string, 
    status: InsightView['status']
  ): Promise<Result<InsightView>>;

  /**
   * Find insights ready for post generation
   */
  findReadyForPosts(limit?: number): Promise<Result<InsightView[]>>;

  /**
   * Batch update insight statuses
   */
  batchUpdateStatus(
    ids: string[], 
    status: InsightView['status']
  ): Promise<Result<number>>;

  /**
   * Process selected insights (generate posts or update status)
   */
  processSelected(
    insightIds: string[],
    action: 'generate_posts' | 'approve' | 'reject'
  ): Promise<Result<BulkInsightsResponse>>;

  /**
   * Get insights with their associated transcript titles
   */
  findAllWithTranscripts(filters?: InsightFilter): Promise<Result<InsightView[]>>;
}