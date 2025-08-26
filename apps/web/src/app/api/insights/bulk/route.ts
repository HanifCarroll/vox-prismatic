import { createApiProxy } from '@/lib/api-proxy';

// Proxy bulk insights requests to the Hono API server
const { POST } = createApiProxy('/api/insights/bulk');

export { POST };