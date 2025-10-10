<?php

namespace App\Services\Ai\Contracts;

use App\Services\Ai\AiRequest;
use App\Services\Ai\AiResponse;

interface StructuredCompletionClient
{
    /**
     * Execute a structured completion request for the given provider-specific model.
     *
     * @param  string  $model  Provider-specific model identifier (without prefix).
     */
    public function generate(AiRequest $request, string $model): AiResponse;
}
