import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TranscriptRepository } from './transcript.repository';
import { CreateTranscriptDto, UpdateTranscriptDto, TranscriptFilterDto, TranscriptStatus } from './dto';
import { TranscriptEntity } from './entities/transcript.entity';
import { IdGeneratorService } from '../shared/services/id-generator.service';
import { TRANSCRIPT_EVENTS, TranscriptProcessingCompletedEvent, TranscriptUploadedEvent } from './events/transcript.events';

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(
    private readonly transcriptRepository: TranscriptRepository,
    private readonly idGenerator: IdGeneratorService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
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
    const createdTranscript = await this.transcriptRepository.create(transcriptData);

    // Emit transcript uploaded event to trigger automatic processing pipeline
    const event: TranscriptUploadedEvent = {
      transcriptId: createdTranscript.id,
      transcript: createdTranscript,
      timestamp: new Date()
    };
    
    this.eventEmitter.emit(TRANSCRIPT_EVENTS.UPLOADED, event);
    this.logger.log(`Emitted transcript uploaded event for ${createdTranscript.id} - processing pipeline will start automatically`);

    return createdTranscript;
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
    
    const updatedTranscript = await this.transcriptRepository.update(id, {
      status,
      updatedAt: new Date()
    });

    // Emit event when transcript processing completes (status changes to 'cleaned')
    if (status === TranscriptStatus.CLEANED) {
      const event: TranscriptProcessingCompletedEvent = {
        transcriptId: id,
        transcript: updatedTranscript,
        status: status,
        timestamp: new Date()
      };
      
      this.eventEmitter.emit(TRANSCRIPT_EVENTS.PROCESSING_COMPLETED, event);
      this.logger.log(`Emitted transcript processing completed event for ${id}`);
    }

    return updatedTranscript;
  }

  /**
   * Get transcripts ready for processing
   */
  async getTranscriptsForProcessing(): Promise<TranscriptEntity[]> {
    return this.findAll({ status: TranscriptStatus.RAW } as TranscriptFilterDto);
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
    return {
      total: totalCount,
      raw: rawCount,
      processed: processedCount,
    };
  }
}