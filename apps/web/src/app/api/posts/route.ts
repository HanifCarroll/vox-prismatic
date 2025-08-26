import { createApiProxy } from '@/lib/api-proxy';

// Proxy all posts requests to the Hono API server
const { GET, PATCH } = createApiProxy('/api/posts');

export { GET, PATCH };