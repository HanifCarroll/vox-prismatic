import { createMachine, assign } from 'xstate';
import { TranscriptStatus } from '../dto/update-transcript.dto';
import { TranscriptRepository } from '../transcript.repository';
import { TranscriptEntity } from '../entities/transcript.entity';

/**
 * Enhanced context for transcript state machine
 * Now includes repository for database persistence and updated entity storage
 */
export interface TranscriptStateMachineContext {
  transcriptId: string;
  queueJobId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  // Phase 1: Repository injection support
  repository?: TranscriptRepository;
  updatedEntity?: TranscriptEntity;
}

/**
 * Events that can trigger transcript state transitions
 */
export type TranscriptStateMachineEvent =
  | { type: 'START_PROCESSING'; queueJobId: string }
  | { type: 'MARK_CLEANED' }
  | { type: 'MARK_FAILED'; error: string }
  | { type: 'RETRY' };

/**
 * Enhanced transcript state machine for tracking cleaning status
 * Phase 1: Now supports repository injection for future database persistence
 * Solves the visibility problem: users can see when processing is happening
 */
export const transcriptStateMachine = createMachine(
  {
    id: 'transcript',
    initial: TranscriptStatus.RAW,
    types: {
      context: {} as TranscriptStateMachineContext,
      events: {} as TranscriptStateMachineEvent,
    },
    context: ({ input }: { input?: Partial<TranscriptStateMachineContext> }) => ({
      transcriptId: input?.transcriptId || '',
      queueJobId: input?.queueJobId || null,
      errorMessage: input?.errorMessage || null,
      attemptCount: input?.attemptCount || 0,
      repository: input?.repository,
      updatedEntity: input?.updatedEntity,
    }),
    states: {
      [TranscriptStatus.RAW]: {
        on: {
          START_PROCESSING: {
            target: TranscriptStatus.PROCESSING,
            actions: ['setProcessingInfo', 'persistProcessingStart']
          }
        }
      },
      
      [TranscriptStatus.PROCESSING]: {
        on: {
          MARK_CLEANED: {
            target: TranscriptStatus.CLEANED,
            actions: ['clearProcessingInfo', 'persistProcessingComplete']
          },
          MARK_FAILED: {
            target: TranscriptStatus.FAILED,
            actions: ['recordFailure', 'persistFailure']
          }
        }
      },
      
      [TranscriptStatus.CLEANED]: {
        type: 'final'
      },
      
      [TranscriptStatus.FAILED]: {
        on: {
          RETRY: {
            target: TranscriptStatus.RAW,
            actions: ['incrementAttempt', 'persistRetry']
          }
        }
      }
    }
  },
  {
    actions: {
      // Context update actions
      setProcessingInfo: assign({
        queueJobId: ({ context, event }) => (event as any).queueJobId,
        errorMessage: null
      }),
      
      clearProcessingInfo: assign({
        queueJobId: null,
        errorMessage: null
      }),
      
      recordFailure: assign({
        errorMessage: ({ context, event }) => (event as any).error,
        attemptCount: ({ context }) => context.attemptCount + 1
      }),
      
      incrementAttempt: assign({
        attemptCount: ({ context }) => context.attemptCount + 1,
        errorMessage: null,
        queueJobId: null
      }),

      // Phase 2: Database persistence actions
      persistProcessingStart: async ({ context, event }) => {
        if (!context.repository) {
          console.warn('Repository not injected into transcript state machine');
          return;
        }

        try {
          // Update transcript status to PROCESSING and set queueJobId
          const updated = await context.repository.update(context.transcriptId, {
            // Note: Status updates will be handled through direct Prisma calls since
            // the DTO architecture prevents status updates through the UpdateTranscriptDto
            queueJobId: (event as any).queueJobId,
            updatedAt: new Date()
          });

          // Also update status directly via Prisma (bypassing DTO restrictions)
          const statusUpdated = await (context.repository as any).prisma.transcript.update({
            where: { id: context.transcriptId },
            data: { status: TranscriptStatus.PROCESSING }
          });

          // Store updated entity in context for service to return
          context.updatedEntity = new (await import('../entities/transcript.entity')).TranscriptEntity({
            ...statusUpdated,
            cleanedContent: statusUpdated.cleanedContent || undefined,
            status: statusUpdated.status as any,
            sourceType: statusUpdated.sourceType as any,
            sourceUrl: statusUpdated.sourceUrl || undefined,
            fileName: statusUpdated.fileName || undefined,
            duration: statusUpdated.duration || undefined,
            filePath: statusUpdated.filePath || undefined,
          });
        } catch (error) {
          console.error('Failed to persist processing start:', error);
          throw error;
        }
      },

      persistProcessingComplete: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into transcript state machine');
          return;
        }

        try {
          // Clear queueJobId and set status to CLEANED
          const updated = await context.repository.update(context.transcriptId, {
            queueJobId: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.transcript.update({
            where: { id: context.transcriptId },
            data: { status: TranscriptStatus.CLEANED }
          });

          context.updatedEntity = new (await import('../entities/transcript.entity')).TranscriptEntity({
            ...statusUpdated,
            cleanedContent: statusUpdated.cleanedContent || undefined,
            status: statusUpdated.status as any,
            sourceType: statusUpdated.sourceType as any,
            sourceUrl: statusUpdated.sourceUrl || undefined,
            fileName: statusUpdated.fileName || undefined,
            duration: statusUpdated.duration || undefined,
            filePath: statusUpdated.filePath || undefined,
          });
        } catch (error) {
          console.error('Failed to persist processing completion:', error);
          throw error;
        }
      },

      persistFailure: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into transcript state machine');
          return;
        }

        try {
          // Set error message and status to FAILED
          const updated = await context.repository.update(context.transcriptId, {
            errorMessage: context.errorMessage,
            failedAt: new Date(),
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.transcript.update({
            where: { id: context.transcriptId },
            data: { status: TranscriptStatus.FAILED }
          });

          context.updatedEntity = new (await import('../entities/transcript.entity')).TranscriptEntity({
            ...statusUpdated,
            cleanedContent: statusUpdated.cleanedContent || undefined,
            status: statusUpdated.status as any,
            sourceType: statusUpdated.sourceType as any,
            sourceUrl: statusUpdated.sourceUrl || undefined,
            fileName: statusUpdated.fileName || undefined,
            duration: statusUpdated.duration || undefined,
            filePath: statusUpdated.filePath || undefined,
          });
        } catch (error) {
          console.error('Failed to persist failure:', error);
          throw error;
        }
      },

      persistRetry: async ({ context }) => {
        if (!context.repository) {
          console.warn('Repository not injected into transcript state machine');
          return;
        }

        try {
          // Reset to RAW status and clear error fields
          const updated = await context.repository.update(context.transcriptId, {
            queueJobId: null,
            errorMessage: null,
            updatedAt: new Date()
          });

          // Update status directly via Prisma
          const statusUpdated = await (context.repository as any).prisma.transcript.update({
            where: { id: context.transcriptId },
            data: { 
              status: TranscriptStatus.RAW,
              failedAt: null
            }
          });

          context.updatedEntity = new (await import('../entities/transcript.entity')).TranscriptEntity({
            ...statusUpdated,
            cleanedContent: statusUpdated.cleanedContent || undefined,
            status: statusUpdated.status as any,
            sourceType: statusUpdated.sourceType as any,
            sourceUrl: statusUpdated.sourceUrl || undefined,
            fileName: statusUpdated.fileName || undefined,
            duration: statusUpdated.duration || undefined,
            filePath: statusUpdated.filePath || undefined,
          });
        } catch (error) {
          console.error('Failed to persist retry:', error);
          throw error;
        }
      }
    }
  }
);

/**
 * Helper to get available transitions from current state
 */
export function getAvailableTransitions(currentState: string): string[] {
  const stateConfig = transcriptStateMachine.config.states?.[currentState as any];
  if (!stateConfig || !stateConfig.on) {
    return [];
  }
  
  return Object.keys(stateConfig.on);
}

/**
 * Helper to check if a transition is valid from current state
 */
export function canTransition(currentState: string, eventType: string): boolean {
  const state = transcriptStateMachine.resolveState({ 
    value: currentState,
    context: {
      transcriptId: '',
      queueJobId: null,
      errorMessage: null,
      attemptCount: 0,
      repository: undefined,
      updatedEntity: undefined,
    }
  });
  return state.can({ type: eventType } as TranscriptStateMachineEvent);
}