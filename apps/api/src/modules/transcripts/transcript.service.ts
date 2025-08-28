import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TranscriptRepository } from './transcript.repository';
import { TranscriptStateService } from './services/transcript-state.service';
import { CreateTranscriptDto, UpdateTranscriptDto, TranscriptFilterDto, TranscriptStatus } from './dto';
import { TranscriptEntity } from './entities/transcript.entity';
import { IdGeneratorService } from '../shared/services/id-generator.service';
import { 
  TRANSCRIPT_EVENTS, 
  TranscriptProcessingCompletedEvent, 
  TranscriptUploadedEvent,
  TranscriptStatusChangedEvent,
  TranscriptDeletedEvent
} from './events/transcript.events';

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(
    private readonly transcriptRepository: TranscriptRepository,
    private readonly transcriptStateService: TranscriptStateService,
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
   * @deprecated Use TranscriptStateService for status transitions
   * This method is kept for backward compatibility but should not be used
   * Status transitions should go through the state machine
   */
  async updateTranscriptStatus(
    id: string,
    status: TranscriptStatus
  ): Promise<TranscriptEntity> {
    this.logger.warn(`Direct status update called for transcript ${id}. Please use TranscriptStateService instead.`);
    
    // For backward compatibility, delegate to state machine if possible
    switch(status) {
      case TranscriptStatus.PROCESSING:
        // Can't transition to PROCESSING without a job ID
        throw new BadRequestException('Use TranscriptStateService.startProcessing() with a job ID');
      case TranscriptStatus.CLEANED:
        return this.transcriptStateService.markCleaned(id);
      case TranscriptStatus.FAILED:
        return this.transcriptStateService.markFailed(id, 'Status update without error message');
      case TranscriptStatus.RAW:
        // Only valid from FAILED state
        return this.transcriptStateService.retry(id);
      default:
        throw new BadRequestException(`Invalid status transition to ${status}`);
    }
  }

  /**
   * Get transcripts ready for processing
   */
  async getTranscriptsForProcessing(): Promise<TranscriptEntity[]> {
    return this.findAll({ status: TranscriptStatus.RAW } as TranscriptFilterDto);
  }



  async update(id: string, data: UpdateTranscriptDto): Promise<TranscriptEntity> {
    this.logger.log(`Updating transcript: ${id}`);
    
    // Get current transcript for status change detection
    const currentTranscript = await this.transcriptRepository.findById(id);
    const updatedTranscript = await this.transcriptRepository.update(id, data);
    
    // Emit status change event if status changed
    if (data.status && data.status !== currentTranscript.status) {
      try {
        const statusChangeEvent: TranscriptStatusChangedEvent = {
          transcriptId: id,
          transcript: updatedTranscript,
          previousStatus: currentTranscript.status,
          newStatus: data.status,
          changedBy: 'system', // Could be enhanced to track actual user
          timestamp: new Date()
        };
        
        this.eventEmitter.emit(TRANSCRIPT_EVENTS.STATUS_CHANGED, statusChangeEvent);
        this.logger.log(`Emitted transcript status changed event: ${currentTranscript.status} → ${data.status}`);
      } catch (eventError) {
        this.logger.error(`Failed to emit transcript status change event:`, eventError);
      }
    }
    
    return updatedTranscript;
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting transcript: ${id}`);
    
    // Get transcript info before deletion
    const transcript = await this.transcriptRepository.findById(id);
    await this.transcriptRepository.delete(id);
    
    // Emit deletion event
    try {
      const deletionEvent: TranscriptDeletedEvent = {
        transcriptId: id,
        title: transcript.title,
        status: transcript.status,
        deletedBy: 'system', // Could be enhanced to track actual user
        timestamp: new Date()
      };
      
      this.eventEmitter.emit(TRANSCRIPT_EVENTS.DELETED, deletionEvent);
      this.logger.log(`Emitted transcript deleted event for: ${transcript.title}`);
    } catch (eventError) {
      this.logger.error(`Failed to emit transcript deletion event:`, eventError);
    }
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