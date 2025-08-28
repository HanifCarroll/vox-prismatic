import { 
  Controller, 
  Get, 
  Param, 
  Res, 
  Query,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiParam, 
  ApiQuery,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { SSEEventsService } from './sse-events.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('SSE Events')
@Controller('content-processing/events')
export class SSEController {
  private readonly logger = new Logger(SSEController.name);

  constructor(private readonly sseEventsService: SSEEventsService) {}

  @Get(':jobId')
  @ApiOperation({ 
    summary: 'Stream processing events for a specific job',
    description: 'Establishes a Server-Sent Events connection to receive real-time updates for a specific job'
  })
  @ApiParam({
    name: 'jobId',
    description: 'The job ID to monitor',
    example: 'clean-transcript-abc123',
  })
  @ApiQuery({
    name: 'lastEventId',
    required: false,
    description: 'Last event ID for reconnection support',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established',
    headers: {
      'Content-Type': {
        description: 'Event stream content type',
        schema: { type: 'string', example: 'text/event-stream' }
      },
      'Cache-Control': {
        description: 'Caching disabled',
        schema: { type: 'string', example: 'no-cache' }
      },
      'Connection': {
        description: 'Keep connection alive',
        schema: { type: 'string', example: 'keep-alive' }
      }
    }
  })
  streamJobEvents(
    @Param('jobId') jobId: string,
    @Query('lastEventId') lastEventId: string,
    @Res() response: Response,
    @Req() request: Request,
  ): void {
    this.logger.log(`SSE connection requested for job: ${jobId}`);

    // Generate unique connection ID
    const connectionId = `job-${jobId}-${uuidv4()}`;

    // Extract user ID from request if authenticated
    // TODO: Implement proper authentication
    const userId = (request as any).user?.id;

    // Add connection to the service
    this.sseEventsService.addConnection(
      connectionId,
      response,
      jobId,
      userId
    );

    // Note: Response handling is managed by SSEEventsService
    // The connection will remain open until the client disconnects
  }

  @Get()
  @ApiOperation({ 
    summary: 'Stream all processing events',
    description: 'Establishes a Server-Sent Events connection to receive all processing events (requires authentication)'
  })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: ['transcript', 'insight', 'post'],
    description: 'Filter events by entity type',
  })
  @ApiQuery({
    name: 'lastEventId',
    required: false,
    description: 'Last event ID for reconnection support',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established',
    headers: {
      'Content-Type': {
        description: 'Event stream content type',
        schema: { type: 'string', example: 'text/event-stream' }
      }
    }
  })
  streamAllEvents(
    @Query('entityType') entityType: string,
    @Query('lastEventId') lastEventId: string,
    @Res() response: Response,
    @Req() request: Request,
  ): void {
    this.logger.log(`SSE connection requested for all events`);

    // Generate unique connection ID
    const connectionId = `all-${uuidv4()}`;

    // Extract user ID from request if authenticated
    // TODO: Implement proper authentication and filtering
    const userId = (request as any).user?.id;

    // Add connection to the service (no specific jobId)
    this.sseEventsService.addConnection(
      connectionId,
      response,
      undefined, // No specific job ID - will receive all events
      userId
    );

    // Note: Entity type filtering would be implemented in the service
    // based on user permissions and the entityType parameter
  }

  @Get('test/:jobId')
  @ApiExcludeEndpoint()
  @ApiOperation({ 
    summary: 'Test SSE connection',
    description: 'Test endpoint that simulates job events for debugging'
  })
  async testSSE(
    @Param('jobId') jobId: string,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log(`SSE test connection for job: ${jobId}`);

    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send test events
    const sendTestEvent = (eventType: string, data: any) => {
      const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      response.write(message);
    };

    // Initial connection
    sendTestEvent('connected', { jobId, timestamp: new Date().toISOString() });

    // Simulate progress events
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      
      if (progress <= 100) {
        sendTestEvent('job.progress', {
          jobId,
          progress,
          message: `Processing... ${progress}%`,
          timestamp: new Date().toISOString(),
        });
      } else {
        sendTestEvent('job.completed', {
          jobId,
          message: 'Processing completed',
          timestamp: new Date().toISOString(),
        });
        clearInterval(interval);
        response.end();
      }
    }, 1000);

    // Handle client disconnect
    response.on('close', () => {
      clearInterval(interval);
      this.logger.log(`SSE test connection closed for job: ${jobId}`);
    });
  }
}