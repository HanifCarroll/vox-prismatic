<?php

return [
    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    'connections' => [
        'reverb' => [
            'driver' => 'reverb',
            // Use APP_ID as the public key to keep URL-safe and consistent with the server config
            'key' => env('REVERB_APP_ID', 'local-app-id'),
            'secret' => env('REVERB_APP_SECRET', 'local-app-secret'),
            'app_id' => env('REVERB_APP_ID', 'local-app-id'),
            'options' => [
                // Internal service endpoint used by the PHP process to publish events
                'host' => env('REVERB_INTERNAL_HOST', env('REVERB_HOST', '127.0.0.1')),
                'port' => env('REVERB_INTERNAL_PORT', env('REVERB_PORT', env('APP_ENV') === 'production' ? 443 : 8080)),
                'scheme' => env('REVERB_INTERNAL_SCHEME', env('REVERB_SCHEME', env('APP_ENV') === 'production' ? 'https' : 'http')),
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
