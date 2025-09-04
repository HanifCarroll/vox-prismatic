import { Injectable, NgZone, OnDestroy, signal, computed, effect } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Subject, BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * SSE (Server-Sent Events) Service
 * Handles real-time updates from backend via global /api/events endpoint
 * Implements exponential backoff, event queuing, and proper error handling
 */

// Updated Event Types based on backend domain events
export interface SSEEvent {
  type: 'ProjectUpdated' | 'StageChanged' | 'ProcessingStarted' | 'ProcessingCompleted' |
        'InsightGenerated' | 'PostGenerated' | 'ErrorOccurred' | 'InsightApproved' |
        'PostApproved' | 'PostScheduled' | 'PostPublished' | 'ProcessingFailed' | 'PublishingFailed';
  projectId: string;
  timestamp: string;
  stage?: string;
  userId?: string;
  data: {
    progress?: number;
    result?: Record<string, unknown>;
    error?: { message: string; stack?: string };
    duration?: number;
    estimatedTimeRemaining?: number;
    blockingItems?: any[];
    actor?: string;
    metadata?: Record<string, any>;
    previousStage?: string;
    newStage?: string;
    count?: number;
    reason?: string;
    approvedBy?: string;
    rejectedBy?: string;
    insightId?: string;
    postId?: string;
  };
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export interface QueuedEvent {
  event: SSEEvent;
  receivedAt: Date;
}

export interface ReconnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

@Injectable({
  providedIn: 'root'
})
export class SSEService implements OnDestroy {
  private eventSource: EventSource | null = null;
  private apiUrl = environment.apiUrl;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private eventQueue: QueuedEvent[] = [];
  private isDestroyed = false;
  
  // Configuration
  private readonly reconnectionConfig: ReconnectionConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  };
  
  // State signals
  private readonly _connectionStatus = signal<ConnectionStatus>('disconnected');
  private readonly _lastEvent = signal<SSEEvent | null>(null);
  private readonly _eventCount = signal(0);
  private readonly _error = signal<string | null>(null);
  
  // Event streams
  private readonly eventSubject = new Subject<SSEEvent>();
  private readonly connectionStatusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  
  // Public read-only signals
  readonly connectionStatus = this._connectionStatus.asReadonly();
  readonly lastEvent = this._lastEvent.asReadonly();
  readonly eventCount = this._eventCount.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Public observables
  readonly events$ = this.eventSubject.asObservable();
  readonly connectionStatus$ = this.connectionStatusSubject.asObservable();
  
  // Computed values
  readonly isConnected = computed(() => this._connectionStatus() === 'connected');
  readonly isConnecting = computed(() => {
    const status = this._connectionStatus();
    return status === 'connecting' || status === 'reconnecting';
  });
  readonly hasError = computed(() => this._connectionStatus() === 'error');
  readonly hasQueuedEvents = computed(() => this.eventQueue.length > 0);
  
