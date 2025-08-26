import { createApiProxy } from '@/lib/api-proxy';

// Proxy all transcript requests to the Hono API server
const { GET, POST, PATCH } = createApiProxy('/api/transcripts');

export { GET, POST, PATCH };