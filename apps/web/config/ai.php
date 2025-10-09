<?php

use App\Services\AiService;

return [
    /*
    |--------------------------------------------------------------------------
    | Default Model
    |--------------------------------------------------------------------------
    |
    | When a specific action is not configured below we fall back to this
    | model. Override via AI_MODEL_DEFAULT to change the global default.
    |
    */
    'default_model' => env('AI_MODEL_DEFAULT', AiService::PRO_MODEL),

    /*
    |--------------------------------------------------------------------------
    | Per-Action Model Overrides
    |--------------------------------------------------------------------------
    |
    | Map AI actions to the model that should be used. Each entry can be
    | overridden via an environment variable to keep changes deploy-free.
    |
    */
    'actions' => [
        'transcript.normalize' => env('AI_MODEL_TRANSCRIPT_NORMALIZE', AiService::FLASH_MODEL),
        'transcript.title' => env('AI_MODEL_TRANSCRIPT_TITLE', AiService::FLASH_MODEL),
        'insights.generate' => env('AI_MODEL_INSIGHTS_GENERATE', AiService::PRO_MODEL),
        'insights.map' => env('AI_MODEL_INSIGHTS_MAP', AiService::FLASH_MODEL),
        'insights.reduce' => env('AI_MODEL_INSIGHTS_REDUCE', AiService::PRO_MODEL),
        'posts.generate' => env('AI_MODEL_POSTS_GENERATE', AiService::FLASH_MODEL),
        'post.regenerate' => env('AI_MODEL_POST_REGENERATE', AiService::FLASH_MODEL),
        'hook.workbench' => env('AI_MODEL_HOOK_WORKBENCH', AiService::FLASH_MODEL),
    ],
];

