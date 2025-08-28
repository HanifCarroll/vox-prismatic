import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createActor } from 'xstate';
import { 
  transcriptStateMachine, 
  type TranscriptStateMachineContext,
  type TranscriptStateMachineEvent,
  canTransition,
  getAvailableTransitions 
} from '../state/transcript-state-machine';
import { TranscriptRepository } from '../transcript.repository';
import { TranscriptEntity } from '../entities/transcript.entity';
import { TranscriptStatus } from '../dto/update-transcript.dto';
import { TRANSCRIPT_EVENTS } from '../events/transcript.events';

/**
 * Service for managing transcript state transitions
 * Provides visibility into transcript processing status
 */
@Injectable()
export class TranscriptStateService {
  private readonly logger = new Logger(TranscriptStateService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly transcriptRepository: TranscriptRepository
  ) {}

  /**
   * Phase 3: Common utility for executing state machine transitions
   * Centralizes the actor creation, execution, and cleanup pattern
   */
  private async executeTransition(
    transcript: TranscriptEntity,
    event: TranscriptStateMachineEvent,
    fromState?: TranscriptStatus
  ): Promise<TranscriptEntity> {
    const actor = createActor(transcriptStateMachine, {
      input: {
        transcriptId: transcript.id,
        queueJobId: transcript.queueJobId,
        errorMessage: transcript.errorMessage,
        attemptCount: 0, // Transcript model doesn't track attempt count
        repository: this.transcriptRepository
      }
    });

    actor.start();

    // If starting from a specific state, resolve to that state first
    if (fromState) {
      const targetState = transcriptStateMachine.resolveState({
        value: fromState,
        context: actor.getSnapshot().context
      });
    }

    // Execute the transition
    actor.send(event);
    const newSnapshot = actor.getSnapshot();

    // Get updated entity from state machine context
    const updatedTranscript = newSnapshot.context.updatedEntity || transcript;
    
    actor.stop();
    return updatedTranscript;
  }

  /**
   * Start processing a transcript (RAW → PROCESSING)
   * Phase 3: Simplified to orchestration role
   */
  async startProcessing(transcriptId: string, queueJobId: string): Promise<TranscriptEntity> {
    this.logger.log(`Starting processing for transcript ${transcriptId} with job ${queueJobId}`);

    const transcript = await this.transcriptRepository.findById(transcriptId);
    if (!transcript) {
      throw new NotFoundException(`Transcript ${transcriptId} not found`);
    }

    if (transcript.status !== TranscriptStatus.RAW) {
      throw new BadRequestException(
        `Cannot start processing transcript in ${transcript.status} state`
      );
    }

    // Execute state transition - state machine handles all business logic and persistence
    const updatedTranscript = await this.executeTransition(
      transcript, 
      { type: 'START_PROCESSING', queueJobId }
    );

    // Emit processing started event
    this.eventEmitter.emit(TRANSCRIPT_EVENTS.PROCESSING_STARTED, {
      transcriptId,
      transcript: updatedTranscript,
      processingType: 'cleaning',
      queueJobId,
      timestamp: new Date()
    });

    this.logger.log(`Transcript ${transcriptId} transitioned to PROCESSING state`);
    return updatedTranscript;
  }

  /**
   * Mark transcript as cleaned (PROCESSING → CLEANED)
   * Phase 3: Simplified to orchestration role
   */
  async markCleaned(transcriptId: string): Promise<TranscriptEntity> {
    this.logger.log(`Marking transcript ${transcriptId} as cleaned`);

    const transcript = await this.transcriptRepository.findById(transcriptId);
    if (!transcript) {
      throw new NotFoundException(`Transcript ${transcriptId} not found`);
    }

    if (transcript.status !== TranscriptStatus.PROCESSING) {
      throw new BadRequestException(
        `Cannot mark transcript as cleaned from ${transcript.status} state`
      );
    }

    // Execute state transition - state machine handles all business logic and persistence
    const updatedTranscript = await this.executeTransition(
      transcript,
      { type: 'MARK_CLEANED' },
      TranscriptStatus.PROCESSING
    );

    // Emit processing completed event
    this.eventEmitter.emit(TRANSCRIPT_EVENTS.PROCESSING_COMPLETED, {
      transcriptId,
      transcript: updatedTranscript,
      status: TranscriptStatus.CLEANED,
      processingType: 'cleaning',
      queueJobId: transcript.queueJobId,
      timestamp: new Date()
    });

    this.logger.log(`Transcript ${transcriptId} transitioned to CLEANED state`);
    return updatedTranscript;
  }

