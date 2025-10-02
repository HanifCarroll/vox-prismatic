<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogAuthRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        // Log incoming request
        Log::info('📥 Request received', [
            'method' => $request->method(),
            'path' => $request->path(),
            'ip' => $request->ip(),
            'session_id' => $request->hasSession() ? $request->session()->getId() : null,
            'authenticated' => auth()->check(),
            'user_id' => auth()->id(),
        ]);

        $response = $next($request);

        $duration = round((microtime(true) - $startTime) * 1000, 2);

        // Log response
        Log::info('📤 Request completed', [
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $response->getStatusCode(),
            'duration_ms' => $duration,
            'authenticated_after' => auth()->check(),
        ]);

        return $response;
    }
}
