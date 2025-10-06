<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
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
        // Register SocialiteProviders for LinkedIn OAuth
        Event::listen(function (\SocialiteProviders\Manager\SocialiteWasCalled $event) {
            $event->extendSocialite('linkedin', \SocialiteProviders\LinkedIn\Provider::class);
        });

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

    }
}
