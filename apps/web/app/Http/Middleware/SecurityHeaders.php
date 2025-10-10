<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Add security-related headers to responses.
     *
     * We specifically block framing to prevent link preview/overlay extensions
     * from embedding the app inside an <iframe>, which can cause confusing
     * modal-like views and CSRF/session issues on auth routes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        // Disallow this app from being framed anywhere.
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Content-Security-Policy', "frame-ancestors 'none'");

        // Small set of broadly safe headers.
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}

