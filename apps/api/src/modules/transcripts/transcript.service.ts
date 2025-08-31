import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TranscriptRepository } from './transcript.repository';
import { TranscriptStateService } from './services/transcript-state.service';
import { CreateTranscriptDto, UpdateTranscriptDto } from './dto';
import { TranscriptStatus } from '@content-creation/types';
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

  async findAll(): Promise<TranscriptEntity[]> {
    return this.transcriptRepository.findAll();
  }

  // Remove findAllWithMetadata method entirely

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
  // Status transitions are now handled exclusively through TranscriptStateService

  /**
   * Get transcripts ready for processing
   */
  async getTranscriptsForProcessing(): Promise<TranscriptEntity[]> {
    // Fetch all and filter client-side for specific status
    const allTranscripts = await this.findAll();
    return allTranscripts.filter(t => t.status === TranscriptStatus.RAW);
  }



  async update(id: string, data: UpdateTranscriptDto): Promise<TranscriptEntity> {
    this.logger.log(`Updating transcript: ${id}`);
    
    // Get current transcript for status change detection
    const currentTranscript = await this.transcriptRepository.findById(id);
    const updatedTranscript = await this.transcriptRepository.update(id, data);
    
    // Status change events are now emitted by state machines, not services
    
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
    const statusCounts = await this.transcriptRepository.getStatusCounts();
    return {
      total: totalCount,
      raw: statusCounts[TranscriptStatus.RAW] || 0,
      processed: statusCounts[TranscriptStatus.CLEANED] || 0,
    };
  }
}