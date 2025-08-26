import { createApiProxy } from '@/lib/api-proxy';

// Proxy scheduler events requests to the Hono API server
const { GET, POST, DELETE } = createApiProxy('/api/scheduler/events');

export { GET, POST, DELETE };