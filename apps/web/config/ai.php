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
            'posts.review' => env('AI_TEMPERATURE_POSTS_REVIEW', 0.2),
            'hook.workbench' => env('AI_TEMPERATURE_HOOK_WORKBENCH', 0.55),
            'hashtags.suggest' => env('AI_TEMPERATURE_HASHTAGS_SUGGEST', 0.3),
        ],
    ],
    'actions' => [
        'transcript.title' => env('AI_MODEL_TRANSCRIPT_TITLE', 'gemini:' . AiModels::GEMINI_FLASH),
        'insights.generate' => env('AI_MODEL_INSIGHTS_GENERATE', 'gemini:' . AiModels::GEMINI_PRO),
        'insights.map' => env('AI_MODEL_INSIGHTS_MAP', 'gemini:' . AiModels::GEMINI_FLASH),
        'insights.reduce' => env('AI_MODEL_INSIGHTS_REDUCE', 'gemini:' . AiModels::GEMINI_PRO),
        'posts.generate' => env('AI_MODEL_POSTS_GENERATE', 'gemini:' . AiModels::GEMINI_FLASH),
        'post.regenerate' => env('AI_MODEL_POST_REGENERATE', 'gemini:' . AiModels::GEMINI_FLASH),
        'posts.review' => env('AI_MODEL_POSTS_REVIEW', 'gemini:' . AiModels::GEMINI_FLASH),
        'hook.workbench' => env('AI_MODEL_HOOK_WORKBENCH', 'gemini:' . AiModels::GEMINI_FLASH),
        'hashtags.suggest' => env('AI_MODEL_HASHTAGS_SUGGEST', 'gemini:' . AiModels::GEMINI_FLASH),
    ],
    'insights' => [
        'temperature' => env('INSIGHTS_TEMPERATURE', 0.2),
    ],
    'posts' => [
        'temperature' => env('AI_TEMPERATURE_POSTS_GENERATE', 0.4),
        'review_temperature' => env('AI_TEMPERATURE_POSTS_REVIEW', 0.2),
    ],
    'hook_workbench' => [
        'temperature' => env('AI_TEMPERATURE_HOOK_WORKBENCH', 0.55),
    ],
    'hashtags' => [
        'temperature' => env('AI_TEMPERATURE_HASHTAGS_SUGGEST', 0.3),
    ],
];
