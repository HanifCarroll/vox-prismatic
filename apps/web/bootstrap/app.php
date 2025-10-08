<?php

use App\Providers\AppServiceProvider;
use App\Providers\HorizonServiceProvider;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        channels: __DIR__.'/../routes/channels.php',
        attributes: [
            'middleware' => ['web', 'auth'],
        ],
    )
    ->withSchedule(function (Schedule $schedule): void {
        // Keep scheduler responsibilities here so Artisan discovers tasks without a custom kernel.
        $schedule->command('posts:publish-due')->everyMinute();
        $schedule->command('horizon:snapshot')->everyFiveMinutes();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        // Use default guest redirect behavior (redirect unauthenticated users to login on web routes).

        // Exempt third-party webhook routes from CSRF checks
        $middleware->validateCsrfTokens(except: [
            'stripe/*',
            'linkedin/callback',
        ]);

        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_ALL
        );

        // Ensure Inertia middleware runs for web routes
        $middleware->appendToGroup('web', [\App\Http\Middleware\HandleInertiaRequests::class]);
    })
    ->withProviders([
        AppServiceProvider::class,
        HorizonServiceProvider::class,
    ])
    ->withExceptions(function (Exceptions $exceptions): void {
        // Use Laravel's default exception handling without API-specific overrides.
    })
    ->create();
