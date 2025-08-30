/**
 * SSE (Server-Sent Events) Client
 * Handles real-time updates from backend workflow operations
 * Uses @microsoft/fetch-event-source for robust SSE handling with automatic reconnection
 */

import { fetchEventSource } from '@microsoft/fetch-event-source';
import { env } from '@/env';
import type { QueueJobStatus, PipelineStatus, PipelineStage, BlockingItem } from '@content-creation/types';

// SSE connections are always client-side, using the public API URL
// This ensures the browser can connect to the API server directly
const getSSEBaseUrl = () => {
  return env.publicApiBaseUrl;
};

export const API_BASE_URL = getSSEBaseUrl();

/**
 * Centralized SSE message parser
 * Handles various formats and edge cases for SSE messages
 */
function parseSSEMessage<T>(msg: any, context: string = ''): T | null {
  // Skip non-data events like 'connected'
  if (msg.event === 'connected') {
    console.log(`SSE connection confirmed${context ? ` for ${context}` : ''}`);
    return null;
  }

  // Skip empty messages
  if (!msg.data) {
    return null;
  }

  // Handle the data parsing
  if (typeof msg.data === 'string') {
    // Skip empty strings
    if (msg.data.trim() === '') {
      return null;
    }
    
    try {
      const parsed = JSON.parse(msg.data);
      
      // Add event type if it's a named event and not already present
      if (msg.event && !parsed.type) {
        parsed.type = msg.event;
      }
      
      return parsed as T;
    } catch (parseError) {
      console.warn(`Received non-JSON SSE data${context ? ` for ${context}` : ''}:`, msg.data);
      return null;
    }
  } else {
    // Data is already parsed
    const data = msg.data as T;
    
    // Add event type if it's a named event and not already present
    if (msg.event && !(data as any).type) {
      (data as any).type = msg.event;
    }
    
    return data;
  }
}

/**
 * Common SSE connection configuration
 */
interface SSEConfig {
  url: string;
  onOpen?: () => void;
  onError?: (error: Error) => void;
  onMessage: (msg: any) => void;
  openWhenHidden?: boolean;
}

/**
 * Create a base SSE connection with common error handling
 */
function createSSEConnection(config: SSEConfig): SSEConnection {
  const controller = new AbortController();
  
  fetchEventSource(config.url, {
    signal: controller.signal,
    
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        config.onOpen?.();
        return; // Connection is good
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        // Client-side errors are usually non-retriable
        throw new FatalError(`Failed to connect: ${response.status}`);
      } else {
        // Server errors are retriable
        throw new RetriableError(`Server error: ${response.status}`);
      }
    },
    
    onmessage: config.onMessage,
    
    onclose() {
      // Connection closed by server, retry
      throw new RetriableError('Connection closed');
    },
    
    onerror(err) {
      if (err instanceof FatalError) {
        config.onError?.(err);
        throw err; // Stop retrying
      } else {
        config.onError?.(err);
        // Return nothing to use default retry behavior with exponential backoff
      }
    },
    
    openWhenHidden: config.openWhenHidden ?? true,
  });

  return {
    controller,
    cleanup: () => controller.abort(),
  };
}

export interface JobEvent {
  type: 'job.started' | 'job.progress' | 'job.completed' | 'job.failed' | 'job.cancelled' | 'job.stalled';
  jobId: string;
  queueName: string;
  timestamp: string;
  data: {
    progress?: number;
    result?: Record<string, unknown>;
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
    blockingItems?: BlockingItem[];
    error?: string;
  };
}

export type WorkflowEvent = JobEvent | PipelineEvent;

export interface SSEConnection {
  controller: AbortController;
  cleanup: () => void;
}

/**
 * Custom error classes for SSE handling
 */
class RetriableError extends Error {}
class FatalError extends Error {}

/**
 * Create SSE connection for job monitoring
 */
export function createJobSSEConnection(
  jobId: string,
  onEvent: (event: JobEvent) => void,
  onError?: (error: Error) => void,
  onOpen?: () => void
): SSEConnection {
  let autoCloseTimeout: NodeJS.Timeout | null = null;
  
  const connection = createSSEConnection({
    url: `${API_BASE_URL}/api/content-processing/events/${jobId}`,
    onOpen,
    onError,
    onMessage: (msg) => {
      try {
        const eventData = parseSSEMessage<JobEvent>(msg, `job ${jobId}`);
        if (!eventData) return;
        
        onEvent(eventData);
        
        // Auto-cleanup on job completion/failure
        if (eventData.type === 'job.completed' || eventData.type === 'job.failed') {
          autoCloseTimeout = setTimeout(() => connection.cleanup(), 1000);
        }
      } catch (error) {
        console.error('Failed to handle job SSE event:', error, msg);
      }
    },
  });

  // Extend cleanup to handle timeout
  const originalCleanup = connection.cleanup;
  connection.cleanup = () => {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
    }
    originalCleanup();
  };

  return connection;
}

/**
 * Create SSE connection for pipeline monitoring
 */
export function createPipelineSSEConnection(
  transcriptId: string,
  onEvent: (event: PipelineEvent) => void,
  onError?: (error: Error) => void,
  onOpen?: () => void
): SSEConnection {
  let autoCloseTimeout: NodeJS.Timeout | null = null;
  
  const connection = createSSEConnection({
    url: `${API_BASE_URL}/api/pipelines/transcript/${transcriptId}/events`,
    onOpen,
    onError,
    onMessage: (msg) => {
      try {
        const eventData = parseSSEMessage<PipelineEvent>(msg, `pipeline ${transcriptId}`);
        if (!eventData) return;
        
        onEvent(eventData);
        
        // Auto-cleanup on pipeline completion
        if (eventData.type === 'pipeline.completed') {
          autoCloseTimeout = setTimeout(() => connection.cleanup(), 2000);
        }
      } catch (error) {
        console.error('Failed to handle pipeline SSE event:', error, msg);
      }
    },
  });

  // Extend cleanup to handle timeout
  const originalCleanup = connection.cleanup;
  connection.cleanup = () => {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
    }
    originalCleanup();
  };

  return connection;
}

/**
 * Create SSE connection for general workflow events
 */
export function createWorkflowSSEConnection(
  onEvent: (event: WorkflowEvent) => void,
  onError?: (error: Error) => void,
  onOpen?: () => void
): SSEConnection {
  return createSSEConnection({
    url: `${API_BASE_URL}/api/content-processing/events`,
    onOpen,
    onError,
    onMessage: (msg) => {
      try {
        const eventData = parseSSEMessage<WorkflowEvent>(msg, 'workflow');
        if (!eventData) return;
        
        onEvent(eventData);
      } catch (error) {
        console.error('Failed to handle workflow SSE event:', error, msg);
      }
    },
  });
}

