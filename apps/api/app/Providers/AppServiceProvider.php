<?php

namespace App\Providers;

use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Configure rate limiters
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

        // Configure Scramble OpenAPI generation
        Scramble::routes(function (Route $route) {
            // Only document routes that start with 'api/'
            return str_starts_with($route->uri, 'api/');
        });

        Scramble::extendOpenApi(function (OpenApi $openApi) {
            // Add cookie-based session auth (Sanctum)
            $openApi->secure(
                SecurityScheme::http('sanctum', 'cookie')
                    ->description('Cookie-based session authentication using Laravel Sanctum. Fetch /sanctum/csrf-cookie before making non-GET requests.')
            );

            // Add error response component schema
            $openApi->components->schemas['ErrorResponse'] = [
                'type' => 'object',
                'required' => ['error', 'code', 'status'],
                'properties' => [
                    'error' => [
                        'type' => 'string',
                        'description' => 'Human-readable error message',
                    ],
                    'code' => [
                        'type' => 'string',
                        'description' => 'Machine-readable error code',
                    ],
                    'status' => [
                        'type' => 'integer',
                        'description' => 'HTTP status code',
                    ],
                    'details' => [
                        'description' => 'Optional additional error details',
                    ],
                ],
            ];
        });
    }
}
