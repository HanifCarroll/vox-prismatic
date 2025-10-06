<?php

use Illuminate\Support\Str;

return [
    'domain' => env('HORIZON_DOMAIN'),

    'path' => env('HORIZON_PATH', 'horizon'),

    'use' => env('HORIZON_REDIS_CONNECTION', env('REDIS_QUEUE_CONNECTION', 'default')),

    'prefix' => env(
        'HORIZON_PREFIX',
        Str::slug(env('APP_NAME', 'laravel'), '_').'_horizon:'
    ),

    'middleware' => ['web'],

    'waits' => [
        sprintf('%s:%s', env('HORIZON_QUEUE_CONNECTION', 'redis'), env('REDIS_QUEUE', 'processing')) => 90,
    ],

    'trim' => [
        'recent' => 60,
        'pending' => 60,
        'completed' => 60,
        'recent_failed' => 10080,
        'failed' => 10080,
        'monitored' => 10080,
    ],

    'silenced' => [],

    'silenced_tags' => [],

    'metrics' => [
        'trim_snapshots' => [
            'job' => 24,
            'queue' => 24,
        ],
    ],

    'fast_termination' => false,

    'memory_limit' => 64,

    'defaults' => [
        'processing-supervisor' => [
            'connection' => env('HORIZON_QUEUE_CONNECTION', 'redis'),
            'queue' => [env('REDIS_QUEUE', 'processing')],
            'balance' => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses' => 1,
            'maxTime' => 0,
            'maxJobs' => 0,
            'memory' => 128,
            'tries' => 3,
            'timeout' => 600,
            'nice' => 0,
        ],
    ],

    'environments' => [
        'production' => [
            'processing-supervisor' => [
                'maxProcesses' => 10,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
            ],
        ],

        'local' => [
            'processing-supervisor' => [
                'maxProcesses' => 3,
            ],
        ],
    ],
];
