import { NextRequest } from 'next/server';
import { proxyToHonoApi } from '@/lib/api-proxy';

// Proxy post scheduling requests to the Hono API server
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToHonoApi(request, 'POST', `/api/posts/${id}/schedule`);
}