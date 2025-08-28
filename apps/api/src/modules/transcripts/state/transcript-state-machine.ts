import { createMachine, assign } from 'xstate';
import { TranscriptStatus } from '../dto/update-transcript.dto';

/**
 * Minimal context for transcript state machine
 * Tracks only essential data for processing status
 */
export interface TranscriptStateMachineContext {
  transcriptId: string;
  queueJobId: string | null;
  errorMessage: string | null;
  attemptCount: number;
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
 * Minimal transcript state machine for tracking cleaning status
 * Solves the visibility problem: users can see when processing is happening
 */
export const transcriptStateMachine = createMachine(
  {
    id: 'transcript',
    initial: TranscriptStatus.RAW,
    context: {
      transcriptId: '',
      queueJobId: null,
      errorMessage: null,
      attemptCount: 0,
    },
    states: {
      [TranscriptStatus.RAW]: {
        on: {
          START_PROCESSING: {
            target: TranscriptStatus.PROCESSING,
            actions: 'setProcessingInfo'
          }
        }
      },
      
      [TranscriptStatus.PROCESSING]: {
        on: {
          MARK_CLEANED: {
            target: TranscriptStatus.CLEANED,
            actions: 'clearProcessingInfo'
          },
          MARK_FAILED: {
            target: TranscriptStatus.FAILED,
            actions: 'recordFailure'
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
            actions: 'incrementAttempt'
          }
        }
      }
    }
  },
  {
    actions: {
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
      })
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
    }
  });
  return state.can({ type: eventType } as TranscriptStateMachineEvent);
}