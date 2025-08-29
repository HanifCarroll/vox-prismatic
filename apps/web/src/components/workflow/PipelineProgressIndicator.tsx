"use client";

import { useCallback } from 'react';
import { CheckCircle, XCircle, Loader2, Clock, AlertTriangle, Pause, Play } from 'lucide-react';
import { usePipelineProgress } from '@/hooks/useWorkflowSSE';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PipelineStatus, PipelineStage } from '@content-creation/types';
import { workflowApi } from '@/lib/workflow-api';
import { useToast } from '@/lib/toast';

interface PipelineProgressIndicatorProps {
  transcriptId: string | null;
  title?: string;
  onComplete?: () => void;
  onBlocked?: (blockingItems: any[]) => void;
  onError?: (error: string) => void;
  showControls?: boolean;
  showStages?: boolean;
  compact?: boolean;
  className?: string;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  [PipelineStage.TRANSCRIPT_CLEANING]: 'Cleaning Transcript',
  [PipelineStage.INSIGHT_EXTRACTION]: 'Extracting Insights',
  [PipelineStage.POST_GENERATION]: 'Generating Posts',
  [PipelineStage.COMPLETED]: 'Completed',
};

const STAGE_ORDER: PipelineStage[] = [
  PipelineStage.TRANSCRIPT_CLEANING,
  PipelineStage.INSIGHT_EXTRACTION,
  PipelineStage.POST_GENERATION,
  PipelineStage.COMPLETED,
];

