<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class LogAuthRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        // Generate correlation ID and attach to logs + response
        $requestId = (string) Str::uuid();
        Log::withContext([
            'request_id' => $requestId,
            'ip' => $request->ip(),
            'method' => $request->method(),
            'path' => $request->path(),
            'user_agent' => $request->userAgent(),
        ]);

        // Determine if we should log this request
        $path = $request->path();
        $isHealth = $path === 'up' || $path === 'api/health';
        $env = (string) config('app.env');
        $logRequestsEnv = env('LOG_REQUESTS');
        $shouldLogRequests = $logRequestsEnv === null
            ? ($env !== 'production')
            : filter_var($logRequestsEnv, FILTER_VALIDATE_BOOLEAN);

        if (!$isHealth && $shouldLogRequests) {
            Log::info('request.received', [
                'method' => $request->method(),
                'path' => $path,
                'full_url' => $request->fullUrl(),
                'route' => optional($request->route())->getName(),
                'ip' => $request->ip(),
                'session_id' => $request->hasSession() ? $request->session()->getId() : null,
                'authenticated' => auth()->check(),
                'user_id' => auth()->id(),
                'request_id' => $requestId,
            ]);
        }

        $response = $next($request);

        $duration = round((microtime(true) - $startTime) * 1000, 2);

        if (!$isHealth && $shouldLogRequests) {
            Log::info('request.completed', [
                'method' => $request->method(),
                'path' => $path,
                'status' => $response->getStatusCode(),
                'duration_ms' => $duration,
                'authenticated_after' => auth()->check(),
                'request_id' => $requestId,
            ]);
        }

        // Attach X-Request-Id header for traceability
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
