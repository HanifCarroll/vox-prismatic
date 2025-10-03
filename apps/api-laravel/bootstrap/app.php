<?php

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API should not redirect unauthenticated users to a web login route.
        // Return JSON (handled in exception renderer) instead of redirecting.
        $middleware->redirectGuestsTo(fn () => null);

        // Ensure CORS runs for both API and web routes
        // Important for Sanctum's /sanctum/csrf-cookie so browsers accept Set-Cookie with credentials
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);

        RateLimiter::for('login', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
            ];
        });

        RateLimiter::for('linkedin-oauth', function (Request $request) {
            $identifier = $request->user()?->getAuthIdentifier() ?? $request->ip();
            return [
                Limit::perMinute(10)->by($identifier),
            ];
        });

        // Exempt third-party webhook routes from CSRF checks
        $middleware->validateCsrfTokens(except: [
            'api/stripe/*',
            'api/linkedin/callback',
            'api/auth/linkedin/callback',
        ]);

        // Use Laravel Sanctum stateful API - this automatically adds session, cookies, and CSRF middleware
        $middleware->statefulApi();

        // Add logging and security headers to API group
        $middleware->appendToGroup('api', [
            \App\Http\Middleware\LogAuthRequests::class,
            \App\Http\Middleware\SecureHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Report exceptions with structured logs and appropriate levels
        $exceptions->report(function (Throwable $e) {
            $req = request();
            if (!$req) {
                return;
            }
            // Only log API requests here; non-API use default reporting
            if (!str_starts_with($req->path(), 'api/')) {
                return;
            }

            $status = null;
            if ($e instanceof \App\Exceptions\AppException) {
                $status = $e->getStatusCode();
            } elseif ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
            }

            $payload = [
                'event' => 'exception',
                'request' => [
                    'method' => $req->method(),
                    'path' => $req->path(),
                    'ip' => $req->ip(),
                    'user_agent' => $req->userAgent(),
                    'user_id' => $req->user()?->id,
                    'request_id' => $req->headers->get('X-Request-Id') ?? null,
                ],
                'error' => [
                    'type' => get_class($e),
                    'message' => $e->getMessage(),
                    'code' => $e instanceof \App\Exceptions\AppException ? $e->getCodeString() : null,
                ],
            ];
            if (config('app.env') === 'local') {
                $payload['error']['stack'] = $e->getTraceAsString();
            }

            if (!is_null($status) && $status >= 400 && $status < 500) {
                Log::warning('request.error', $payload);
            } else {
                Log::error('request.error', $payload);
            }
        });
        // Consistent API error shape
        $exceptions->render(function (Throwable $e, \Illuminate\Http\Request $request) {
            if (!str_starts_with($request->path(), 'api/')) {
                return null; // Use default for non-API
            }

            // AppException family returns normalized structure
            if ($e instanceof \App\Exceptions\AppException) {
                return response()->json([
                    'error' => $e->getMessage(),
                    'code' => $e->getCodeString(),
                    'status' => $e->getStatusCode(),
                    'details' => $e->getSafeDetails(),
                ], $e->getStatusCode());
            }

            // Validation exceptions
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return response()->json([
                    'error' => 'Validation Error',
                    'code' => \App\Exceptions\ErrorCode::VALIDATION_ERROR->value,
                    'status' => 422,
                    'details' => config('app.env') === 'local' ? $e->errors() : null,
                ], 422);
            }

            // Authentication
            if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'code' => \App\Exceptions\ErrorCode::UNAUTHORIZED->value,
                    'status' => 401,
                ], 401);
            }

            // CSRF token mismatch (common when SPA hasn't fetched /sanctum/csrf-cookie)
            // Laravel 12+ throws HttpException(419) instead of TokenMismatchException
            if (
                $e instanceof \Illuminate\Session\TokenMismatchException ||
                ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException && $e->getStatusCode() === 419)
            ) {
                \Illuminate\Support\Facades\Log::warning('🔴 CSRF Token Mismatch', [
                    'path' => $request->path(),
                    'exception' => get_class($e),
                    'message' => $e->getMessage(),
                ]);
                return response()->json([
                    'error' => 'Unauthorized',
                    'code' => \App\Exceptions\ErrorCode::UNAUTHORIZED->value,
                    'status' => 401,
                ], 401);
            }

            // Authorization
            if ($e instanceof \Illuminate\Auth\Access\AuthorizationException) {
                return response()->json([
                    'error' => 'Forbidden',
                    'code' => \App\Exceptions\ErrorCode::FORBIDDEN->value,
                    'status' => 403,
                ], 403);
            }

            // Not Found
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                return response()->json([
                    'error' => 'Not Found',
                    'code' => \App\Exceptions\ErrorCode::NOT_FOUND->value,
                    'status' => 404,
                ], 404);
            }

            // Fallback
            return response()->json([
                'error' => 'Internal Server Error',
                'code' => \App\Exceptions\ErrorCode::INTERNAL_ERROR->value,
                'status' => 500,
                'details' => config('app.env') === 'local' ? [ 'message' => $e->getMessage(), 'type' => get_class($e) ] : null,
            ], 500);
        });
    })->create();
