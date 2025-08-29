"use client";

import { useCallback } from 'react';
import { CheckCircle, XCircle, Loader2, Clock, AlertTriangle, Pause } from 'lucide-react';
import { useJobProgress } from '@/hooks/useWorkflowSSE';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueueJobStatus } from '@content-creation/types';
import { workflowApi } from '@/lib/workflow-api';
import { useToast } from '@/lib/toast';

interface JobProgressIndicatorProps {
  jobId: string | null;
  queueName?: string;
  title?: string;
  onComplete?: (result: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  showControls?: boolean;
  compact?: boolean;
  className?: string;
}

export function JobProgressIndicator({
  jobId,
  queueName = 'content-processing',
  title,
  onComplete,
  onError,
  showControls = false,
  compact = false,
  className = ''
}: JobProgressIndicatorProps) {
  const toast = useToast();
  
  const {
    progress,
    status,
    error,
    result,
    isConnected,
    disconnect
  } = useJobProgress(jobId, Boolean(jobId));

  // Handle completion
  const handleComplete = useCallback((result: Record<string, unknown>) => {
    onComplete?.(result);
    setTimeout(() => disconnect(), 1000);
  }, [onComplete, disconnect]);

  // Handle error
  const handleError = useCallback((error: string) => {
    onError?.(error);
    setTimeout(() => disconnect(), 5000);
  }, [onError, disconnect]);

  // Job control actions
  const cancelJob = useCallback(async () => {
    if (!jobId || !queueName) return;
    
    try {
      const response = await workflowApi.jobs.cancel(queueName, jobId);
      if (response.success) {
        toast.success('Job cancelled successfully');
        disconnect();
      } else {
        toast.error('Failed to cancel job: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to cancel job');
    }
  }, [jobId, queueName, toast, disconnect]);

  const retryJob = useCallback(async () => {
    if (!jobId || !queueName) return;
    
    try {
      const response = await workflowApi.jobs.retry(queueName, jobId);
      if (response.success) {
        toast.success('Job retry initiated');
      } else {
        toast.error('Failed to retry job: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to retry job');
    }
  }, [jobId, queueName, toast]);

  // Don't render if no job ID
  if (!jobId) return null;

  // Handle completion and error side effects
  if (status === QueueJobStatus.COMPLETED && result && onComplete) {
    handleComplete(result);
  }
  
  if (status === QueueJobStatus.FAILED && error && onError) {
    handleError(error);
  }

  const getStatusIcon = () => {
    switch (status) {
      case QueueJobStatus.WAITING:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case QueueJobStatus.ACTIVE:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case QueueJobStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case QueueJobStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case QueueJobStatus.PAUSED:
        return <Pause className="h-4 w-4 text-gray-500" />;
      case QueueJobStatus.STALLED:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const variant = status === QueueJobStatus.COMPLETED 
      ? 'default' 
      : status === QueueJobStatus.FAILED 
      ? 'destructive' 
      : 'secondary';

    return (
      <Badge variant={variant} className="text-xs">
        {status?.replace('_', ' ') || 'pending'}
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (error) return error;
    if (status === QueueJobStatus.COMPLETED) return 'Job completed successfully';
    if (status === QueueJobStatus.ACTIVE) return 'Processing...';
    if (status === QueueJobStatus.WAITING) return 'Waiting to start';
    if (status === QueueJobStatus.FAILED) return 'Job failed';
    if (status === QueueJobStatus.PAUSED) return 'Job paused';
    if (status === QueueJobStatus.STALLED) return 'Job stalled';
    return 'Initializing...';
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-xs text-gray-500">{progress}%</span>
        {getStatusBadge()}
        {!isConnected && (
          <AlertTriangle className="h-3 w-3 text-orange-400" />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-4 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">
            {title || 'Processing Job'}
          </span>
          {getStatusBadge()}
        </div>
        
        {showControls && status && (
          <div className="flex gap-1">
            {status === QueueJobStatus.ACTIVE && (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelJob}
                className="text-xs"
              >
                Cancel
              </Button>
            )}
            {status === QueueJobStatus.FAILED && (
              <Button
                variant="outline"
                size="sm"
                onClick={retryJob}
                className="text-xs"
              >
                Retry
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{getStatusMessage()}</span>
          <span className="text-gray-500">{progress}%</span>
        </div>
        
        <Progress 
          value={progress} 
          className="h-2"
        />
      </div>

      {!isConnected && (
        <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
          <AlertTriangle className="h-3 w-3" />
          <span>Real-time connection lost. Status may not be current.</span>
        </div>
      )}

      {error && status === QueueJobStatus.FAILED && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}