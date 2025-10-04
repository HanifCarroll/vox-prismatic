<?php

return [
    /*
    |--------------------------------------------------------------------------
    | API Path
    |--------------------------------------------------------------------------
    |
    | This value is the path where your API routes are located.
    | Scramble will only document routes that start with this path.
    |
    */
    'api_path' => 'api',

    /*
    |--------------------------------------------------------------------------
    | API Domain
    |--------------------------------------------------------------------------
    |
    | This value is the domain where your API is hosted. If null, it will
    | use the current domain.
    |
    */
    'api_domain' => null,

    /*
    |--------------------------------------------------------------------------
    | Info
    |--------------------------------------------------------------------------
    |
    | This information will be used to generate the OpenAPI specification.
    |
    */
    'info' => [
        'title' => env('APP_NAME', 'Laravel') . ' API',
        'description' => 'Content Creation Platform API',
        'version' => '1.0.0',
        'contact' => [
            'name' => 'API Support',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Servers
    |--------------------------------------------------------------------------
    |
    | The servers that your API is available on.
    |
    */
    'servers' => [
        [
            'url' => env('APP_URL', 'http://localhost:3001'),
            'description' => 'Local Development',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Middleware
    |--------------------------------------------------------------------------
    |
    | Middleware to apply to the documentation routes.
    |
    */
    'middleware' => [],
];
