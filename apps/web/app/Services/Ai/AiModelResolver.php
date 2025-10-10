<?php

namespace App\Services\Ai;

use RuntimeException;

class AiModelResolver
{
    public function modelFor(string $action, ?string $fallback = null): string
    {
        $map = config('ai.actions', []);
        if (is_array($map) && array_key_exists($action, $map)) {
            $configured = $map[$action];
            if (is_string($configured) && trim($configured) !== '') {
                return $configured;
            }
        }

        $default = config('ai.defaults.model');
        if (is_string($default) && trim($default) !== '') {
            return $default;
        }

        $fallback = trim((string) ($fallback ?? AiModels::GEMINI_PRO));

        return str_contains($fallback, ':') ? $fallback : 'gemini:' . $fallback;
    }

    /**
     * @return array{provider: string, model: string, identifier: string}
     */
    public function resolve(AiRequest $request): array
    {
        $rawModel = $request->model ?? $this->modelFor($request->action);
        if (!is_string($rawModel) || trim($rawModel) === '') {
            throw new RuntimeException('Model cannot be resolved for AI request');
        }

        [$provider, $model] = $this->resolveModelIdentifier($rawModel, $request->action);

        return [
            'provider' => $provider,
            'model' => $model,
            'identifier' => AiModels::identifier($provider, $model),
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    public function resolveModelIdentifier(string $rawModel, string $action): array
    {
        [$provider, $model] = $this->parseModelIdentifier($rawModel, 'gemini', '');

        $provider = $provider !== '' ? $provider : 'gemini';

        if ($provider === 'openai' && ($model === '' || str_starts_with($model, 'models/'))) {
            $model = AiModels::OPENAI_DEFAULT;
        } elseif ($provider === 'gemini' && $model === '') {
            $model = AiModels::GEMINI_PRO;
        }

        if ($model === '' || $model === null) {
            $model = $provider === 'openai' ? AiModels::OPENAI_DEFAULT : AiModels::GEMINI_PRO;
        }

        return [strtolower($provider), $model];
    }

    /**
     * @return array{0: string, 1: string}
     */
    public function parseModelIdentifier(string $value, string $defaultProvider = 'gemini', ?string $defaultModel = null): array
    {
        $trimmed = trim((string) $value);
        $fallbackProvider = strtolower(trim($defaultProvider));

        if ($trimmed === '') {
            return [$fallbackProvider, $defaultModel ?? ''];
        }

        if (str_contains($trimmed, ':')) {
            [$provider, $model] = explode(':', $trimmed, 2);
            return [strtolower(trim($provider)), trim($model)];
        }

        return [$fallbackProvider, $trimmed];
    }
}
