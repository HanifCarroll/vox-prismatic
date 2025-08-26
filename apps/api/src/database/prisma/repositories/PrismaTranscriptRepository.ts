import type { ITranscriptRepository } from '../../interfaces';
import type { 
  Result, 
  TranscriptView, 
  TranscriptFilter, 
  StatsResult,
  TranscriptStatus 
} from '@content-creation/types';
import type { NewTranscript } from '@content-creation/types/database';
import type { Transcript } from '../generated';
import { PrismaBaseRepository } from './PrismaBaseRepository';

/**
 * Prisma Transcript Repository
 * Implements transcript data operations using Prisma
 */
export class PrismaTranscriptRepository 
  extends PrismaBaseRepository 
  implements ITranscriptRepository {

  /**
   * Convert Prisma transcript to TranscriptView format
   */
  private convertToView(transcript: Transcript): TranscriptView {
    return {
      id: transcript.id,
      title: transcript.title,
      rawContent: transcript.rawContent,
      cleanedContent: transcript.cleanedContent || undefined,
      status: transcript.status as TranscriptStatus,
      sourceType: transcript.sourceType as TranscriptView['sourceType'],
      sourceUrl: transcript.sourceUrl || undefined,
      fileName: transcript.fileName || undefined,
      duration: transcript.duration || undefined,
      wordCount: transcript.wordCount,
      filePath: transcript.filePath || undefined,
      createdAt: new Date(transcript.createdAt),
      updatedAt: new Date(transcript.updatedAt)
    };
  }

  /**
   * Find all transcripts with filtering and pagination
   */
  async findAll(filters?: TranscriptFilter): Promise<Result<TranscriptView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      // Build where clause
      const where: any = {};
      
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status;
      }
      
      if (filters?.sourceType) {
        where.sourceType = filters.sourceType;
      }
      
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { rawContent: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      
      // Build query options
      const options = {
        where,
        ...this.buildPagination(filters?.limit, filters?.offset),
        orderBy: this.buildOrderBy(filters?.sortBy, filters?.sortOrder)
      };
      
      const transcripts = await prisma.transcript.findMany(options);
      return transcripts.map(this.convertToView);
    }, 'Failed to fetch transcripts');
  }

  /**
   * Find transcript by ID
   */
  async findById(id: string): Promise<Result<TranscriptView | null>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const transcript = await prisma.transcript.findUnique({
        where: { id }
      });
      
      return transcript ? this.convertToView(transcript) : null;
    }, 'Failed to fetch transcript');
  }

  /**
   * Create new transcript
   */
  async create(data: NewTranscript): Promise<Result<TranscriptView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const transcript = await prisma.transcript.create({
        data: {
          id: data.id || this.generateId('tr'),
          title: data.title,
          rawContent: data.rawContent,
          cleanedContent: data.cleanedContent,
          status: data.status || 'raw',
          sourceType: data.sourceType,
          sourceUrl: data.sourceUrl,
          fileName: data.fileName,
          duration: data.duration,
          wordCount: data.wordCount || 0,
          filePath: data.filePath
        }
      });
      
      return this.convertToView(transcript);
    }, 'Failed to create transcript');
  }

  /**
   * Update existing transcript
   */
  async update(
    id: string, 
    data: Partial<NewTranscript>
  ): Promise<Result<TranscriptView>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const transcript = await prisma.transcript.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.rawContent && { rawContent: data.rawContent }),
          ...(data.cleanedContent !== undefined && { cleanedContent: data.cleanedContent }),
          ...(data.status && { status: data.status }),
          ...(data.sourceType && { sourceType: data.sourceType }),
          ...(data.sourceUrl !== undefined && { sourceUrl: data.sourceUrl }),
          ...(data.fileName !== undefined && { fileName: data.fileName }),
          ...(data.duration !== undefined && { duration: data.duration }),
          ...(data.wordCount !== undefined && { wordCount: data.wordCount }),
          ...(data.filePath !== undefined && { filePath: data.filePath })
        }
      });
      
      return this.convertToView(transcript);
    }, 'Failed to update transcript');
  }

  /**
   * Delete transcript by ID
   */
  async delete(id: string): Promise<Result<void>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      await prisma.transcript.delete({
        where: { id }
      });
    }, 'Failed to delete transcript');
  }

  /**
   * Get transcript statistics
   */
  async getStats(): Promise<Result<StatsResult>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const [total, byStatus] = await Promise.all([
        prisma.transcript.count(),
        prisma.transcript.groupBy({
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
    }, 'Failed to get transcript statistics');
  }

  /**
   * Update transcript status
   */
  async updateStatus(
    id: string, 
    status: TranscriptView['status']
  ): Promise<Result<TranscriptView>> {
    return this.update(id, { status });
  }

  /**
   * Find transcripts ready for processing
   */
  async findReadyForProcessing(limit = 10): Promise<Result<TranscriptView[]>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const transcripts = await prisma.transcript.findMany({
        where: {
          status: 'raw',
          cleanedContent: null
        },
        orderBy: { createdAt: 'asc' },
        take: limit
      });
      
      return transcripts.map(this.convertToView);
    }, 'Failed to find transcripts ready for processing');
  }

  /**
   * Batch update transcript statuses
   */
  async batchUpdateStatus(
    ids: string[], 
    status: TranscriptView['status']
  ): Promise<Result<number>> {
    return this.execute(async () => {
      const prisma = await this.getClient();
      
      const result = await prisma.transcript.updateMany({
        where: {
          id: { in: ids }
        },
        data: { status }
      });
      
      return result.count;
    }, 'Failed to batch update transcript statuses');
  }
}