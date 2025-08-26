import { createApiProxy } from '@/lib/api-proxy';

// Proxy sidebar counts requests to the Hono API server
const { GET } = createApiProxy('/api/sidebar/counts');

export { GET };