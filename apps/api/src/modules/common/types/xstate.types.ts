/**
 * Shared XState typing infrastructure for proper type safety
 * Provides common types and interfaces for state machine implementations
 */

import { Actor, ActorRefFrom } from 'xstate';

/**
 * Type-safe parameters for XState action functions
 * Provides proper typing for context and event parameters in actions
 */
export interface XStateActionParams<TContext, TEvent> {
  context: TContext;
  event: TEvent;
}

/**
 * Type-safe parameters for XState guard functions
 * Provides proper typing for context and event parameters in guards
 */
export interface XStateGuardParams<TContext, TEvent> {
  context: TContext;
  event: TEvent;
}

/**
 * Generic type for XState actor instances
 * Provides proper typing for state machine actors
 */
export type XStateActor<TMachine> = ActorRefFrom<TMachine>;

/**
 * Platform types for social media integrations
 */
export type SocialPlatform = 'linkedin' | 'x';

/**
 * Common state machine context fields for repository injection
 */
export interface BaseStateMachineContext {
  repository?: any; // Will be typed more specifically in implementations
  updatedEntity?: any; // Will be typed more specifically in implementations
}

/**
 * Utility type for extracting event types from discriminated union
 * Usage: ExtractEventType<MyEvent, 'EVENT_NAME'>
 */
export type ExtractEventType<TEvent extends { type: string }, TType extends TEvent['type']> = 
  TEvent extends { type: TType } ? TEvent : never;

/**
 * Type guard for checking if an event is of a specific type
 */
export function isEventOfType<TEvent extends { type: string }, TType extends TEvent['type']>(
  event: TEvent,
  type: TType
): event is ExtractEventType<TEvent, TType> {
  return event.type === type;
}