<?php

namespace App\Services\Ai;

class AiModels
{
    public const GEMINI_PRO = 'models/gemini-2.5-pro';
    public const GEMINI_FLASH = 'models/gemini-2.5-flash';
    public const OPENAI_DEFAULT = 'gpt-5-nano';

    /**
     * Resolve a human readable label for logging.
     */
    public static function identifier(string $provider, string $model): string
    {
        $provider = trim(strtolower($provider));
        $model = trim($model);

        return $provider !== '' ? "{$provider}:{$model}" : $model;
    }
}
