import { Injectable, NgZone, OnDestroy, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * SSE (Server-Sent Events) Service
 * Handles real-time updates from backend for project-scoped events
 * Aligned with documentation: /api/projects/{id}/events
 */

// Event Types aligned with documentation
export interface ProjectEvent {
  type: 'stage_started' | 'stage_completed' | 'stage_failed' | 
        'job_started' | 'job_progress' | 'job_completed' | 'job_failed' |
        'insight_approved' | 'post_approved' | 'post_scheduled' | 'post_published';
  projectId: string;
  timestamp: string;
  stage?: string;
  data: {
    progress?: number;
    result?: Record<string, unknown>;
    error?: { message: string; stack?: string };
    duration?: number;
    estimatedTimeRemaining?: number;
    blockingItems?: any[];
    actor?: string;
    metadata?: Record<string, any>;
  };
}

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
  private activeProjects = signal<Map<string, ProjectEvent>>(new Map());
  private connectionStatus = signal<Map<string, 'connecting' | 'connected' | 'error' | 'closed'>>(new Map());
  
  // Computed values
  hasActiveProjects = computed(() => this.activeProjects().size > 0);
  
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
   * Create SSE connection for project-scoped events
   * Endpoint: /api/projects/{id}/events
   */
  createProjectEventStream(
    projectId: string,
    onEvent: (event: ProjectEvent) => void,
    onError?: (error: Event) => void,
    onOpen?: () => void
  ): SSEConnection {
    // Use the documented endpoint format
    const url = `${this.apiUrl}/projects/${projectId}/events`;
    const eventSource = new EventSource(url);
    let autoCloseTimeout: any = null;
    
    // Update connection status
    this.updateConnectionStatus(projectId, 'connecting');
    
    eventSource.onopen = () => {
      this.ngZone.run(() => {
        this.updateConnectionStatus(projectId, 'connected');
        onOpen?.();
      });
    };
    
    eventSource.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const eventData = this.parseSSEMessage<ProjectEvent>(event, `project ${projectId}`);
          if (!eventData) return;
          
          // Ensure projectId is set
          if (!eventData.projectId) {
            eventData.projectId = projectId;
          }
          
          // Update active projects
          const projects = new Map(this.activeProjects());
          projects.set(projectId, eventData);
          this.activeProjects.set(projects);
          
          onEvent(eventData);
          
          // Auto-cleanup on certain completion events
          if (eventData.type === 'stage_completed' && eventData.stage === 'PUBLISHED') {
            autoCloseTimeout = setTimeout(() => {
              this.closeConnection(projectId);
            }, 2000);
          }
        } catch (error) {
          console.error('Failed to handle project SSE event:', error, event);
        }
      });
    };
    
    // Handle specific event types
    eventSource.addEventListener('stage_started', (event: any) => {
      this.handleTypedEvent(event, projectId, 'stage_started', onEvent);
    });
    
    eventSource.addEventListener('stage_completed', (event: any) => {
      this.handleTypedEvent(event, projectId, 'stage_completed', onEvent);
    });
    
    eventSource.addEventListener('stage_failed', (event: any) => {
      this.handleTypedEvent(event, projectId, 'stage_failed', onEvent);
    });
    
    eventSource.addEventListener('job_progress', (event: any) => {
      this.handleTypedEvent(event, projectId, 'job_progress', onEvent);
    });
    
    eventSource.addEventListener('post_published', (event: any) => {
      this.handleTypedEvent(event, projectId, 'post_published', onEvent);
    });
    
    eventSource.onerror = (error) => {
      this.ngZone.run(() => {
        this.updateConnectionStatus(projectId, 'error');
        onError?.(error);
        
        // Auto-reconnect after error
        setTimeout(() => {
          if (this.connections.has(projectId)) {
            this.updateConnectionStatus(projectId, 'connecting');
          }
        }, 5000);
      });
    };
    
    const cleanup = () => {
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
      }
      eventSource.close();
      this.connections.delete(projectId);
      this.updateConnectionStatus(projectId, 'closed');
      
      // Remove from active projects
      const projects = new Map(this.activeProjects());
      projects.delete(projectId);
      this.activeProjects.set(projects);
    };
    
    const connection = { eventSource, cleanup };
    this.connections.set(projectId, connection);
    
    return connection;
  }
  
  /**
   * Handle typed SSE events
   */
  private handleTypedEvent(
    event: MessageEvent,
    projectId: string,
    eventType: ProjectEvent['type'],
    onEvent: (event: ProjectEvent) => void
  ): void {
    this.ngZone.run(() => {
      try {
        const data = this.parseSSEMessage<any>(event, `${eventType} for project ${projectId}`);
        if (!data) return;
        
        const projectEvent: ProjectEvent = {
          type: eventType,
          projectId,
          timestamp: new Date().toISOString(),
          ...data
        };
        
        // Update active projects
        const projects = new Map(this.activeProjects());
        projects.set(projectId, projectEvent);
        this.activeProjects.set(projects);
        
        onEvent(projectEvent);
      } catch (error) {
        console.error(`Failed to handle ${eventType} event:`, error, event);
      }
    });
  }
  
  /**
   * Close a specific connection
   */
  closeConnection(projectId: string): void {
    const connection = this.connections.get(projectId);
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
    this.activeProjects.set(new Map());
    this.connectionStatus.set(new Map());
  }
  
  /**
   * Get active project events
   */
  getActiveProjectEvent(projectId: string): ProjectEvent | undefined {
    return this.activeProjects().get(projectId);
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(projectId: string): 'connecting' | 'connected' | 'error' | 'closed' | undefined {
    return this.connectionStatus().get(projectId);
  }
  
  /**
   * Check if connected
   */
  isConnected(projectId: string): boolean {
    return this.getConnectionStatus(projectId) === 'connected';
  }
  
  /**
   * Update connection status
   */
  private updateConnectionStatus(projectId: string, status: 'connecting' | 'connected' | 'error' | 'closed'): void {
    const statuses = new Map(this.connectionStatus());
    statuses.set(projectId, status);
    this.connectionStatus.set(statuses);
  }
  
  /**
   * Get all active project IDs
   */
  getActiveProjectIds(): string[] {
    return Array.from(this.activeProjects().keys());
  }
  
  /**
   * Monitor multiple projects
   */
  monitorProjects(
    projectIds: string[],
    onEvent: (projectId: string, event: ProjectEvent) => void,
    onError?: (projectId: string, error: Event) => void
  ): Map<string, SSEConnection> {
    const connections = new Map<string, SSEConnection>();
    
    projectIds.forEach(projectId => {
      const connection = this.createProjectEventStream(
        projectId,
        (event) => onEvent(projectId, event),
        (error) => onError?.(projectId, error)
      );
      connections.set(projectId, connection);
    });
    
    return connections;
  }
}