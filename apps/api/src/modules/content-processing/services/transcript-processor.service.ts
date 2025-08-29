import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIService } from '../../ai/ai.service';
import { TranscriptStateService } from '../../transcripts/services/transcript-state.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class TranscriptProcessorService {
  private readonly logger = new Logger(TranscriptProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly transcriptStateService: TranscriptStateService,
  ) {}

  async cleanTranscript(transcriptId: string, rawContent: string) {
    this.logger.log(`Processing transcript cleaning for ${transcriptId}`);
    
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: transcriptId },
    });
    
    const result = await this.aiService.cleanTranscript({
      transcriptId,
      title: transcript?.title || 'Transcript',
      content: rawContent,
    });

    return {
      cleanedContent: result.cleanedText,
      wordCount: result.cleanedText.split(' ').length,
      processingDurationMs: result.duration,
    };
  }

  async updateTranscript(transcriptId: string, updates: Prisma.TranscriptUpdateInput) {
    this.logger.log(`Updating transcript ${transcriptId} with cleaned content`);
    
    await this.prisma.transcript.update({
      where: { id: transcriptId },
      data: updates,
    });
    
    if (updates.cleanedContent) {
      await this.transcriptStateService.markCleaned(transcriptId);
    }
  }

  async getTranscript(transcriptId: string) {
    return await this.prisma.transcript.findUnique({
      where: { id: transcriptId },
    });
  }

  async updateTranscriptJobId(transcriptId: string, jobId: string) {
    await this.prisma.transcript.update({
      where: { id: transcriptId },
      data: { queueJobId: jobId },
    });
  }

  async markTranscriptFailed(transcriptId: string, errorMessage: string) {
    this.logger.log(`Marking transcript ${transcriptId} as failed`);
    
    await this.prisma.transcript.update({
      where: { id: transcriptId },
      data: { status: 'FAILED' },
    });
    
    await this.transcriptStateService.markFailed(transcriptId, errorMessage);
  }

  async clearTranscriptQueueJobId(transcriptId: string) {
    await this.prisma.transcript.update({
      where: { id: transcriptId },
      data: { queueJobId: null },
    });
  }

  async getTranscriptsWithJobIds() {
    return await this.prisma.transcript.findMany({
      where: { queueJobId: { not: null } },
      select: { id: true, queueJobId: true },
    });
  }
}