  constructor(private ngZone: NgZone) {
    // Auto-connect on service initialization
    this.connect();
    
    // Sync signals with subjects
    effect(() => {
      this.connectionStatusSubject.next(this._connectionStatus());
    });
  }
  
  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.clearReconnectTimer();
    this.eventSubject.complete();
    this.connectionStatusSubject.complete();
  }
  
  /**
   * Connect to the global SSE endpoint
   */
  connect(): void {
    if (this.isDestroyed || this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }
    
    this.updateConnectionStatus('connecting');
    this._error.set(null);
    
    const url = `${this.apiUrl}/events`;
    console.log('Connecting to SSE endpoint:', url);
    
    this.eventSource = new EventSource(url);
    this.setupEventListeners();
  }
  
  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.clearReconnectTimer();
    this.updateConnectionStatus('disconnected');
  }
  
  /**
   * Manually trigger reconnection
   */
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
  
  /**
   * Get queued events and clear the queue
   */
  getAndClearQueuedEvents(): QueuedEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }
  
  /**
   * Parse SSE message with proper error handling
   */
  private parseSSEMessage(event: MessageEvent): SSEEvent | null {
    // Skip empty messages
    if (!event.data || event.data.trim() === '') {
      return null;
    }
    
    // Skip connection confirmation messages
    if (event.data === 'connected' || event.data === 'heartbeat') {
      console.log('SSE heartbeat received');
      return null;
    }
    
    try {
      const parsed = JSON.parse(event.data);
      
      // Validate required properties
      if (!parsed.type || !parsed.projectId) {
        console.warn('Invalid SSE event format:', parsed);
        return null;
      }
      
      // Add timestamp if not present
      if (!parsed.timestamp) {
        parsed.timestamp = new Date().toISOString();
      }
      
      return parsed as SSEEvent;
    } catch (parseError) {
      console.warn('Failed to parse SSE data:', event.data, parseError);
      return null;
    }
  }
  
  /**
   * Setup event listeners for the SSE connection
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;
    
    this.eventSource.onopen = () => {
      this.ngZone.run(() => {
        console.log('SSE connection established');
        this.updateConnectionStatus('connected');
        this.reconnectAttempts = 0;
        this._error.set(null);
        
        // Process any queued events
        this.processQueuedEvents();
      });
    };
    
    this.eventSource.onmessage = (event) => {
      this.ngZone.run(() => {
        this.handleEvent(event);
      });
    };
    
    this.eventSource.onerror = (error) => {
      this.ngZone.run(() => {
        console.error('SSE connection error:', error);
        this.updateConnectionStatus('error');
        this._error.set('Connection lost');
        
        // Attempt to reconnect with exponential backoff
        this.scheduleReconnect();
      });
    };
    
    // Listen for browser online/offline events
    window.addEventListener('online', () => this.handleNetworkOnline());
    window.addEventListener('offline', () => this.handleNetworkOffline());
  }
  
  /**
   * Handle incoming SSE events
   */
  private handleEvent(event: MessageEvent): void {
    try {
      const sseEvent = this.parseSSEMessage(event);
      if (!sseEvent) return;
      
      this._lastEvent.set(sseEvent);
      this._eventCount.update(count => count + 1);
      
      // If not connected, queue the event
      if (this._connectionStatus() !== 'connected') {
        this.queueEvent(sseEvent);
        return;
      }
      
      // Emit the event
      this.eventSubject.next(sseEvent);
      
      console.log(`SSE Event received:`, sseEvent.type, sseEvent.projectId);
    } catch (error) {
      console.error('Failed to handle SSE event:', error, event);
    }
  }
  
  /**
   * Queue an event when connection is lost
   */
  private queueEvent(event: SSEEvent): void {
    this.eventQueue.push({
      event,
      receivedAt: new Date()
    });
    
    // Limit queue size to prevent memory issues
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }
  }
  
  /**
   * Process queued events when connection is restored
   */
  private processQueuedEvents(): void {
    if (this.eventQueue.length === 0) return;
    
    console.log(`Processing ${this.eventQueue.length} queued SSE events`);
    
    this.eventQueue.forEach(queuedEvent => {
      this.eventSubject.next(queuedEvent.event);
    });
    
    this.eventQueue = [];
  }
  
  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= this.reconnectionConfig.maxRetries) {
      console.error('Max reconnection attempts reached');
      this.updateConnectionStatus('error');
      return;
    }
    
    this.clearReconnectTimer();
    
    const delay = Math.min(
      this.reconnectionConfig.baseDelay * Math.pow(this.reconnectionConfig.backoffMultiplier, this.reconnectAttempts),
      this.reconnectionConfig.maxDelay
    );
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.reconnectionConfig.maxRetries})`);
    
    this.updateConnectionStatus('reconnecting');
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  
  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  /**
   * Handle network coming online
   */
  private handleNetworkOnline(): void {
    if (this._connectionStatus() === 'error' || this._connectionStatus() === 'disconnected') {
      console.log('Network is back online, attempting to reconnect...');
      this.reconnectAttempts = 0;
      this.connect();
    }
  }
  
  /**
   * Handle network going offline
   */
  private handleNetworkOffline(): void {
    console.log('Network is offline, SSE will reconnect when online');
    this.updateConnectionStatus('error');
    this._error.set('Network offline');
  }
  
  /**
   * Update connection status
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    this._connectionStatus.set(status);
  }
  
  /**
   * Filter events by type
   */
  getEventsByType(...eventTypes: SSEEvent['type'][]) {
    return this.events$.pipe(
      takeUntilDestroyed(),
      filter(event => eventTypes.includes(event.type))
    );
  }
  
  /**
   * Get events for a specific project
   */
  getProjectEvents(projectId: string) {
    return this.events$.pipe(
      takeUntilDestroyed(),
      filter(event => event.projectId === projectId)
    );
  }
  
  /**
   * Get connection metrics
   */
  getConnectionMetrics() {
    return {
      status: this._connectionStatus(),
      eventCount: this._eventCount(),
      queuedEventsCount: this.eventQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this._error(),
      lastEvent: this._lastEvent()
    };
  }
}