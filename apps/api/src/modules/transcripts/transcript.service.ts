import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TranscriptRepository } from './transcript.repository';
import { CreateTranscriptDto, UpdateTranscriptDto, TranscriptFilterDto, TranscriptStatus } from './dto';
import { TranscriptEntity } from './entities/transcript.entity';
import { IdGeneratorService } from '../shared/services/id-generator.service';

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(
    private readonly transcriptRepository: TranscriptRepository,
    private readonly idGenerator: IdGeneratorService,
  ) {}

  async findAll(filters?: TranscriptFilterDto): Promise<TranscriptEntity[]> {
    return this.transcriptRepository.findAll(filters);
  }

  async findAllWithMetadata(filters?: TranscriptFilterDto) {
    return this.transcriptRepository.findAllWithMetadata(filters);
  }

  async findById(id: string): Promise<TranscriptEntity> {
    return this.transcriptRepository.findById(id);
  }

  async create(data: CreateTranscriptDto): Promise<TranscriptEntity> {
    // Generate ID and calculate word count
    const transcriptData = {
      ...data,
      id: this.idGenerator.generate('transcript'),
      wordCount: data.rawContent.split(' ').filter(word => word.length > 0).length,
      status: TranscriptStatus.RAW,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.logger.log(`Creating transcript: ${data.title}`);
    return this.transcriptRepository.create(transcriptData);
  }

  // Manual processing method removed - use automated content processing pipeline:
  // POST /content-processing/transcripts/:id/clean - triggers automated pipeline

  /**
   * Update transcript status
   */
  async updateTranscriptStatus(
    id: string,
    status: TranscriptStatus
  ): Promise<TranscriptEntity> {
    this.logger.log(`Updating transcript ${id} status to ${status}`);
    
    return this.transcriptRepository.update(id, {
      status,
      updatedAt: new Date()
    });
  }

  /**
   * Get transcripts ready for processing
   */
  async getTranscriptsForProcessing(): Promise<TranscriptEntity[]> {
    return this.findAll({ status: TranscriptStatus.RAW } as TranscriptFilterDto);
  }

  /**
   * Get transcripts with errors
   */
  async getErroredTranscripts(): Promise<TranscriptEntity[]> {
    return this.findAll({ status: TranscriptStatus.ERROR } as TranscriptFilterDto);
  }

  /**
   * Retry processing for errored transcript
   */
  async retryProcessing(id: string): Promise<TranscriptEntity> {
    this.logger.log(`Retrying processing for transcript: ${id}`);
    
    const transcript = await this.findById(id);
    
    if (!transcript) {
      throw new BadRequestException(`Transcript not found: ${id}`);
    }

    if (transcript.status !== 'error') {
      throw new BadRequestException(`Transcript is not in error status: ${transcript.status}`);
    }

    // Reset status to raw and reprocess
    await this.transcriptRepository.update(id, {
      status: TranscriptStatus.RAW,
      updatedAt: new Date()
    });

    return this.processTranscript(id);
  }

  async update(id: string, data: UpdateTranscriptDto): Promise<TranscriptEntity> {
    return this.transcriptRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.transcriptRepository.delete(id);
  }

  async getStats() {
    const totalCount = await this.transcriptRepository.count();
    const rawCount = await this.transcriptRepository.count({ status: TranscriptStatus.RAW } as TranscriptFilterDto);
    const processedCount = await this.transcriptRepository.count({ status: TranscriptStatus.CLEANED } as TranscriptFilterDto);
    const errorCount = await this.transcriptRepository.count({ status: TranscriptStatus.ERROR } as TranscriptFilterDto);

    return {
      total: totalCount,
      raw: rawCount,
      processed: processedCount,
      error: errorCount,
    };
  }
}