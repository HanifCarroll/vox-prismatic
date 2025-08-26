// REMOVED: This proxy route has been replaced with direct API calls using the unified API client
// The web application now makes direct calls to the API server at localhost:3001
// This file should be deleted when all references are updated

export function GET() {
  return new Response('Scheduler API routes moved to direct API calls. Use the unified API client.', { status: 410 });
}

export function PUT() {
  return new Response('Scheduler API routes moved to direct API calls. Use the unified API client.', { status: 410 });
}

export function DELETE() {
  return new Response('Scheduler API routes moved to direct API calls. Use the unified API client.', { status: 410 });
}