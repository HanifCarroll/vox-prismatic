<?php

return [
    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    'connections' => [
        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY', 'local-app-key'),
            'secret' => env('REVERB_APP_SECRET', 'local-app-secret'),
            'app_id' => env('REVERB_APP_ID', 'local-app-id'),
            'options' => [
                // Allow containers to override the internal host without breaking local host setups
                'host' => env('REVERB_INTERNAL_HOST', env('REVERB_HOST', '127.0.0.1')),
                // Prefer TLS defaults in production; dev remains on ws/http
                'port' => env('REVERB_PORT', env('APP_ENV') === 'production' ? 443 : 8080),
                'scheme' => env('REVERB_SCHEME', env('APP_ENV') === 'production' ? 'https' : 'http'),
            ],
        ],

        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY', 'app-key'),
            'secret' => env('PUSHER_APP_SECRET', 'app-secret'),
            'app_id' => env('PUSHER_APP_ID', 'local'),
            'options' => [
                'cluster' => env('PUSHER_APP_CLUSTER', 'mt1'),
                'host' => env('PUSHER_HOST', '127.0.0.1'),
                'port' => env('PUSHER_PORT', 6001),
                'scheme' => env('PUSHER_SCHEME', 'http'),
                'encrypted' => filter_var(env('PUSHER_USE_TLS', false), FILTER_VALIDATE_BOOLEAN),
                'useTLS' => filter_var(env('PUSHER_USE_TLS', false), FILTER_VALIDATE_BOOLEAN),
            ],
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],
    ],
];
