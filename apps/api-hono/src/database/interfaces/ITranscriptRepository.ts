import type { 
  Result, 
  TranscriptView, 
  TranscriptFilter,
  StatsResult 
} from '@content-creation/types';
import type { NewTranscript } from '@content-creation/types/database';

/**
 * Transcript Repository Interface
 * Defines all operations for transcript data management
 */
export interface ITranscriptRepository {
  /**
   * Find all transcripts with filtering and pagination
   */
  findAll(filters?: TranscriptFilter): Promise<Result<TranscriptView[]>>;

  /**
   * Find transcript by ID
   */
  findById(id: string): Promise<Result<TranscriptView | null>>;

  /**
   * Create new transcript
   */
  create(data: NewTranscript): Promise<Result<TranscriptView>>;

  /**
   * Update existing transcript
   */
  update(id: string, data: Partial<NewTranscript>): Promise<Result<TranscriptView>>;

  /**
   * Delete transcript by ID
   */
  delete(id: string): Promise<Result<void>>;

  /**
   * Get transcript statistics
   */
  getStats(): Promise<Result<StatsResult>>;

  /**
   * Update transcript status
   */
  updateStatus(
    id: string, 
    status: TranscriptView['status']
  ): Promise<Result<TranscriptView>>;

  /**
   * Find transcripts ready for processing
   */
  findReadyForProcessing(limit?: number): Promise<Result<TranscriptView[]>>;

  /**
   * Batch update transcript statuses
   */
  batchUpdateStatus(
    ids: string[], 
    status: TranscriptView['status']
  ): Promise<Result<number>>;
}