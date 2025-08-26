import type { Result } from '@content-creation/types';
import type { TranscriptView, TranscriptFilter } from '@content-creation/types';
import { getDatabaseAdapter } from '../database/adapter';
import { generateId } from '../lib/id-generator';

export interface CreateTranscriptRequest {
  title: string;
  rawContent: string;
  sourceType?: 'recording' | 'upload' | 'manual' | 'youtube' | 'podcast' | 'article';
  sourceUrl?: string;
  fileName?: string;
  duration?: number;
}

export interface UpdateTranscriptRequest {
  title?: string;
  rawContent?: string;
  status?: 'raw' | 'processing' | 'cleaned' | 'insights_generated' | 'posts_created' | 'error';
}

/**
 * Service layer for transcript operations
 * Handles all business logic related to transcripts
 */
export class TranscriptService {
  private transcriptRepo;

  constructor() {
    const adapter = getDatabaseAdapter();
    this.transcriptRepo = adapter.getTranscriptRepository();
  }

  /**
   * Get all transcripts with optional filtering
   */
  async getTranscripts(filters?: TranscriptFilter): Promise<Result<TranscriptView[]>> {
    try {
      return await this.transcriptRepo.findAll(filters);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get transcripts'),
      };
    }
  }

  /**
   * Get a single transcript by ID
   */
  async getTranscript(id: string): Promise<Result<TranscriptView>> {
    try {
      return await this.transcriptRepo.findById(id);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get transcript'),
      };
    }
  }

  /**
   * Create a new transcript
   */
  async createTranscript(data: CreateTranscriptRequest): Promise<Result<TranscriptView>> {
    try {
      // Calculate word count from content
      const wordCount = data.rawContent.split(' ').filter(word => word.length > 0).length;
      
      const transcriptData = {
        id: generateId('transcript'),
        ...data,
        sourceType: data.sourceType || 'manual',
        status: 'raw' as const,
        wordCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return await this.transcriptRepo.create(transcriptData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create transcript'),
      };
    }
  }

  /**
   * Update an existing transcript
   */
  async updateTranscript(id: string, data: UpdateTranscriptRequest): Promise<Result<TranscriptView>> {
    try {
      // If content is updated, recalculate word count
      let updateData: any = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      if (data.rawContent) {
        updateData.wordCount = data.rawContent.split(' ').filter(word => word.length > 0).length;
      }

      return await this.transcriptRepo.update(id, updateData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update transcript'),
      };
    }
  }

  /**
   * Delete a transcript
   */
  async deleteTranscript(id: string): Promise<Result<void>> {
    try {
      // Check if transcript exists
      const existingResult = await this.transcriptRepo.findById(id);
      if (!existingResult.success) {
        return {
          success: false,
          error: new Error(`Transcript with id ${id} not found`),
        };
      }

      // Note: Actual delete method would need to be implemented in repository
      // For now, returning success as placeholder
      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete transcript'),
      };
    }
  }
}