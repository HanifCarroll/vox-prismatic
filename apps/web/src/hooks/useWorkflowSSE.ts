/**
 * React hooks for workflow SSE connections
 * Simplified implementation using @microsoft/fetch-event-source
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  createJobSSEConnection, 
  createPipelineSSEConnection, 
  createWorkflowSSEConnection,
  type JobEvent, 
  type PipelineEvent, 
  type WorkflowEvent,
  type SSEConnection 
} from '@/lib/sse-client';
import { QueueJobStatus, PipelineStatus, PipelineStage, BlockingItem } from '@content-creation/types';

/**
 * React hook for job monitoring via SSE
 */
export function useJobSSE(
  jobId: string | null,
  onEvent: (event: JobEvent) => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !enabled) {
      setIsConnected(false);
      return;
    }

    const connection = createJobSSEConnection(
      jobId,
      onEvent,
      (err) => {
        setError(err.message);
        setIsConnected(false);
      },
      () => {
        setError(null);
        setIsConnected(true);
      }
    );

    return () => {
      connection.cleanup();
      setIsConnected(false);
      setError(null);
    };
  }, [jobId, enabled]); // onEvent is stable via useCallback in parent

  const disconnect = useCallback(() => {
    // Trigger re-render to cleanup via effect
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    error,
    disconnect,
  };
}

/**
 * React hook for pipeline monitoring via SSE
 */
export function usePipelineSSE(
  transcriptId: string | null,
  onEvent: (event: PipelineEvent) => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transcriptId || !enabled) {
      setIsConnected(false);
      return;
    }

    const connection = createPipelineSSEConnection(
      transcriptId,
      onEvent,
      (err) => {
        setError(err.message);
        setIsConnected(false);
      },
      () => {
        setError(null);
        setIsConnected(true);
      }
    );

    return () => {
      connection.cleanup();
      setIsConnected(false);
      setError(null);
    };
  }, [transcriptId, enabled]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    error,
    disconnect,
  };
}

/**
 * React hook for general workflow monitoring via SSE
 */
export function useWorkflowSSE(
  onEvent: (event: WorkflowEvent) => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const connection = createWorkflowSSEConnection(
      onEvent,
      (err) => {
        setError(err.message);
        setIsConnected(false);
      },
      () => {
        setError(null);
        setIsConnected(true);
      }
    );

    return () => {
      connection.cleanup();
      setIsConnected(false);
      setError(null);
    };
  }, [enabled]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    error,
    disconnect,
  };
}

/**
 * Hook to manage job progress state with SSE updates
 */
export function useJobProgress(jobId: string | null, enabled: boolean = true) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<QueueJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleEvent = useCallback((event: JobEvent) => {
    switch (event.type) {
      case 'job.started':
        setStatus(QueueJobStatus.ACTIVE);
        setProgress(0);
        setError(null);
        break;
      case 'job.progress':
        setProgress(event.data.progress || 0);
        break;
      case 'job.completed':
        setStatus(QueueJobStatus.COMPLETED);
        setProgress(100);
        setResult(event.data.result);
        break;
      case 'job.failed':
        setStatus(QueueJobStatus.FAILED);
        setError(event.data.error?.message || 'Job failed');
        break;
      case 'job.cancelled':
        setStatus(QueueJobStatus.FAILED);
        setError('Job was cancelled');
        break;
    }
  }, []);

  const { isConnected, disconnect } = useJobSSE(jobId, handleEvent, enabled);

  return {
    progress,
    status,
    error,
    result,
    isConnected,
    disconnect,
  };
}

/**
 * Hook to manage pipeline progress state with SSE updates
 */
export function usePipelineProgress(transcriptId: string | null, enabled: boolean = true) {
  const [currentStage, setCurrentStage] = useState<PipelineStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [blockingItems, setBlockingItems] = useState<BlockingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  const handleEvent = useCallback((event: PipelineEvent) => {
    switch (event.type) {
      case 'pipeline.stage_started':
        setCurrentStage(event.stage);
        setStatus(PipelineStatus.PROCESSING);
        setProgress(event.data.progress || 0);
        setEstimatedTimeRemaining(event.data.estimatedTimeRemaining || null);
        break;
      case 'pipeline.stage_completed':
        setProgress(event.data.progress || 0);
        setEstimatedTimeRemaining(event.data.estimatedTimeRemaining || null);
        break;
      case 'pipeline.stage_failed':
        setStatus(PipelineStatus.FAILED);
        setError(event.data.error || 'Pipeline stage failed');
        break;
      case 'pipeline.blocked':
        setStatus(PipelineStatus.PAUSED);
        setBlockingItems(event.data.blockingItems || []);
        break;
      case 'pipeline.completed':
        setStatus(PipelineStatus.COMPLETED);
        setProgress(100);
        setCurrentStage(null);
        setEstimatedTimeRemaining(null);
        break;
    }
  }, []);

  const { isConnected, disconnect } = usePipelineSSE(transcriptId, handleEvent, enabled);

  return {
    currentStage,
    progress,
    status,
    blockingItems,
    error,
    estimatedTimeRemaining,
    isConnected,
    disconnect,
  };
}