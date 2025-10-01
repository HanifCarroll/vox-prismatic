<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('CORS_ORIGIN', 'http://localhost:5173')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
    'exposed_headers' => ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
    'max_age' => 0,
    'supports_credentials' => true,
];

