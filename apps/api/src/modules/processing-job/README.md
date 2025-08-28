# ProcessingJob State Machine Module

## Overview

The ProcessingJob module provides a comprehensive XState v5 state machine implementation for tracking and managing asynchronous job execution in the content creation API. It handles job lifecycle management with built-in retry logic, progress tracking, and automated error recovery.

## Features

### Core Capabilities
- **State Management**: XState v5 state machine with clearly defined states and transitions
- **Retry Logic**: Automatic exponential backoff retry mechanism with configurable limits
- **Progress Tracking**: Real-time progress updates without state transitions
- **Event Emission**: NestJS EventEmitter2 integration for reactive event handling
- **Graceful Cancellation**: Support for cancelling running jobs with reason tracking
- **Stale Job Detection**: Automatic detection and handling of stuck jobs
- **Cost & Duration Tracking**: Built-in metrics for processing duration and estimated costs

### States

The state machine implements the following states:

- **QUEUED** (initial): Job is waiting to be processed
- **PROCESSING**: Job is actively being processed
- **COMPLETED** (final): Job completed successfully
- **FAILED**: Job failed but may be retryable
- **RETRYING**: Job is waiting to retry after failure
- **PERMANENTLY_FAILED** (final): Job failed after maximum retries
- **CANCELLED** (final): Job was cancelled by user or system

### State Transitions

```
QUEUED → PROCESSING (START)
PROCESSING → COMPLETED (COMPLETE)
PROCESSING → FAILED (FAIL)
PROCESSING → CANCELLED (CANCEL)
FAILED → RETRYING (RETRY, if canRetry)
FAILED → PERMANENTLY_FAILED (automatic, if !canRetry)
RETRYING → PROCESSING (automatic after backoff)
```

## Usage

### Starting a Job

```typescript
const job = await processingJobStateService.startProcessing(jobId);
```

### Updating Progress

```typescript
await processingJobStateService.updateProgress(
  jobId,
  50, // progress percentage
  'Processing halfway complete',
  { itemsProcessed: 25 }
);
```

### Handling Failures

```typescript
await processingJobStateService.failJob(
  jobId,
  new Error('API rate limit exceeded'),
  true // isRetryable
);
```

### Manual Retry

```typescript
await processingJobStateService.retryJob(jobId);
```

### Cancellation

```typescript
await processingJobStateService.cancelJob(jobId, 'User requested cancellation');
```

## Job Type Configuration

Each job type has specific configuration:

```typescript
const JOB_TYPE_CONFIG = {
  clean_transcript: {
    maxRetries: 3,
    timeout: 60000,      // 1 minute
    baseDelay: 1000,     // 1 second
    maxDelay: 30000,     // 30 seconds
    staleThreshold: 300000 // 5 minutes
  },
  extract_insights: {
    maxRetries: 5,
    timeout: 120000,     // 2 minutes
    baseDelay: 2000,     // 2 seconds
    maxDelay: 60000,     // 1 minute
    staleThreshold: 600000 // 10 minutes
  },
  generate_posts: {
    maxRetries: 4,
    timeout: 90000,      // 1.5 minutes
    baseDelay: 1500,     // 1.5 seconds
    maxDelay: 45000,     // 45 seconds
    staleThreshold: 450000 // 7.5 minutes
  }
};
```

## Events

The module emits the following events:

- `processing-job.started`: Job processing started
- `processing-job.progress`: Progress update
- `processing-job.completed`: Job completed successfully
- `processing-job.failed`: Job failed
- `processing-job.retrying`: Job is retrying
- `processing-job.cancelled`: Job was cancelled
- `processing-job.permanently-failed`: Job permanently failed
- `processing-job.stale.detected`: Stale jobs detected

## API Endpoints

- `GET /api/processing-jobs/:id` - Get job details
- `GET /api/processing-jobs` - List jobs with filters
- `POST /api/processing-jobs/:id/start` - Start processing
- `PUT /api/processing-jobs/:id/progress` - Update progress
- `POST /api/processing-jobs/:id/retry` - Retry failed job
- `POST /api/processing-jobs/:id/cancel` - Cancel job
- `GET /api/processing-jobs/stats/overview` - Get statistics
- `POST /api/processing-jobs/maintenance/check-stale` - Check stale jobs
- `POST /api/processing-jobs/maintenance/cleanup` - Clean old jobs

## Scheduled Tasks

The module includes automated maintenance tasks:

- **Every 5 minutes**: Check for stale jobs
- **Every 10 minutes**: Check for auto-retryable jobs
- **Every hour**: Clean up inactive state machine actors
- **Daily at 2 AM**: Clean up old completed jobs (30+ days)
- **Every 2 minutes**: Monitor job health

## Database Schema

The ProcessingJob model includes:

```prisma
model ProcessingJob {
  id              String   @id @default(cuid())
  jobType         String   @map("job_type")
  sourceId        String   @map("source_id")
  status          String   @default("queued")
  progress        Int      @default(0)
  resultCount     Int      @default(0)
  errorMessage    String?  @map("error_message")
  startedAt       String?  @map("started_at")
  completedAt     String?  @map("completed_at")
  durationMs      Int?     @map("duration_ms")
  estimatedTokens Int?     @map("estimated_tokens")
  estimatedCost   Float?   @map("estimated_cost")
  retryCount      Int      @default(0) @map("retry_count")
  maxRetries      Int?     @map("max_retries")
  lastError       Json?    @map("last_error")
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## Migration

After updating the schema, run:

```bash
bun run prisma:migrate
```

## Testing

The module follows the existing testing patterns:

```typescript
describe('ProcessingJobStateService', () => {
  it('should transition from QUEUED to PROCESSING', async () => {
    const job = await service.startProcessing(jobId);
    expect(job.status).toBe(ProcessingJobStatus.PROCESSING);
  });
  
  it('should retry with exponential backoff', async () => {
    const delay = service.getBackoffDelay('clean_transcript', 2);
    expect(delay).toBe(4000); // 1000 * 2^2
  });
});
```

## Integration with Content Processing

The ProcessingJob state machine integrates seamlessly with the existing content processing pipeline:

1. When a transcript cleaning job is triggered, create a ProcessingJob
2. Update progress during AI processing
3. Handle failures with automatic retry
4. Emit events for real-time SSE updates
5. Track metrics for cost analysis

## Best Practices

1. **Always use state transitions** - Don't update status directly in the database
2. **Handle errors gracefully** - Use the failJob method with appropriate retry flags
3. **Track progress frequently** - Update progress for long-running jobs
4. **Listen to events** - Subscribe to state change events for reactive updates
5. **Clean up resources** - The scheduler automatically handles cleanup

## Future Enhancements

- [ ] Add job priority levels
- [ ] Implement job dependencies
- [ ] Add batch job processing
- [ ] Enhanced cost prediction
- [ ] Job result caching
- [ ] Webhook notifications for state changes