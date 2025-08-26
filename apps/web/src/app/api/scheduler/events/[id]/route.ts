import { NextRequest } from 'next/server';
import { proxyToHonoApi } from '@/lib/api-proxy';

// Proxy individual scheduler event requests to the Hono API server
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToHonoApi(request, 'GET', `/api/scheduler/events/${id}`);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToHonoApi(request, 'PUT', `/api/scheduler/events/${id}`);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToHonoApi(request, 'DELETE', `/api/scheduler/events/${id}`);
}