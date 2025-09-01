import { Injectable, NgZone, OnDestroy, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * SSE (Server-Sent Events) Service
 * Handles real-time updates from backend workflow operations
 */

// Event Types
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
  stage: string;
  timestamp: string;
  data: {
    progress?: number;
    estimatedTimeRemaining?: number;
    blockingItems?: any[];
    error?: string;
  };
}

export type WorkflowEvent = JobEvent | PipelineEvent;

export interface SSEConnection {
  eventSource: EventSource;
  cleanup: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class SSEService implements OnDestroy {
  private connections = new Map<string, SSEConnection>();
  private apiUrl = environment.apiUrl;
  
  // State signals
  private activeJobs = signal<Map<string, JobEvent>>(new Map());
  private activePipelines = signal<Map<string, PipelineEvent>>(new Map());
  private connectionStatus = signal<Map<string, 'connecting' | 'connected' | 'error' | 'closed'>>(new Map());
  
  // Computed values
  hasActiveJobs = computed(() => this.activeJobs().size > 0);
  hasActivePipelines = computed(() => this.activePipelines().size > 0);
  
  constructor(private ngZone: NgZone) {}
  
  ngOnDestroy(): void {
    // Cleanup all connections
    this.connections.forEach(connection => connection.cleanup());
    this.connections.clear();
  }
  
  /**
   * Parse SSE message
   */
  private parseSSEMessage<T>(event: MessageEvent, context: string = ''): T | null {
    // Skip empty messages
    if (!event.data || event.data.trim() === '') {
      return null;
    }
    
    // Skip non-data events like 'connected'
    if (event.data === 'connected') {
      console.log(`SSE connection confirmed${context ? ` for ${context}` : ''}`);
      return null;
    }
    
    try {
      const parsed = JSON.parse(event.data);
      
      // Add event type if not already present
      if (event.type && event.type !== 'message' && !parsed.type) {
        parsed.type = event.type;
      }
      
      return parsed as T;
    } catch (parseError) {
      console.warn(`Received non-JSON SSE data${context ? ` for ${context}` : ''}:`, event.data);
      return null;
    }
  }
  
  /**
   * Create SSE connection for job monitoring
   */
  createJobSSEConnection(
    jobId: string,
    onEvent: (event: JobEvent) => void,
    onError?: (error: Event) => void,
    onOpen?: () => void
  ): SSEConnection {
    const url = `${this.apiUrl}/api/content-processing/events/${jobId}`;
    const eventSource = new EventSource(url);
    let autoCloseTimeout: any = null;
    
    // Update connection status
    this.updateConnectionStatus(jobId, 'connecting');
    
    eventSource.onopen = () => {
      this.ngZone.run(() => {
        this.updateConnectionStatus(jobId, 'connected');
        onOpen?.();
      });
    };
    
    eventSource.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const eventData = this.parseSSEMessage<JobEvent>(event, `job ${jobId}`);
          if (!eventData) return;
          
          // Update active jobs
          const jobs = new Map(this.activeJobs());
          jobs.set(jobId, eventData);
          this.activeJobs.set(jobs);
          
          onEvent(eventData);
          
          // Auto-cleanup on job completion/failure
          if (eventData.type === 'job.completed' || eventData.type === 'job.failed') {
            autoCloseTimeout = setTimeout(() => {
              this.closeConnection(jobId);
            }, 1000);
          }
        } catch (error) {
          console.error('Failed to handle job SSE event:', error, event);
        }
      });
    };
    
    eventSource.onerror = (error) => {
      this.ngZone.run(() => {
        this.updateConnectionStatus(jobId, 'error');
        onError?.(error);
        
        // Auto-reconnect after error
        setTimeout(() => {
          if (this.connections.has(jobId)) {
            this.updateConnectionStatus(jobId, 'connecting');
          }
        }, 5000);
      });
    };
    
    const cleanup = () => {
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
      }
      eventSource.close();
      this.connections.delete(jobId);
      this.updateConnectionStatus(jobId, 'closed');
      
      // Remove from active jobs
      const jobs = new Map(this.activeJobs());
      jobs.delete(jobId);
      this.activeJobs.set(jobs);
    };
    
    const connection = { eventSource, cleanup };
    this.connections.set(jobId, connection);
    
    return connection;
  }
  
  /**
   * Create SSE connection for pipeline monitoring
   */
  createPipelineSSEConnection(
    transcriptId: string,
    onEvent: (event: PipelineEvent) => void,
    onError?: (error: Event) => void,
    onOpen?: () => void
  ): SSEConnection {
    const url = `${this.apiUrl}/api/pipelines/transcript/${transcriptId}/events`;
    const eventSource = new EventSource(url);
    let autoCloseTimeout: any = null;
    
    // Update connection status
    this.updateConnectionStatus(transcriptId, 'connecting');
    
    eventSource.onopen = () => {
      this.ngZone.run(() => {
        this.updateConnectionStatus(transcriptId, 'connected');
        onOpen?.();
      });
    };
    
    eventSource.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const eventData = this.parseSSEMessage<PipelineEvent>(event, `pipeline ${transcriptId}`);
          if (!eventData) return;
          
          // Update active pipelines
          const pipelines = new Map(this.activePipelines());
          pipelines.set(transcriptId, eventData);
          this.activePipelines.set(pipelines);
          
          onEvent(eventData);
          
          // Auto-cleanup on pipeline completion
          if (eventData.type === 'pipeline.completed') {
            autoCloseTimeout = setTimeout(() => {
              this.closeConnection(transcriptId);
            }, 2000);
          }
        } catch (error) {
          console.error('Failed to handle pipeline SSE event:', error, event);
        }
      });
    };
    
    eventSource.onerror = (error) => {
      this.ngZone.run(() => {
        this.updateConnectionStatus(transcriptId, 'error');
        onError?.(error);
        
        // Auto-reconnect after error
        setTimeout(() => {
          if (this.connections.has(transcriptId)) {
            this.updateConnectionStatus(transcriptId, 'connecting');
          }
        }, 5000);
      });
    };
    
    const cleanup = () => {
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
      }
      eventSource.close();
      this.connections.delete(transcriptId);
      this.updateConnectionStatus(transcriptId, 'closed');
      
      // Remove from active pipelines
      const pipelines = new Map(this.activePipelines());
      pipelines.delete(transcriptId);
      this.activePipelines.set(pipelines);
    };
    
    const connection = { eventSource, cleanup };
    this.connections.set(transcriptId, connection);
    
    return connection;
  }
  
  /**
   * Create SSE connection for general workflow events
   */
  createWorkflowSSEConnection(
    onEvent: (event: WorkflowEvent) => void,
    onError?: (error: Event) => void,
    onOpen?: () => void
  ): SSEConnection {
    const url = `${this.apiUrl}/api/content-processing/events`;
    const eventSource = new EventSource(url);
    const connectionId = 'workflow-main';
    
    // Update connection status
    this.updateConnectionStatus(connectionId, 'connecting');
    
    eventSource.onopen = () => {
      this.ngZone.run(() => {
        this.updateConnectionStatus(connectionId, 'connected');
        onOpen?.();
      });
    };
    
    eventSource.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const eventData = this.parseSSEMessage<WorkflowEvent>(event, 'workflow');
          if (!eventData) return;
          
          // Update appropriate state based on event type
          if ('jobId' in eventData) {
            const jobs = new Map(this.activeJobs());
            jobs.set(eventData.jobId, eventData);
            this.activeJobs.set(jobs);
          } else if ('transcriptId' in eventData) {
            const pipelines = new Map(this.activePipelines());
            pipelines.set(eventData.transcriptId, eventData);
            this.activePipelines.set(pipelines);
          }
          
          onEvent(eventData);
        } catch (error) {
          console.error('Failed to handle workflow SSE event:', error, event);
        }
      });
    };
    
    eventSource.onerror = (error) => {
      this.ngZone.run(() => {
        this.updateConnectionStatus(connectionId, 'error');
        onError?.(error);
        
        // Auto-reconnect after error
        setTimeout(() => {
          if (this.connections.has(connectionId)) {
            this.updateConnectionStatus(connectionId, 'connecting');
          }
        }, 5000);
      });
    };
    
    const cleanup = () => {
      eventSource.close();
      this.connections.delete(connectionId);
      this.updateConnectionStatus(connectionId, 'closed');
    };
    
    const connection = { eventSource, cleanup };
    this.connections.set(connectionId, connection);
    
    return connection;
  }
  
  /**
   * Close a specific connection
   */
  closeConnection(id: string): void {
    const connection = this.connections.get(id);
    if (connection) {
      connection.cleanup();
    }
  }
  
  /**
   * Close all connections
   */
  closeAllConnections(): void {
    this.connections.forEach(connection => connection.cleanup());
    this.connections.clear();
    this.activeJobs.set(new Map());
    this.activePipelines.set(new Map());
    this.connectionStatus.set(new Map());
  }
  
  /**
   * Get active job by ID
   */
  getActiveJob(jobId: string): JobEvent | undefined {
    return this.activeJobs().get(jobId);
  }
  
  /**
   * Get active pipeline by transcript ID
   */
  getActivePipeline(transcriptId: string): PipelineEvent | undefined {
    return this.activePipelines().get(transcriptId);
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(id: string): 'connecting' | 'connected' | 'error' | 'closed' | undefined {
    return this.connectionStatus().get(id);
  }
  
  /**
   * Update connection status
   */
  private updateConnectionStatus(id: string, status: 'connecting' | 'connected' | 'error' | 'closed'): void {
    const statuses = new Map(this.connectionStatus());
    statuses.set(id, status);
    this.connectionStatus.set(statuses);
  }
}