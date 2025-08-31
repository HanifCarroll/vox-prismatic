import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTranscriptDto, UpdateTranscriptDto } from './dto';
import { TranscriptEntity } from './entities/transcript.entity';
import { TranscriptNotFoundError } from '../../common/exceptions/domain.exceptions';

@Injectable()
export class TranscriptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TranscriptEntity[]> {
    // Simple fetch all, ordered by creation date
    const transcripts = await this.prisma.transcript.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10000, // Safety limit
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
      queueJobId: transcript.queueJobId || undefined,
      errorMessage: transcript.errorMessage || undefined,
      failedAt: transcript.failedAt || undefined,
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
      queueJobId: transcript.queueJobId || undefined,
      errorMessage: transcript.errorMessage || undefined,
      failedAt: transcript.failedAt || undefined,
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
      queueJobId: transcript.queueJobId || undefined,
      errorMessage: transcript.errorMessage || undefined,
      failedAt: transcript.failedAt || undefined,
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
    // Status updates are handled by state machines, not DTOs
    if (data.cleanedContent !== undefined) updateData.cleanedContent = data.cleanedContent;
    if (data.updatedAt !== undefined) updateData.updatedAt = data.updatedAt;
    if (data.processingDurationMs !== undefined) updateData.processingDurationMs = data.processingDurationMs;
    if (data.estimatedTokens !== undefined) updateData.estimatedTokens = data.estimatedTokens;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;
    if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage;
    if (data.failedAt !== undefined) updateData.failedAt = data.failedAt;

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
      queueJobId: transcript.queueJobId || undefined,
      errorMessage: transcript.errorMessage || undefined,
      failedAt: transcript.failedAt || undefined,
    });
  }

  async delete(id: string): Promise<void> {
    // Check if transcript exists
    await this.findById(id);

    await this.prisma.transcript.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return this.prisma.transcript.count();
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

  // Remove findAllWithMetadata method entirely
}