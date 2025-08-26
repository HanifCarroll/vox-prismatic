import { createApiProxy } from '@/lib/api-proxy';

// Proxy all insights requests to the Hono API server
const { GET, PATCH } = createApiProxy('/api/insights');

export { GET, PATCH };