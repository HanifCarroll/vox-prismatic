import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { Response } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueEvents } from 'bullmq';
import { 
  ProcessingEvent, 
  ProcessingEventType, 
  EntityType,
  ProcessingEventPayload,
  QueueJobStatus 
} from '@content-creation/types';
import { SSEConnection, SSEMessage } from './interfaces/sse-connection.interface';
import { QueueManager } from '@content-creation/queue';

@Injectable()
export class SSEEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(SSEEventsService.name);
  private connections: Map<string, SSEConnection> = new Map();
  private queueEventsListeners: Map<string, QueueEvents> = new Map();
  private eventBuffer: Map<string, ProcessingEvent[]> = new Map();
  private readonly BUFFER_SIZE = 100;
  private readonly BUFFER_TTL = 5 * 60 * 1000; // 5 minutes
  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    @Inject('QUEUE_MANAGER') private readonly queueManager: QueueManager,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeQueueListeners();
    this.startHeartbeat();
  }

  /**
   * Initialize queue event listeners for all content queues
   */
  private async initializeQueueListeners() {
    try {
      // Get QueueEvents instances from the queue manager
      const contentQueues = await this.queueManager.getContentQueueEvents();
      
      // Listen to events for each queue
      for (const [queueName, queueEvents] of Object.entries(contentQueues)) {
        this.setupQueueEventListeners(queueName, queueEvents);
        this.queueEventsListeners.set(queueName, queueEvents);
      }

      this.logger.log('Queue event listeners initialized');
    } catch (error) {
      this.logger.error('Failed to initialize queue event listeners', error);
    }
  }

  /**
   * Setup event listeners for a specific queue
   */
  private setupQueueEventListeners(queueName: string, queueEvents: QueueEvents) {
    // Job started
    queueEvents.on('active', ({ jobId, prev }) => {
      const event = this.createProcessingEvent(
        ProcessingEventType.JOB_STARTED,
        jobId,
        queueName,
        { status: QueueJobStatus.ACTIVE, message: `Job started (was ${prev})` }
      );
      this.broadcastEvent(event);
    });

    // Progress update
    queueEvents.on('progress', ({ jobId, data }) => {
      const event = this.createProcessingEvent(
        ProcessingEventType.JOB_PROGRESS,
        jobId,
        queueName,
        { 
          progress: data as number,
          status: QueueJobStatus.ACTIVE,
          message: this.getProgressMessage(queueName, data as number)
        }
      );
      this.broadcastEvent(event);
    });

    // Job completed
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      const event = this.createProcessingEvent(
        ProcessingEventType.JOB_COMPLETED,
        jobId,
        queueName,
        { 
          status: QueueJobStatus.COMPLETED,
          result: returnvalue,
          message: 'Processing completed successfully'
        }
      );
      this.broadcastEvent(event);
    });

    // Job failed
    queueEvents.on('failed', ({ jobId, failedReason }) => {
      const event = this.createProcessingEvent(
        ProcessingEventType.JOB_FAILED,
        jobId,
        queueName,
        { 
          status: QueueJobStatus.FAILED,
          error: failedReason,
          message: `Processing failed: ${failedReason}`
        }
      );
      this.broadcastEvent(event);
    });

    // Job stalled
    queueEvents.on('stalled', ({ jobId }) => {
      const event = this.createProcessingEvent(
        ProcessingEventType.JOB_STALLED,
        jobId,
        queueName,
        { 
          status: QueueJobStatus.STALLED,
          message: 'Job has stalled and will be retried'
        }
      );
      this.broadcastEvent(event);
    });
  }

  /**
   * Create a processing event from queue event data
   */
  private createProcessingEvent(
    type: ProcessingEventType,
    jobId: string,
    queueName: string,
    payload: ProcessingEventPayload
  ): ProcessingEvent {
    const { entityType, entityId } = this.parseJobId(jobId);
    
    return {
      type,
      jobId,
      entityType,
      entityId,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse job ID to extract entity type and ID
   */
  private parseJobId(jobId: string): { entityType: EntityType; entityId: string } {
    // Job IDs follow pattern: {queue-name}-{entity-id}
    if (jobId.startsWith('clean-transcript-')) {
      return {
        entityType: EntityType.TRANSCRIPT,
        entityId: jobId.replace('clean-transcript-', ''),
      };
    } else if (jobId.startsWith('extract-insights-')) {
      return {
        entityType: EntityType.TRANSCRIPT,
        entityId: jobId.replace('extract-insights-', ''),
      };
    } else if (jobId.startsWith('generate-posts-')) {
      return {
        entityType: EntityType.INSIGHT,
        entityId: jobId.replace('generate-posts-', ''),
      };
    } else if (jobId.startsWith('publish-post-')) {
      return {
        entityType: EntityType.POST,
        entityId: jobId.replace('publish-post-', ''),
      };
    }
    
    // Default fallback
    return {
      entityType: EntityType.TRANSCRIPT,
      entityId: jobId,
    };
  }

  /**
   * Get human-readable progress message based on queue and progress
   */
  private getProgressMessage(queueName: string, progress: number): string {
    if (queueName.includes('clean')) {
      if (progress < 30) return 'Preparing transcript for cleaning...';
      if (progress < 70) return 'Cleaning transcript with AI...';
      if (progress < 90) return 'Saving cleaned content...';
      return 'Finalizing...';
    } else if (queueName.includes('extract')) {
      if (progress < 30) return 'Analyzing transcript...';
      if (progress < 80) return 'Extracting insights with AI...';
      return 'Saving insights...';
    } else if (queueName.includes('generate')) {
      if (progress < 30) return 'Analyzing insight...';
      if (progress < 80) return 'Generating posts with AI...';
      return 'Saving posts...';
    } else if (queueName.includes('publish')) {
      if (progress < 50) return 'Connecting to platform...';
      if (progress < 90) return 'Publishing content...';
      return 'Confirming publication...';
    }
    
    return `Processing... ${progress}%`;
  }

  /**
   * Add a new SSE connection
   */
  addConnection(connectionId: string, response: Response, jobId?: string, userId?: string): void {
    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    });

    // Create connection object
    const connection: SSEConnection = {
      id: connectionId,
      response,
      jobId,
      userId,
      createdAt: new Date(),
    };

    // Store connection
    this.connections.set(connectionId, connection);

    // Send initial connection event
    this.sendToConnection(connection, {
      event: 'connected',
      data: { connectionId, jobId },
    });

    // Send any buffered events for this job
    if (jobId) {
      const bufferedEvents = this.eventBuffer.get(jobId) || [];
      bufferedEvents.forEach(event => {
        this.sendToConnection(connection, {
          event: event.type,
          data: event,
        });
      });
    }

    // Handle client disconnect
    response.on('close', () => {
      this.removeConnection(connectionId);
    });

    this.logger.log(`SSE connection established: ${connectionId}`);
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.logger.log(`SSE connection closed: ${connectionId}`);
    }
  }

  /**
   * Broadcast event to relevant connections
   */
  private broadcastEvent(event: ProcessingEvent): void {
    // Buffer the event
    this.bufferEvent(event);

    // Send to all connections watching this job
    for (const connection of this.connections.values()) {
      if (!connection.jobId || connection.jobId === event.jobId) {
        this.sendToConnection(connection, {
          id: Date.now().toString(),
          event: event.type,
          data: event,
        });
      }
    }

    // Also emit to internal event emitter for other services
    this.eventEmitter.emit(`processing.${event.type}`, event);
  }

  /**
   * Send SSE message to a specific connection
   */
  private sendToConnection(connection: SSEConnection, message: SSEMessage): void {
    try {
      let sseMessage = '';
      
      if (message.id) {
        sseMessage += `id: ${message.id}\n`;
      }
      
      if (message.event) {
        sseMessage += `event: ${message.event}\n`;
      }
      
      if (message.data) {
        const dataString = typeof message.data === 'string' 
          ? message.data 
          : JSON.stringify(message.data);
        sseMessage += `data: ${dataString}\n`;
      }
      
      if (message.retry) {
        sseMessage += `retry: ${message.retry}\n`;
      }
      
      sseMessage += '\n';
      
      connection.response.write(sseMessage);
    } catch (error) {
      this.logger.error(`Failed to send SSE message to ${connection.id}`, error);
      this.removeConnection(connection.id);
    }
  }

  /**
   * Buffer events for reconnection support
   */
  private bufferEvent(event: ProcessingEvent): void {
    const buffer = this.eventBuffer.get(event.jobId) || [];
    buffer.push(event);
    
    // Limit buffer size
    if (buffer.length > this.BUFFER_SIZE) {
      buffer.shift();
    }
    
    this.eventBuffer.set(event.jobId, buffer);
    
    // Clean up old buffers
    setTimeout(() => {
      const buffer = this.eventBuffer.get(event.jobId);
      if (buffer && buffer[0] === event) {
        this.eventBuffer.delete(event.jobId);
      }
    }, this.BUFFER_TTL);
  }

  /**
   * Send heartbeat to all connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const connection of this.connections.values()) {
        try {
          connection.response.write(':heartbeat\n\n');
        } catch (error) {
          this.removeConnection(connection.id);
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      try {
        connection.response.end();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.connections.clear();

    // Close queue event listeners
    for (const queueEvents of this.queueEventsListeners.values()) {
      await queueEvents.close();
    }
    this.queueEventsListeners.clear();

    this.logger.log('SSE Events Service destroyed');
  }
}