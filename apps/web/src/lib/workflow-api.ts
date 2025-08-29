/**
 * Workflow API Client
 * Handles communication with backend workflow orchestration endpoints
 */

import { getApiBaseUrl } from './api-config';
import type { 
  ApiResponse
} from '@content-creation/types';

import { 
  QueueJobStatus, 
  PipelineStatus, 
  PipelineStage, 
  BlockingItemType,
  Platform 
} from '@content-creation/types';

export const API_BASE_URL = getApiBaseUrl();

export interface JobStatus {
  id: string;
  status: QueueJobStatus;
  progress: number;
  error?: { message: string; stack?: string; code?: string };
  attemptsMade: number;
  maxAttempts: number;
  data?: Record<string, unknown>;
  result?: Record<string, unknown>;
  timestamps: {
    created: Date;
    processed?: Date;
    completed?: Date;
    failed?: Date;
  };
}

export interface PipelineProgress {
  transcriptId: string;
  currentStage: PipelineStage;
  status: PipelineStatus;
  stagesCompleted: number;
  totalStages: number;
  progress: number;
  estimatedTimeRemaining?: number;
  currentJobId?: string;
  blockingItems?: Array<{
    type: BlockingItemType;
    itemId: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  history: Array<{
    stage: string;
    status: string;
    timestamp: Date;
    duration?: number;
    error?: string;
  }>;
}

export interface WorkflowStats {
  publisher: {
    queue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    processor?: {
      isRunning: boolean;
      isPaused: boolean;
    };
  };
  content: {
    cleanTranscript: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    extractInsights: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    generatePosts: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  };
}

/**
 * Enhanced fetch wrapper for workflow operations
 */
async function workflowRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Workflow API client for content processing operations
 */
export const workflowApi = {
  /**
   * Transcript processing operations
   */
  transcripts: {
    clean: (transcriptId: string) =>
      workflowRequest<{ jobId: string }>(`/api/content-processing/transcripts/${transcriptId}/clean`, {
        method: 'POST',
      }),

    generateInsights: (transcriptId: string) =>
      workflowRequest<{ jobId: string }>(`/api/content-processing/transcripts/${transcriptId}/insights`, {
        method: 'POST',
      }),
  },

  /**
   * Insight processing operations
   */
  insights: {
    generatePosts: (insightId: string, platforms: Platform[] = [Platform.LINKEDIN, Platform.X]) =>
      workflowRequest<{ jobId: string }>(`/api/content-processing/insights/${insightId}/generate-posts`, {
        method: 'POST',
        body: JSON.stringify({ platforms }),
      }),
  },

  /**
   * Job monitoring operations
   */
  jobs: {
    getStatus: (queueName: string, jobId: string) =>
      workflowRequest<JobStatus>(`/api/content-processing/jobs/${queueName}/${jobId}`),

    getBulkStatus: (jobs: Array<{ queueName: string; jobId: string }>) =>
      workflowRequest<Record<string, JobStatus>>(`/api/content-processing/jobs/bulk`, {
        method: 'POST',
        body: JSON.stringify({ jobs }),
      }),

    cancel: (queueName: string, jobId: string) =>
      workflowRequest<{ cancelled: boolean }>(`/api/content-processing/jobs/${queueName}/${jobId}/cancel`, {
        method: 'POST',
      }),

    retry: (queueName: string, jobId: string) =>
      workflowRequest<{ newJobId: string }>(`/api/content-processing/jobs/${queueName}/${jobId}/retry`, {
        method: 'POST',
      }),
  },

  /**
   * Pipeline orchestration operations
   */
  pipelines: {
    start: (transcriptId: string, stages?: string[]) =>
      workflowRequest<{ pipelineId: string }>(`/api/pipelines`, {
        method: 'POST',
        body: JSON.stringify({ transcriptId, stages }),
      }),

    getProgress: (transcriptId: string) =>
      workflowRequest<PipelineProgress>(`/api/pipelines/transcript/${transcriptId}/progress`),

    pause: (transcriptId: string) =>
      workflowRequest<{ paused: boolean }>(`/api/pipelines/transcript/${transcriptId}/pause`, {
        method: 'POST',
      }),

    resume: (transcriptId: string) =>
      workflowRequest<{ resumed: boolean }>(`/api/pipelines/transcript/${transcriptId}/resume`, {
        method: 'POST',
      }),

    retry: (transcriptId: string, fromStage?: string) =>
      workflowRequest<{ pipelineId: string }>(`/api/pipelines/transcript/${transcriptId}/retry`, {
        method: 'POST',
        body: JSON.stringify({ fromStage }),
      }),

    cancel: (transcriptId: string) =>
      workflowRequest<{ cancelled: boolean }>(`/api/pipelines/transcript/${transcriptId}/cancel`, {
        method: 'POST',
      }),

    getBlockingItems: (transcriptId: string) =>
      workflowRequest<Array<{
        type: BlockingItemType;
        itemId: string;
        message: string;
        priority: 'low' | 'medium' | 'high';
      }>>(`/api/pipelines/transcript/${transcriptId}/blocking-items`),
  },

  /**
   * System monitoring operations
   */
  system: {
    getStats: () =>
      workflowRequest<WorkflowStats>(`/api/content-processing/stats`),

    getHealth: () =>
      workflowRequest<{
        redis: boolean;
        queues: { publisher: boolean };
        processors: { publisher: boolean };
      }>(`/api/content-processing/health`),

    pauseAll: () =>
      workflowRequest<{ paused: boolean }>(`/api/content-processing/pause`, {
        method: 'POST',
      }),

    resumeAll: () =>
      workflowRequest<{ resumed: boolean }>(`/api/content-processing/resume`, {
        method: 'POST',
      }),

    clearCompleted: () =>
      workflowRequest<{ cleared: boolean }>(`/api/content-processing/clear/completed`, {
        method: 'POST',
      }),

    clearFailed: () =>
      workflowRequest<{ cleared: boolean }>(`/api/content-processing/clear/failed`, {
        method: 'POST',
      }),
  },
};