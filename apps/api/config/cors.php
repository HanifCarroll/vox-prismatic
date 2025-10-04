<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(
        array_map(
            'trim',
            explode(',', (string) env('CORS_ORIGIN', 'http://localhost:5173')),
        ),
    ),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
    'max_age' => 0,
    'supports_credentials' => true,
];
