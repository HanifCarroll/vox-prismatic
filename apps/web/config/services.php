<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'linkedin' => [
        'client_id' => env('LINKEDIN_CLIENT_ID'),
        'client_secret' => env('LINKEDIN_CLIENT_SECRET'),
        'redirect' => env('LINKEDIN_REDIRECT_URI'),
    ],

    'gemini' => [
        'pricing' => [
            'models/gemini-2.5-pro' => [
                'prompt_per_1m' => (float) env('GEMINI_25_PRO_PROMPT_PER_1M', 1.25),
                'completion_per_1m' => (float) env('GEMINI_25_PRO_COMPLETION_PER_1M', 10.0),
            ],
            'models/gemini-2.5-flash' => [
                'prompt_per_1m' => (float) env('GEMINI_25_FLASH_PROMPT_PER_1M', 0.3),
                'completion_per_1m' => (float) env('GEMINI_25_FLASH_COMPLETION_PER_1M', 2.5),
            ],
            'default' => [
                'prompt_per_1m' => (float) env('GEMINI_DEFAULT_PROMPT_PER_1M', 1.25),
                'completion_per_1m' => (float) env('GEMINI_DEFAULT_COMPLETION_PER_1M', 10.0),
            ],
        ],
    ],

    'openai' => [
        'pricing' => [
            // Set these to your current OpenAI rates (USD per 1M tokens)
            'gpt-5' => [
                'prompt_per_1m' => (float) env('OPENAI_GPT5_PROMPT_PER_1M', 0.0),
                'completion_per_1m' => (float) env('OPENAI_GPT5_COMPLETION_PER_1M', 0.0),
            ],
            'gpt-5-mini' => [
                'prompt_per_1m' => (float) env('OPENAI_GPT5_MINI_PROMPT_PER_1M', 0.0),
                'completion_per_1m' => (float) env('OPENAI_GPT5_MINI_COMPLETION_PER_1M', 0.0),
            ],
            'gpt-5-nano' => [
                'prompt_per_1m' => (float) env('OPENAI_GPT5_NANO_PROMPT_PER_1M', 0.0),
                'completion_per_1m' => (float) env('OPENAI_GPT5_NANO_COMPLETION_PER_1M', 0.0),
            ],
            'gpt-4o-mini' => [
                'prompt_per_1m' => (float) env('OPENAI_4O_MINI_PROMPT_PER_1M', 0.0),
                'completion_per_1m' => (float) env('OPENAI_4O_MINI_COMPLETION_PER_1M', 0.0),
            ],
            'default' => [
                'prompt_per_1m' => (float) env('OPENAI_DEFAULT_PROMPT_PER_1M', 0.0),
                'completion_per_1m' => (float) env('OPENAI_DEFAULT_COMPLETION_PER_1M', 0.0),
            ],
        ],
    ],

];
