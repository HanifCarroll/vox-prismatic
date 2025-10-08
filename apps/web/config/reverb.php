<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Reverb Server
    |--------------------------------------------------------------------------
    |
    | This option controls the default server used by Reverb to handle
    | incoming messages as well as broadcasting message to all your
    | connected clients. At this time only "reverb" is supported.
    |
    */

    'default' => env('REVERB_SERVER', 'reverb'),

    /*
    |--------------------------------------------------------------------------
    | Reverb Servers
    |--------------------------------------------------------------------------
    |
    | Here you may define details for each of the supported Reverb servers.
    | Each server has its own configuration options that are defined in
    | the array below. You should ensure all the options are present.
    |
    */

    'servers' => [

        'reverb' => [
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => env('REVERB_SERVER_PORT', 8080),
            'path' => env('REVERB_SERVER_PATH', ''),
            'hostname' => env('REVERB_HOST'),
            'options' => [
                'tls' => [],
            ],
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 10_000),
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL'),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => env('REDIS_PORT', '6379'),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => env('REDIS_DB', '0'),
                    'timeout' => env('REDIS_TIMEOUT', 60),
                ],
            ],
            'pulse_ingest_interval' => env('REVERB_PULSE_INGEST_INTERVAL', 15),
            'telescope_ingest_interval' => env('REVERB_TELESCOPE_INGEST_INTERVAL', 15),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Reverb Applications
    |--------------------------------------------------------------------------
    |
    | Here you may define how Reverb applications are managed. If you choose
    | to use the "config" provider, you may define an array of apps which
    | your server will support, including their connection credentials.
    |
    */

    'apps' => [

        'provider' => 'config',

        'apps' => [
            [
                // Use a URL-safe value for the public key that appears in the
                // WebSocket path (/app/{key}). Many setups generate base64
                // strings for REVERB_APP_KEY that can contain "/" and "+",
                // which break the path and lead to 404s through proxies.
                //
                // We align the public key with REVERB_APP_ID (hex-ish, URL-safe)
                // to avoid path issues while keeping the secret private.
                'key' => env('REVERB_APP_ID'),
                'secret' => env('REVERB_APP_SECRET'),
                'app_id' => env('REVERB_APP_ID'),
                'options' => [
                    'host' => env('REVERB_HOST'),
                    // Default to TLS port/scheme in production; keep dev-friendly defaults otherwise
                    'port' => env('REVERB_PORT', env('APP_ENV') === 'production' ? 443 : 8080),
                    'scheme' => env('REVERB_SCHEME', env('APP_ENV') === 'production' ? 'https' : 'http'),
                    'useTLS' => (env('REVERB_SCHEME', env('APP_ENV') === 'production' ? 'https' : 'http') === 'https'),
                ],
                // Restrict allowed origins in production. Provide comma-separated list via REVERB_ALLOWED_ORIGINS.
                // Reverb expects hostnames (no scheme). We normalize any provided URLs to hostnames.
                // Fallbacks:
                // - production: APP_URL host (if set) or []
                // - non-production: '*'
                'allowed_origins' => (function () {
                    $normalize = function (string $value): ?string {
                        $value = trim($value);
                        if ($value === '') return null;
                        // If a scheme is present, parse and return the host. Otherwise assume it's a host pattern.
                        $parts = parse_url($value);
                        if (is_array($parts) && isset($parts['host'])) {
                            return $parts['host'];
                        }
                        // Strip any leading scheme-like markers accidentally included
                        $value = preg_replace('/^https?:\\/\\//i', '', $value);
                        return $value !== '' ? $value : null;
                    };

                    $allowed = env('REVERB_ALLOWED_ORIGINS');
                    if ($allowed !== null && trim($allowed) !== '') {
                        $items = array_map('trim', explode(',', $allowed));
                        return array_values(array_filter(array_map($normalize, $items)));
                    }

                    if (config('app.env') === 'production') {
                        $appUrl = env('APP_URL');
                        if ($appUrl) {
                            $host = $normalize($appUrl);
                            return $host ? [$host] : [];
                        }
                        return [];
                    }

                    return ['*'];
                })(),
                'ping_interval' => env('REVERB_APP_PING_INTERVAL', 60),
                'activity_timeout' => env('REVERB_APP_ACTIVITY_TIMEOUT', 30),
                'max_connections' => env('REVERB_APP_MAX_CONNECTIONS'),
                'max_message_size' => env('REVERB_APP_MAX_MESSAGE_SIZE', 10_000),
            ],
        ],

    ],

];
