import { createApiProxy } from '@/lib/api-proxy';

// Proxy dashboard requests to the Hono API server
const { GET } = createApiProxy('/api/dashboard');

export { GET };