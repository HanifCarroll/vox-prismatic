<?php

return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,127.0.0.1,localhost:5173,voxprismatic.com,.voxprismatic.com')),
    'guard' => ['web'],
    'expiration' => null,
    'middleware' => [
        'authenticate_session' => Illuminate\Session\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