export function PipelineProgressIndicator({
  transcriptId,
  title = 'Content Pipeline',
  onComplete,
  onBlocked,
  onError,
  showControls = true,
  showStages = true,
  compact = false,
  className = ''
}: PipelineProgressIndicatorProps) {
  const toast = useToast();
  
  const {
    currentStage,
    progress,
    status,
    blockingItems,
    error,
    estimatedTimeRemaining,
    isConnected,
    disconnect
  } = usePipelineProgress(transcriptId, Boolean(transcriptId));

  // Handle completion
  const handleComplete = useCallback(() => {
    onComplete?.();
    setTimeout(() => disconnect(), 2000);
  }, [onComplete, disconnect]);

  // Handle blocking
  const handleBlocked = useCallback((items: any[]) => {
    onBlocked?.(items);
  }, [onBlocked]);

  // Handle error
  const handleError = useCallback((error: string) => {
    onError?.(error);
    setTimeout(() => disconnect(), 5000);
  }, [onError, disconnect]);

  // Pipeline control actions
  const pausePipeline = useCallback(async () => {
    if (!transcriptId) return;
    
    try {
      const response = await workflowApi.pipelines.pause(transcriptId);
      if (response.success) {
        toast.success('Pipeline paused');
      } else {
        toast.error('Failed to pause pipeline: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to pause pipeline');
    }
  }, [transcriptId, toast]);

  const resumePipeline = useCallback(async () => {
    if (!transcriptId) return;
    
    try {
      const response = await workflowApi.pipelines.resume(transcriptId);
      if (response.success) {
        toast.success('Pipeline resumed');
      } else {
        toast.error('Failed to resume pipeline: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to resume pipeline');
    }
  }, [transcriptId, toast]);

  const cancelPipeline = useCallback(async () => {
    if (!transcriptId) return;
    
    try {
      const response = await workflowApi.pipelines.cancel(transcriptId);
      if (response.success) {
        toast.success('Pipeline cancelled');
        disconnect();
      } else {
        toast.error('Failed to cancel pipeline: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to cancel pipeline');
    }
  }, [transcriptId, toast, disconnect]);

  const retryPipeline = useCallback(async () => {
    if (!transcriptId) return;
    
    try {
      const response = await workflowApi.pipelines.retry(transcriptId);
      if (response.success) {
        toast.success('Pipeline retry initiated');
      } else {
        toast.error('Failed to retry pipeline: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to retry pipeline');
    }
  }, [transcriptId, toast]);

  // Don't render if no transcript ID
  if (!transcriptId) return null;

  // Handle side effects
  if (status === PipelineStatus.COMPLETED && onComplete) {
    handleComplete();
  }
  
  if (status === PipelineStatus.PAUSED && blockingItems.length > 0 && onBlocked) {
    handleBlocked(blockingItems);
  }
  
  if (status === PipelineStatus.FAILED && error && onError) {
    handleError(error);
  }

  const getStatusIcon = () => {
    switch (status) {
      case PipelineStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case PipelineStatus.PROCESSING:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case PipelineStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case PipelineStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case PipelineStatus.PAUSED:
        return <Pause className="h-4 w-4 text-gray-500" />;
      case PipelineStatus.CANCELLED:
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const variant = status === PipelineStatus.COMPLETED 
      ? 'default' 
      : status === PipelineStatus.FAILED || status === PipelineStatus.CANCELLED
      ? 'destructive' 
      : status === PipelineStatus.PAUSED
      ? 'secondary'
      : 'outline';

    return (
      <Badge variant={variant} className="text-xs">
        {status?.replace('_', ' ') || 'pending'}
      </Badge>
    );
  };

  const getCurrentStageLabel = () => {
    if (!currentStage) return 'Initializing...';
    return STAGE_LABELS[currentStage] || currentStage;
  };

  const formatEstimatedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-xs text-gray-500">{progress}%</span>
        <span className="text-xs text-gray-600">{getCurrentStageLabel()}</span>
        {getStatusBadge()}
        {!isConnected && (
          <AlertTriangle className="h-3 w-3 text-orange-400" />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 p-4 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{title}</span>
          {getStatusBadge()}
        </div>
        
        {showControls && status && (
          <div className="flex gap-1">
            {status === PipelineStatus.PROCESSING && (
              <Button
                variant="outline"
                size="sm"
                onClick={pausePipeline}
                className="text-xs"
              >
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </Button>
            )}
            {status === PipelineStatus.PAUSED && (
              <Button
                variant="outline"
                size="sm"
                onClick={resumePipeline}
                className="text-xs"
              >
                <Play className="h-3 w-3 mr-1" />
                Resume
              </Button>
            )}
            {(status === PipelineStatus.PROCESSING || status === PipelineStatus.PAUSED) && (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelPipeline}
                className="text-xs text-red-600"
              >
                Cancel
              </Button>
            )}
            {status === PipelineStatus.FAILED && (
              <Button
                variant="outline"
                size="sm"
                onClick={retryPipeline}
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
          <span className="text-gray-600">
            {getCurrentStageLabel()}
            {estimatedTimeRemaining && status === PipelineStatus.PROCESSING && (
              <span className="text-gray-500 ml-2">
                (~{formatEstimatedTime(estimatedTimeRemaining)} remaining)
              </span>
            )}
          </span>
          <span className="text-gray-500">{progress}%</span>
        </div>
        
        <Progress 
          value={progress} 
          className="h-3"
        />
      </div>

      {showStages && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          {STAGE_ORDER.slice(0, -1).map((stage, index) => {
            const isCompleted = currentStage && STAGE_ORDER.indexOf(currentStage) > index;
            const isCurrent = currentStage === stage;
            
            return (
              <div
                key={stage}
                className={`flex items-center gap-1 p-2 rounded text-center ${
                  isCompleted 
                    ? 'bg-green-100 text-green-700' 
                    : isCurrent 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-3 w-3" />
                ) : isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                <span>{STAGE_LABELS[stage]}</span>
              </div>
            );
          })}
        </div>
      )}

      {blockingItems.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-sm text-yellow-800">Manual intervention required</span>
          </div>
          <ul className="space-y-1 text-xs text-yellow-700">
            {blockingItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span>•</span>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isConnected && (
        <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
          <AlertTriangle className="h-3 w-3" />
          <span>Real-time connection lost. Status may not be current.</span>
        </div>
      )}

      {error && status === PipelineStatus.FAILED && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}