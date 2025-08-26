import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Proxy a Next.js API route request to the Hono API server
 * This allows gradual migration while maintaining existing API contracts
 */
export async function proxyToHonoApi(
  request: NextRequest, 
  method: string,
  endpoint: string
): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const apiUrl = `${API_BASE_URL}${endpoint}${url.search}`;
    
    const body = method !== 'GET' ? await request.text() : undefined;
    
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization headers if needed
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        }),
      },
      body,
    });
    
    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error(`API proxy error for ${endpoint}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to proxy request to API server' },
      { status: 500 }
    );
  }
}

/**
 * Create standard proxy functions for a given endpoint
 */
export function createApiProxy(endpoint: string) {
  return {
    GET: (request: NextRequest) => proxyToHonoApi(request, 'GET', endpoint),
    POST: (request: NextRequest) => proxyToHonoApi(request, 'POST', endpoint),
    PATCH: (request: NextRequest) => proxyToHonoApi(request, 'PATCH', endpoint),
    PUT: (request: NextRequest) => proxyToHonoApi(request, 'PUT', endpoint),
    DELETE: (request: NextRequest) => proxyToHonoApi(request, 'DELETE', endpoint),
  };
}