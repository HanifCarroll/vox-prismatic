
import { useState, useEffect, useCallback } from 'react';
import { Activity, Server, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import { useWorkflowSSE } from '@/hooks/useWorkflowSSE';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { workflowApi, type WorkflowStats } from '@/lib/workflow-api';
import type { WorkflowEvent } from '@/lib/sse-client';
import { useToast } from '@/lib/toast';

interface WorkflowMonitorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function WorkflowMonitor({ 
  className = '',
  autoRefresh = true,
  refreshInterval = 30000 
}: WorkflowMonitorProps) {
  const toast = useToast();
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<{
    redis: boolean;
    queues: { publisher: boolean };
    processors: { publisher: boolean };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<WorkflowEvent[]>([]);

  // Handle workflow events
  const handleWorkflowEvent = useCallback((event: WorkflowEvent) => {
    setRecentEvents(prev => {
      const newEvents = [event, ...prev.slice(0, 9)]; // Keep last 10 events
      return newEvents;
    });
  }, []);

  // SSE connection for real-time events
  const { isConnected } = useWorkflowSSE(handleWorkflowEvent, autoRefresh);

  // Fetch stats and health
  const fetchData = useCallback(async () => {
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        workflowApi.system.getStats(),
        workflowApi.system.getHealth()
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data || null);
      }

      if (healthResponse.success) {
        setSystemHealth(healthResponse.data || null);
      }
    } catch (error) {
      console.error('Failed to fetch workflow data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // System control actions
  const pauseAllProcessing = useCallback(async () => {
    try {
      const response = await workflowApi.system.pauseAll();
      if (response.success) {
        toast.success('All processing paused');
        fetchData();
      } else {
        toast.error('Failed to pause processing: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to pause processing');
    }
  }, [toast, fetchData]);

  const resumeAllProcessing = useCallback(async () => {
    try {
      const response = await workflowApi.system.resumeAll();
      if (response.success) {
        toast.success('All processing resumed');
        fetchData();
      } else {
        toast.error('Failed to resume processing: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to resume processing');
    }
  }, [toast, fetchData]);

  const clearCompletedJobs = useCallback(async () => {
    try {
      const response = await workflowApi.system.clearCompleted();
      if (response.success) {
        toast.success('Completed jobs cleared');
        fetchData();
      } else {
        toast.error('Failed to clear jobs: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to clear completed jobs');
    }
  }, [toast, fetchData]);

  const clearFailedJobs = useCallback(async () => {
    try {
      const response = await workflowApi.system.clearFailed();
      if (response.success) {
        toast.success('Failed jobs cleared');
        fetchData();
      } else {
        toast.error('Failed to clear jobs: ' + response.error);
      }
    } catch (error) {
      toast.error('Failed to clear failed jobs');
    }
  }, [toast, fetchData]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  const getHealthStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'bg-green-500' : 'bg-red-500';
  };

  const formatEventType = (type: string) => {
    return type.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventIcon = (event: WorkflowEvent) => {
    if (event.type.includes('completed')) return '✅';
    if (event.type.includes('failed')) return '❌';
    if (event.type.includes('started')) return '🚀';
    if (event.type.includes('progress')) return '⏳';
    return '📋';
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 animate-pulse" />
          <span>Loading workflow monitor...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* System Health */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <h3 className="font-semibold">System Health</h3>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={systemHealth?.processors?.publisher ? pauseAllProcessing : resumeAllProcessing}
            >
              {systemHealth?.processors?.publisher ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Pause All
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Resume All
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {systemHealth && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getHealthStatusColor(systemHealth.redis)}`} />
              <span>Redis: {systemHealth.redis ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getHealthStatusColor(systemHealth.queues.publisher)}`} />
              <span>Queues: {systemHealth.queues.publisher ? 'Healthy' : 'Unhealthy'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getHealthStatusColor(systemHealth.processors.publisher)}`} />
              <span>Processors: {systemHealth.processors.publisher ? 'Running' : 'Stopped'}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Queue Statistics */}
      {stats && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Queue Statistics</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompletedJobs}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear Completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFailedJobs}
                className="text-xs text-red-600"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear Failed
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Publisher Queue */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Publisher Queue</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Waiting:</span>
                  <Badge variant="outline">{stats.publisher.queue.waiting}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active:</span>
                  <Badge variant="outline">{stats.publisher.queue.active}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <Badge variant="default">{stats.publisher.queue.completed}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <Badge variant="destructive">{stats.publisher.queue.failed}</Badge>
                </div>
              </div>
            </div>

            {/* Content Processing Queues */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Content Processing</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span>Clean Transcript:</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">{stats.content.cleanTranscript.waiting}W</Badge>
                    <Badge variant="outline" className="text-xs">{stats.content.cleanTranscript.active}A</Badge>
                    <Badge variant="default" className="text-xs">{stats.content.cleanTranscript.completed}C</Badge>
                    <Badge variant="destructive" className="text-xs">{stats.content.cleanTranscript.failed}F</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Extract Insights:</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">{stats.content.extractInsights.waiting}W</Badge>
                    <Badge variant="outline" className="text-xs">{stats.content.extractInsights.active}A</Badge>
                    <Badge variant="default" className="text-xs">{stats.content.extractInsights.completed}C</Badge>
                    <Badge variant="destructive" className="text-xs">{stats.content.extractInsights.failed}F</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Generate Posts:</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">{stats.content.generatePosts.waiting}W</Badge>
                    <Badge variant="outline" className="text-xs">{stats.content.generatePosts.active}A</Badge>
                    <Badge variant="default" className="text-xs">{stats.content.generatePosts.completed}C</Badge>
                    <Badge variant="destructive" className="text-xs">{stats.content.generatePosts.failed}F</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Events */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4" />
          <h3 className="font-semibold">Recent Events</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {isConnected ? 'No recent events' : 'Connect to see real-time events'}
            </p>
          ) : (
            recentEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm"
              >
                <span className="text-lg">{getEventIcon(event)}</span>
                <div className="flex-1">
                  <span className="font-medium">{formatEventType(event.type)}</span>
                  {'jobId' in event && (
                    <span className="text-gray-500 ml-2">Job: {event.jobId.slice(-8)}</span>
                  )}
                  {'transcriptId' in event && (
                    <span className="text-gray-500 ml-2">Transcript: {event.transcriptId.slice(-8)}</span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}