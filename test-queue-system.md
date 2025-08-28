# Queue System Testing Guide

This guide will help you test the new queue-based publishing system.

## Prerequisites

1. Make sure all dependencies are installed:
```bash
bun install
```

2. Generate Prisma client and run migrations:
```bash
bun run db:generate
bun run db:migrate
```

## Step 1: Start Redis

```bash
# Start Redis container
docker compose up redis -d

# Verify Redis is running
docker compose ps redis
```

## Step 2: Start the API

```bash
# In one terminal, start the API
bun run api
```

The API should start and connect to both PostgreSQL and Redis.

## Step 3: Start the Worker

```bash
# In another terminal, start the worker
cd apps/worker
bun dev
```

You should see output like:
```
🚀 [Worker] Starting Content Creation Publishing Worker...
🚀 [Worker] Version: 2.0.0 (Queue-based)
📊 [Worker] Initializing database connection...
✅ [Worker] Database connected
⏰ [Worker] Initializing queue processor...
✅ [QueueProcessor] Connected to Redis
🎉 [Worker] Successfully started!
📡 [Worker] Listening for jobs from the queue...
```

## Step 4: Test Publishing Flow

### 4.1 Check Queue Status

```bash
curl http://localhost:3000/api/publisher/queue-status
```

Expected response:
```json
{
  "stats": {
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 0,
    "delayed": 0
  },
  "health": {
    "redis": true,
    "queues": { "publisher": true }
  },
  "timestamp": "2024-..."
}
```

### 4.2 Create a Test Post (Optional - if you don't have one)

First, create a transcript and generate insights/posts through the UI or API.

### 4.3 Schedule a Post

Use the API to schedule a post for 30 seconds in the future:

```bash
# Get a post ID from your database
# Then schedule it:

curl -X POST http://localhost:3000/api/scheduler/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "YOUR_POST_ID",
    "platform": "linkedin",
    "content": "Test post content",
    "scheduledTime": "'$(date -u -v+30S '+%Y-%m-%dT%H:%M:%S.000Z')'"
  }'
```

### 4.4 Monitor the Queue

Check the queue status again:
```bash
curl http://localhost:3000/api/publisher/queue-status
```

You should see a delayed job count of 1.

### 4.5 Watch the Worker Process the Job

After 30 seconds, the worker should pick up the job and process it. You'll see logs like:

In the worker:
```
📱 [LinkedIn] Publishing post...
📱 [LinkedIn] Simulating publish with content: Test post content...
✅ [LinkedIn] Published successfully: linkedin_1234567890
✅ [Database] Post marked as published
```

### 4.6 Verify the Post Was Published

Check the scheduled post in the database to confirm it was marked as published.

## Step 5: Test Queue Management

### Pause the Queue
```bash
curl -X POST http://localhost:3000/api/publisher/queue/pause
```

### Resume the Queue
```bash
curl -X POST http://localhost:3000/api/publisher/queue/resume
```

### Get Job Status
```bash
curl http://localhost:3000/api/publisher/job/YOUR_JOB_ID
```

### Cancel a Job (if it hasn't been processed yet)
```bash
curl -X DELETE http://localhost:3000/api/publisher/job/YOUR_JOB_ID
```

## Step 6: Test Worker Health Check

```bash
cd apps/worker
bun run index.ts health
```

## Troubleshooting

### Redis Connection Issues
- Make sure Redis is running: `docker compose ps redis`
- Check Redis logs: `docker compose logs redis`
- Test Redis connection: `redis-cli ping`

### Worker Not Processing Jobs
- Check worker logs for errors
- Verify Redis connection in worker health check
- Ensure the queue isn't paused
- Check that credentials are set in .env

### Jobs Failing
- Check worker logs for specific error messages
- Verify social media credentials in .env
- Check the database for error messages in the scheduledPost table

## Architecture Benefits

The new queue system provides:

1. **Reliability**: Jobs persist in Redis and survive crashes
2. **Scalability**: Can run multiple workers for high volume
3. **Observability**: Real-time queue metrics and job tracking
4. **Flexibility**: Easy to pause, resume, and manage jobs
5. **Retry Logic**: Automatic retries with exponential backoff

## Next Steps

1. **Add Real Publishing**: Replace the simulated publishing in `queue-processor.ts` with actual LinkedIn and X API calls
2. **Add Bull Board**: Install the Bull Board UI for visual queue monitoring
3. **Configure Production**: Set up Redis persistence and clustering for production
4. **Add More Queues**: Extend to handle transcript processing and AI generation