  /**
   * Mark transcript as failed (PROCESSING → FAILED)
   * Phase 3: Simplified to orchestration role
   */
  async markFailed(transcriptId: string, error: string): Promise<TranscriptEntity> {
    this.logger.log(`Marking transcript ${transcriptId} as failed: ${error}`);

    const transcript = await this.transcriptRepository.findById(transcriptId);
    if (!transcript) {
      throw new NotFoundException(`Transcript ${transcriptId} not found`);
    }

    if (transcript.status !== TranscriptStatus.PROCESSING) {
      throw new BadRequestException(
        `Cannot mark transcript as failed from ${transcript.status} state`
      );
    }

    // Execute state transition - state machine handles all business logic and persistence
    const updatedTranscript = await this.executeTransition(
      transcript,
      { type: 'MARK_FAILED', error },
      TranscriptStatus.PROCESSING
    );

    // Emit processing failed event
    this.eventEmitter.emit(TRANSCRIPT_EVENTS.FAILED, {
      transcriptId,
      transcript: updatedTranscript,
      error,
      processingType: 'cleaning',
      queueJobId: transcript.queueJobId,
      timestamp: new Date()
    });

    this.logger.log(`Transcript ${transcriptId} transitioned to FAILED state`);
    return updatedTranscript;
  }

  /**
   * Retry a failed transcript (FAILED → RAW)
   * Phase 3: Simplified to orchestration role
   */
  async retry(transcriptId: string): Promise<TranscriptEntity> {
    this.logger.log(`Retrying transcript ${transcriptId}`);

    const transcript = await this.transcriptRepository.findById(transcriptId);
    if (!transcript) {
      throw new NotFoundException(`Transcript ${transcriptId} not found`);
    }

    if (transcript.status !== TranscriptStatus.FAILED) {
      throw new BadRequestException(
        `Cannot retry transcript from ${transcript.status} state`
      );
    }

    // Execute state transition - state machine handles all business logic and persistence
    const updatedTranscript = await this.executeTransition(
      transcript,
      { type: 'RETRY' },
      TranscriptStatus.FAILED
    );

    // Emit status changed event
    this.eventEmitter.emit(TRANSCRIPT_EVENTS.STATUS_CHANGED, {
      transcriptId,
      transcript: updatedTranscript,
      previousStatus: TranscriptStatus.FAILED,
      newStatus: TranscriptStatus.RAW,
      reason: 'Retry requested',
      timestamp: new Date()
    });

    this.logger.log(`Transcript ${transcriptId} reset to RAW state for retry`);
    return updatedTranscript;
  }

  /**
   * Check if a transition is valid for a transcript
   */
  async canTransition(transcriptId: string, eventType: string): Promise<boolean> {
    const transcript = await this.transcriptRepository.findById(transcriptId);
    if (!transcript) {
      return false;
    }
    
    return canTransition(transcript.status, eventType);
  }

  /**
   * Get available actions for a transcript's current state
   */
  async getAvailableActions(transcriptId: string): Promise<string[]> {
    const transcript = await this.transcriptRepository.findById(transcriptId);
    if (!transcript) {
      throw new NotFoundException(`Transcript ${transcriptId} not found`);
    }

    return getAvailableTransitions(transcript.status);
  }
}