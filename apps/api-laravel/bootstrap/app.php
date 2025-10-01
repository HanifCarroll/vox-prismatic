<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Add API middleware group additions
        $middleware->appendToGroup('api', [
            // Sanctum SPA stateful requests
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            // Session stack for cookie-based auth (dev convenience)
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            // CORS
            \Illuminate\Http\Middleware\HandleCors::class,
            // Security headers
            \App\Http\Middleware\SecureHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
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
