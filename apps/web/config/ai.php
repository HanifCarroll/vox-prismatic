<?php

use App\Services\Ai\AiModels;

return [
    'defaults' => [
        'model' => env('AI_MODEL_DEFAULT', 'gemini:' . AiModels::GEMINI_PRO),
        'temperatures' => [
            'default' => env('AI_TEMPERATURE_DEFAULT', 0.3),
            'transcript.normalize' => env('AI_TEMPERATURE_TRANSCRIPT_NORMALIZE'),
            'transcript.title' => env('AI_TEMPERATURE_TRANSCRIPT_TITLE'),
            'insights.generate' => env('AI_TEMPERATURE_INSIGHTS', 0.2),
            'insights.map' => env('AI_TEMPERATURE_INSIGHTS_MAP'),
            'insights.reduce' => env('AI_TEMPERATURE_INSIGHTS_REDUCE'),
            'posts.generate' => env('AI_TEMPERATURE_POSTS_GENERATE', 0.4),
            'post.regenerate' => env('AI_TEMPERATURE_POST_REGENERATE', 0.4),
            'hook.workbench' => env('AI_TEMPERATURE_HOOK_WORKBENCH', 0.4),
        ],
    ],
    'actions' => [
        'transcript.title' => env('AI_MODEL_TRANSCRIPT_TITLE', 'gemini:' . AiModels::GEMINI_FLASH),
        'insights.generate' => env('AI_MODEL_INSIGHTS_GENERATE', 'gemini:' . AiModels::GEMINI_PRO),
        'insights.map' => env('AI_MODEL_INSIGHTS_MAP', 'gemini:' . AiModels::GEMINI_FLASH),
        'insights.reduce' => env('AI_MODEL_INSIGHTS_REDUCE', 'gemini:' . AiModels::GEMINI_PRO),
        'posts.generate' => env('AI_MODEL_POSTS_GENERATE', 'gemini:' . AiModels::GEMINI_FLASH),
        'post.regenerate' => env('AI_MODEL_POST_REGENERATE', 'gemini:' . AiModels::GEMINI_FLASH),
        'hook.workbench' => env('AI_MODEL_HOOK_WORKBENCH', 'gemini:' . AiModels::GEMINI_FLASH),
    ],
    'insights' => [
        'temperature' => env('INSIGHTS_TEMPERATURE', 0.2),
        'map_reduce_threshold_chars' => (int) env('INSIGHTS_MAP_REDUCE_THRESHOLD_CHARS', 12000),
        'map_chunk_chars' => (int) env('INSIGHTS_MAP_CHUNK_CHARS', 9000),
        'map_per_chunk' => (int) env('INSIGHTS_MAP_PER_CHUNK', 4),
        'reduce_pool_max' => (int) env('INSIGHTS_REDUCE_POOL_MAX', 40),
        'reduce_target_min' => env('INSIGHTS_REDUCE_TARGET_MIN', 5),
        'reduce_target_max' => env('INSIGHTS_REDUCE_TARGET_MAX'),
    ],
    'posts' => [
        'temperature' => env('AI_TEMPERATURE_POSTS_GENERATE', 0.4),
    ],
    'hook_workbench' => [
        'temperature' => env('AI_TEMPERATURE_HOOK_WORKBENCH', 0.4),
    ],
];
