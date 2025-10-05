<?php

namespace App\Providers;

// Scramble (OpenAPI) is a dev-only package; guard usage when absent in prod
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\Schema as OA_Schema;
use Dedoc\Scramble\Support\Generator\Types\ObjectType as OA_Object;
use Dedoc\Scramble\Support\Generator\Types\StringType as OA_String;
use Dedoc\Scramble\Support\Generator\Types\IntegerType as OA_Int;
use Dedoc\Scramble\Support\Generator\Types\MixedType as OA_Mixed;
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

        // Configure Scramble OpenAPI generation only if package is installed
        if (class_exists(\Dedoc\Scramble\Scramble::class)) {
            Scramble::routes(function (Route $route) {
                return str_starts_with($route->uri, 'api/');
            });

            Scramble::extendOpenApi(function ($openApi) {
                // Cookie-based session auth (Sanctum): model as apiKey in cookie per OpenAPI
                $cookieName = config('session.cookie') ?? 'laravel-session';
                $openApi->secure(
                    \Dedoc\Scramble\Support\Generator\SecurityScheme::apiKey('cookie', $cookieName)
                        ->as('sanctum')
                        ->setDescription("Cookie-based session authentication using Laravel Sanctum via {$cookieName} cookie. For non-GET requests, fetch /sanctum/csrf-cookie and include X-XSRF-TOKEN header.")
                );

                // Add ErrorResponse component (Schema object, not array)
                $err = new OA_Object();
                $err->addProperty('error', (new OA_String())->setDescription('Human-readable error message'));
                $err->addProperty('code', (new OA_String())->setDescription('Machine-readable error code'));
                $err->addProperty('status', (new OA_Int())->setDescription('HTTP status code'));
                $err->addProperty('details', (new OA_Mixed())->setDescription('Optional additional error details'));
                $err->setRequired(['error', 'code', 'status']);

                $openApi->components->addSchema('ErrorResponse', OA_Schema::fromType($err));
            });
        }
    }
}
