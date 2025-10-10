# Modular AI Service Overview

This document explains the new AI orchestration architecture and how to extend it with additional providers or prompt collaborators.

## High-level Flow

1. Callers build an `AiRequest` either directly or through a prompt builder (for transcripts, insights, posts, or hook workbench).
2. `AiService::complete()` resolves the provider/model via `AiModelResolver`, applies default temperatures/configuration, and logs the request start.
3. The appropriate provider client (`GeminiStructuredClient` or `OpenAIStructuredClient`) executes the request and returns an `AiResponse` with JSON payload and usage stats.
4. `AiUsageRecorder` persists usage/cost metadata and `AiService` logs the outcome before returning the response to the caller.

## Key Components

- `App\Services\Ai\AiRequest`: Immutable request object containing prompt, schema, context, metadata, expected bytes, etc. Use helper methods like `withContext()`, `withMetadata()`, and `withProgress()` to tailor the request for a specific job.
- `App\Services\Ai\AiResponse`: Provider-agnostic response with the JSON payload and token counts.
- `App\Services\Ai\Contracts\StructuredCompletionClient`: Interface implemented by each provider client.
- Provider clients live under `App\Services\Ai\Clients\*StructuredClient.php` and encapsulate API-specific retries, streaming, schema handling, and logging.
- Prompt builders (`App\Services\Ai\Prompts\*PromptBuilder.php`) are stateless helpers that produce ready-to-send `AiRequest` instances for each workflow (transcript normalization/title, insights pipeline, post drafting/regeneration, hook workbench).
- `App\Services\Ai\AiModelResolver`: Central place for mapping actions to provider/model pairs via `config/ai.php`.
- `App\Services\Ai\AiUsageRecorder`: Responsible for persisting usage events and cost estimation using pricing data from `config/services.php`.

## Adding a New Provider

1. Create a new client class under `App\Services\Ai\Clients` that implements `StructuredCompletionClient`. Follow the patterns in the Gemini/OpenAI clients for retries, logging, and error handling.
2. Register the client in `AiService` by injecting it through the constructor and adding it to the `$clients` map.
3. Update `config/services.php` with any provider-specific credentials or pricing information. For runtime configuration, prefer reading from `.env` via config entries instead of using `env()` in code.
4. Update `config/ai.php` if the provider requires new action → model mappings or default temperatures.
5. If the provider supports unique capabilities (for example, structured streaming), ensure your client reports progress through the supplied `onProgress` callback and returns an `AiResponse` with accurate usage metadata.

## Adjusting or Adding Prompts

Prompt text and schema definitions now live in the dedicated prompt builders:

- `TranscriptPromptBuilder` for transcript cleaning/title generation.
- `InsightsPromptBuilder` for single-pass, map, and reduce prompts in the insights pipeline.
- `PostPromptBuilder` for draft generation and regenerations.
- `HookWorkbenchPromptBuilder` for hook ideation requests.

When modifying a prompt:

1. Update the relevant builder method to adjust wording, schema, or default metadata.
2. Use `config/ai.php` to manage temperatures, thresholds, and per-action models. Avoid calling `env()` from application code.
3. If callers need extra metadata, return an `AiRequest` from the builder and let the caller append data using `withMetadata()` or `withContext()` before invoking `AiService::complete()`.

To introduce a new workflow:

1. Add a new builder class (or method) returning an `AiRequest` with the required prompt and schema.
2. Create a dedicated action/service that obtains the request, sets project/user context, and calls `AiService::complete()`.
3. Configure action-specific defaults (model, temperature, thresholds) through `config/ai.php`.

## Configuration Checklist

- `config/ai.php`
  - `defaults.model`: global fallback model identifier.
  - `defaults.temperatures`: per-action temperature overrides (set to `null` to defer to provider defaults).
  - `actions`: maps action IDs to provider-prefixed model identifiers.
  - `insights`/`posts`/`hook_workbench`: houses pipeline-specific knobs (chunk sizes, reduce limits, temperatures).
- `config/services.php`
  - Add `api_key` entries for providers and maintain pricing tables used by `AiUsageRecorder`.

## Usage Examples

```php
$request = $insightsPrompts
    ->mapChunk($chunkText, $index, $total, $perChunk)
    ->withContext($projectId, $userId)
    ->withMetadata(['chunkStartOffset' => $start, 'chunkEndOffset' => $end]);

$response = $aiService->complete($request);
$insights = $response->data['insights'] ?? [];
```

```php
$response = $aiService->complete(
    $postPrompts
        ->draftFromInsight($insight, $quote, $context, $style, $objective)
        ->withContext($projectId, $userId)
        ->withMetadata(['insightId' => $insightId])
);

$content = $response->data['content'] ?? null;
```

## Troubleshooting

- The provider clients log attempt/success/failure events (`ai.generate.*`) with action, model, token usage, and cost data to aid debugging.
- Use `AiUsageEvent` records to audit per-user/project consumption and detect anomalies.
- When prompts fail to parse, provider clients emit debug logs with captured content; inspect those logs before altering schema definitions.
