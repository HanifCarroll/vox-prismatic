<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken as BaseVerifier;

class ValidateCsrfToken extends BaseVerifier
{
    /**
     * URIs that should be excluded from CSRF verification.
     * NOTE: For local/dev flow exercise; tighten before production.
     */
    protected $except = [
        // External callbacks/webhooks that cannot send our CSRF token
        'api/stripe/webhook',
        'api/linkedin/callback',
        'api/auth/linkedin/callback',
    ];
}
