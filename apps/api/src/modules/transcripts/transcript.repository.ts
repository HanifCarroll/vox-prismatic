import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTranscriptDto, UpdateTranscriptDto, TranscriptFilterDto } from './dto';
import { TranscriptEntity } from './entities/transcript.entity';
import { TranscriptNotFoundError } from '../../common/exceptions/domain.exceptions';

@Injectable()
export class TranscriptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: TranscriptFilterDto): Promise<TranscriptEntity[]> {
    const where: any = {};

    // Apply status filter
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    // Apply source type filter  
    if (filters?.sourceType) {
      where.sourceType = filters.sourceType;
    }

    // Apply search filter
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { rawContent: { contains: filters.search, mode: 'insensitive' } },
        { cleanedContent: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const transcripts = await this.prisma.transcript.findMany({
      where,
      orderBy: {
        [filters?.sortBy || 'createdAt']: filters?.sortOrder || 'desc'
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return transcripts.map(transcript => new TranscriptEntity({
      id: transcript.id,
      title: transcript.title,
      rawContent: transcript.rawContent,
      cleanedContent: transcript.cleanedContent || undefined,
      status: transcript.status as any,
      sourceType: transcript.sourceType as any,
      sourceUrl: transcript.sourceUrl || undefined,
      fileName: transcript.fileName || undefined,
      duration: transcript.duration || undefined,
      wordCount: transcript.wordCount,
      filePath: transcript.filePath || undefined,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    }));
  }

  async findById(id: string): Promise<TranscriptEntity> {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id },
    });

    if (!transcript) {
      throw new TranscriptNotFoundError(id);
    }

    return new TranscriptEntity({
      id: transcript.id,
      title: transcript.title,
      rawContent: transcript.rawContent,
      cleanedContent: transcript.cleanedContent || undefined,
      status: transcript.status as any,
      sourceType: transcript.sourceType as any,
      sourceUrl: transcript.sourceUrl || undefined,
      fileName: transcript.fileName || undefined,
      duration: transcript.duration || undefined,
      wordCount: transcript.wordCount,
      filePath: transcript.filePath || undefined,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    });
  }

  async create(data: CreateTranscriptDto): Promise<TranscriptEntity> {
    const transcript = await this.prisma.transcript.create({
      data: {
        title: data.title,
        rawContent: data.rawContent,
        sourceType: data.sourceType || 'manual',
        sourceUrl: data.sourceUrl,
        fileName: data.fileName,
        duration: data.duration,
        wordCount: data.rawContent.split(/\s+/).length,
        status: 'raw',
      },
    });

    return new TranscriptEntity({
      id: transcript.id,
      title: transcript.title,
      rawContent: transcript.rawContent,
      cleanedContent: transcript.cleanedContent || undefined,
      status: transcript.status as any,
      sourceType: transcript.sourceType as any,
      sourceUrl: transcript.sourceUrl || undefined,
      fileName: transcript.fileName || undefined,
      duration: transcript.duration || undefined,
      wordCount: transcript.wordCount,
      filePath: transcript.filePath || undefined,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    });
  }

  async update(id: string, data: UpdateTranscriptDto): Promise<TranscriptEntity> {
    // Check if transcript exists
    await this.findById(id);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.rawContent !== undefined) {
      updateData.rawContent = data.rawContent;
      updateData.wordCount = data.rawContent.split(/\s+/).length;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.cleanedContent !== undefined) updateData.cleanedContent = data.cleanedContent;
    if (data.updatedAt !== undefined) updateData.updatedAt = data.updatedAt;
    if (data.processingDurationMs !== undefined) updateData.processingDurationMs = data.processingDurationMs;
    if (data.estimatedTokens !== undefined) updateData.estimatedTokens = data.estimatedTokens;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;

    const transcript = await this.prisma.transcript.update({
      where: { id },
      data: updateData,
    });

    return new TranscriptEntity({
      id: transcript.id,
      title: transcript.title,
      rawContent: transcript.rawContent,
      cleanedContent: transcript.cleanedContent || undefined,
      status: transcript.status as any,
      sourceType: transcript.sourceType as any,
      sourceUrl: transcript.sourceUrl || undefined,
      fileName: transcript.fileName || undefined,
      duration: transcript.duration || undefined,
      wordCount: transcript.wordCount,
      filePath: transcript.filePath || undefined,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    });
  }

  async delete(id: string): Promise<void> {
    // Check if transcript exists
    await this.findById(id);

    await this.prisma.transcript.delete({
      where: { id },
    });
  }

  async count(filters?: TranscriptFilterDto): Promise<number> {
    const where: any = {};

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.sourceType) {
      where.sourceType = filters.sourceType;
    }

    return this.prisma.transcript.count({ where });
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    const counts = await this.prisma.transcript.groupBy({
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

  async findAllWithMetadata(filters?: TranscriptFilterDto) {
    const where: any = {};

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.sourceType) {
      where.sourceType = filters.sourceType;
    }

    // Apply search filter
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { rawContent: { contains: filters.search, mode: 'insensitive' } },
        { cleanedContent: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Run both queries in parallel
    const [transcripts, totalCount, statusCounts] = await Promise.all([
      this.prisma.transcript.findMany({
        where,
        orderBy: {
          [filters?.sortBy || 'createdAt']: filters?.sortOrder || 'desc'
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.transcript.count({ where }),
      this.getStatusCounts()
    ]);

    const entities = transcripts.map(transcript => new TranscriptEntity({
      id: transcript.id,
      title: transcript.title,
      rawContent: transcript.rawContent,
      cleanedContent: transcript.cleanedContent || undefined,
      status: transcript.status as any,
      sourceType: transcript.sourceType as any,
      sourceUrl: transcript.sourceUrl || undefined,
      fileName: transcript.fileName || undefined,
      duration: transcript.duration || undefined,
      wordCount: transcript.wordCount,
      filePath: transcript.filePath || undefined,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    }));

    return {
      data: entities,
      metadata: {
        pagination: {
          total: totalCount,
          page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
          pageSize: filters?.limit || 50,
          totalPages: Math.ceil(totalCount / (filters?.limit || 50)),
          hasMore: (filters?.offset || 0) + (filters?.limit || 50) < totalCount
        },
        counts: statusCounts
      }
    };
  }
}