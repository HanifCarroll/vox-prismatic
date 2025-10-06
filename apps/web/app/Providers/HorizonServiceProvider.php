<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

class HorizonServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Horizon::auth(function ($request): bool {
            if (app()->environment('local')) {
                return true;
            }

            $user = $request->user();

            return (bool) ($user?->is_admin ?? false);
        });
    }
}
