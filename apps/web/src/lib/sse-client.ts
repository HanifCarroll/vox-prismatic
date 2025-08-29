/**
 * SSE (Server-Sent Events) Client
 * Handles real-time updates from backend workflow operations
 */

import { getApiBaseUrl } from './api-config';
import type { QueueJobStatus, PipelineStatus, PipelineStage } from '@content-creation/types';

export const API_BASE_URL = getApiBaseUrl();

export interface JobEvent {
  type: 'job.started' | 'job.progress' | 'job.completed' | 'job.failed' | 'job.cancelled' | 'job.stalled';
  jobId: string;
  queueName: string;
  timestamp: string;
  data: {
    progress?: number;
    result?: any;
    error?: { message: string; stack?: string };
    duration?: number;
    attemptsMade?: number;
    maxAttempts?: number;
  };
}

export interface PipelineEvent {
  type: 'pipeline.stage_started' | 'pipeline.stage_completed' | 'pipeline.stage_failed' | 'pipeline.blocked' | 'pipeline.completed';
  transcriptId: string;
  pipelineId?: string;
  stage: PipelineStage;
  timestamp: string;
  data: {
    progress?: number;
    estimatedTimeRemaining?: number;
    blockingItems?: Array<{
      type: string;
      itemId: string;
      message: string;
      priority: string;
    }>;
    error?: string;
  };
}

export type WorkflowEvent = JobEvent | PipelineEvent;

export interface SSEConnection {
  eventSource: EventSource;
  isConnected: boolean;
  reconnectAttempts: number;
  cleanup: () => void;
}

/**
 * Create SSE connection for job monitoring
 */
export function createJobSSEConnection(
  jobId: string,
  onEvent: (event: JobEvent) => void,
  onError?: (error: Event) => void,
  onOpen?: () => void
): SSEConnection {
  const url = `${API_BASE_URL}/api/content-processing/events/${jobId}`;
  const eventSource = new EventSource(url);
  
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const connection: SSEConnection = {
    eventSource,
    isConnected: false,
    reconnectAttempts,
    cleanup: () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      eventSource.close();
    },
  };

  eventSource.onopen = () => {
    connection.isConnected = true;
    connection.reconnectAttempts = 0;
    onOpen?.();
  };

  eventSource.onmessage = (event) => {
    try {
      const eventData: JobEvent = JSON.parse(event.data);
      onEvent(eventData);
      
      // Auto-cleanup on job completion/failure
      if (eventData.type === 'job.completed' || eventData.type === 'job.failed') {
        setTimeout(() => connection.cleanup(), 1000);
      }
    } catch (error) {
      console.error('Failed to parse SSE event:', error);
    }
  };

  eventSource.onerror = (event) => {
    connection.isConnected = false;
    onError?.(event);
    
    // Implement reconnection with exponential backoff
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectTimeout = setTimeout(() => {
        connection.reconnectAttempts++;
        // Create new connection (EventSource doesn't support reconnection)
        const newConnection = createJobSSEConnection(jobId, onEvent, onError, onOpen);
        connection.eventSource = newConnection.eventSource;
      }, delay);
    }
  };

  return connection;
}

/**
 * Create SSE connection for pipeline monitoring
 */
export function createPipelineSSEConnection(
  transcriptId: string,
  onEvent: (event: PipelineEvent) => void,
  onError?: (error: Event) => void,
  onOpen?: () => void
): SSEConnection {
  const url = `${API_BASE_URL}/api/pipelines/transcript/${transcriptId}/events`;
  const eventSource = new EventSource(url);
  
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const connection: SSEConnection = {
    eventSource,
    isConnected: false,
    reconnectAttempts,
    cleanup: () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      eventSource.close();
    },
  };

  eventSource.onopen = () => {
    connection.isConnected = true;
    connection.reconnectAttempts = 0;
    onOpen?.();
  };

  eventSource.onmessage = (event) => {
    try {
      const eventData: PipelineEvent = JSON.parse(event.data);
      onEvent(eventData);
      
      // Auto-cleanup on pipeline completion
      if (eventData.type === 'pipeline.completed') {
        setTimeout(() => connection.cleanup(), 2000);
      }
    } catch (error) {
      console.error('Failed to parse pipeline SSE event:', error);
    }
  };

  eventSource.onerror = (event) => {
    connection.isConnected = false;
    onError?.(event);
    
    // Implement reconnection with exponential backoff
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectTimeout = setTimeout(() => {
        connection.reconnectAttempts++;
        const newConnection = createPipelineSSEConnection(transcriptId, onEvent, onError, onOpen);
        connection.eventSource = newConnection.eventSource;
      }, delay);
    }
  };

  return connection;
}

/**
 * Create SSE connection for general workflow events
 */
export function createWorkflowSSEConnection(
  onEvent: (event: WorkflowEvent) => void,
  onError?: (error: Event) => void,
  onOpen?: () => void
): SSEConnection {
  const url = `${API_BASE_URL}/api/content-processing/events`;
  const eventSource = new EventSource(url);
  
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10; // Higher for general connection
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const connection: SSEConnection = {
    eventSource,
    isConnected: false,
    reconnectAttempts,
    cleanup: () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      eventSource.close();
    },
  };

  eventSource.onopen = () => {
    connection.isConnected = true;
    connection.reconnectAttempts = 0;
    onOpen?.();
  };

  // Handle different event types
  ['job.started', 'job.progress', 'job.completed', 'job.failed', 'job.cancelled', 
   'pipeline.stage_started', 'pipeline.stage_completed', 'pipeline.blocked'].forEach(eventType => {
    eventSource.addEventListener(eventType, (event) => {
      try {
        const eventData: WorkflowEvent = {
          type: eventType as any,
          ...JSON.parse((event as MessageEvent).data)
        };
        onEvent(eventData);
      } catch (error) {
        console.error(`Failed to parse ${eventType} event:`, error);
      }
    });
  });

  eventSource.onerror = (event) => {
    connection.isConnected = false;
    onError?.(event);
    
    // Implement reconnection with exponential backoff
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000);
      reconnectTimeout = setTimeout(() => {
        connection.reconnectAttempts++;
        const newConnection = createWorkflowSSEConnection(onEvent, onError, onOpen);
        connection.eventSource = newConnection.eventSource;
      }, delay);
    }
  };

  return connection;
}

// Note: React hooks will be exported from a separate hooks file
// to avoid importing React in this utility module