<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Data\PostDraft;
use App\Domain\Posts\Support\PostContentNormalizer;
use App\Domain\Posts\Support\HashtagNormalizer;
use App\Domain\Posts\Support\PostHookInspector;
use App\Domain\Posts\Support\HookFrameworkCatalog;
use App\Services\Ai\Prompts\HookWorkbenchPromptBuilder;
use App\Services\Ai\Prompts\PostPromptBuilder;
use App\Services\AiService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

final class PostDraftGenerator
{
    public function __construct(
        private readonly AiService $ai,
        private readonly PostPromptBuilder $prompts,
        private readonly HookWorkbenchPromptBuilder $hookPrompts,
        private readonly \App\Services\Ai\Prompts\HashtagSuggestionsPromptBuilder $hashtagPrompts,
        private readonly HookFrameworkCatalog $frameworks,
        private readonly PostReviewService $reviewer,
    ) {
    }

    /**
     * @param array<string, mixed> $styleProfile
     * @param array<int, string> $recentHooks
     */
    public function generateFromInsight(
        string $projectId,
        string $insightId,
        string $insightContent,
        ?string $insightQuote,
        ?string $supportingContext,
        array $styleProfile,
        string $objective,
        array $recentHooks = [],
        ?string $userId = null,
    ): ?PostDraft {
        try {
            // Step 1: Generate body-only content
            $response = $this->ai->complete(
                $this->prompts
                    ->draftFromInsight($insightContent, $insightQuote, $supportingContext, $styleProfile, $objective, $recentHooks)
                    ->withContext($projectId, $userId)
                    ->withMetadata([
                        'insightId' => $insightId,
                        'objective' => $objective,
                        'mode' => 'body-first',
                    ])
            );
        } catch (Throwable $e) {
            Log::warning('post_generation_failed', [
                'projectId' => $projectId,
                'insightId' => $insightId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        $data = $response->data;
        $body = isset($data['body']) ? (string) $data['body'] : null;

        if (!$body) {
            return null;
        }

        $body = PostContentNormalizer::normalize($body);

        // Step 2: Generate hooks via workbench and merge the recommended hook with body
        $content = $body;
        try {
            $content = $this->generateAndMergeHook(
                $projectId,
                $userId,
                $insightContent,
                $body,
                $supportingContext,
                $styleProfile,
                $recentHooks
            );
        } catch (Throwable $e) {
            Log::warning('post_hook_generation_failed', [
                'projectId' => $projectId,
                'insightId' => $insightId,
                'error' => $e->getMessage(),
            ]);
            // Fallback to body-only content
            $content = $body;
        }

        // Step 3: Review merged draft for actionable feedback
        $review = null;
        try {
            $review = $this->reviewer->reviewDraft(
                $projectId,
                $userId,
                $content,
                $styleProfile,
                $insightId,
                null,
            );
        } catch (Throwable $e) {
            Log::warning('post_review.capture_failed', [
                'projectId' => $projectId,
                'insightId' => $insightId,
                'error' => $e->getMessage(),
            ]);
        }

        // Step 4: Suggest hashtags (3)
        $hashtags = $this->suggestHashtags(
            $projectId,
            $userId,
            $insightContent,
            $content,
            $supportingContext,
            $styleProfile
        );

        return new PostDraft(
            insightId: $insightId,
            content: $content,
            hashtags: $hashtags,
            objective: $objective,
            review: $review,
        );
    }

    /**
     * @param array<string, mixed> $styleProfile
     * @param array<int, string> $recentHooks
     */
    private function generateAndMergeHook(
        string $projectId,
        ?string $userId,
        string $insight,
        string $body,
        ?string $transcriptExcerpt,
        array $styleProfile,
        array $recentHooks
    ): string {
        $frameworkPool = $this->frameworks->all();
        if (!empty($frameworkPool)) {
            shuffle($frameworkPool);
        }
        $selected = array_slice($frameworkPool, 0, min(4, count($frameworkPool)));

        $opening = $this->firstParagraph($body);

        $json = $this->ai->complete(
            $this->hookPrompts
                ->hooks(
                    $selected,
                    5,
                    $insight,
                    $opening,
                    $transcriptExcerpt ? mb_substr($transcriptExcerpt, 0, 1800) : null,
                    $styleProfile,
                    $recentHooks,
                    null,
                )
                ->withContext($projectId, $userId)
        )->data;

        $hooks = [];
        foreach (($json['hooks'] ?? []) as $hook) {
            if (!is_array($hook)) {
                continue;
            }
            $hooks[] = [
                'id' => isset($hook['id']) ? (string) $hook['id'] : (string) Str::uuid(),
                'hook' => mb_substr((string) ($hook['hook'] ?? ''), 0, 210),
                'curiosity' => max(0, min(100, (int) ($hook['curiosity'] ?? 50))),
                'valueAlignment' => max(0, min(100, (int) ($hook['valueAlignment'] ?? 50))),
            ];
        }

        if (empty($hooks)) {
            return $body;
        }

        $recommendedId = is_string(($json['recommendedId'] ?? null)) ? (string) $json['recommendedId'] : null;
        $recommended = null;
        if ($recommendedId) {
            foreach ($hooks as $h) {
                if ($h['id'] === $recommendedId) {
                    $recommended = $h; break;
                }
            }
        }
        if (!$recommended) {
            $best = null; $bestScore = -1;
            foreach ($hooks as $h) {
                $score = (int) round(($h['curiosity'] + $h['valueAlignment']) / 2);
                if ($score > $bestScore) { $best = $h; $bestScore = $score; }
            }
            $recommended = $best ?? $hooks[0];
        }

        $hookText = trim((string) ($recommended['hook'] ?? ''));
        if ($hookText === '') {
            return $body;
        }

        return $this->mergeHookIntoBody($hookText, $body);
    }

    private function firstParagraph(string $text): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", trim($text));
        $parts = preg_split('/\n{2,}/', $normalized) ?: [];
        $first = trim((string) ($parts[0] ?? ''));
        return mb_substr($first, 0, 240);
    }

    private function mergeHookIntoBody(string $hook, string $body): string
    {
        $hook = preg_replace('/\s+/u', ' ', trim($hook));
        if ($hook === '') {
            return $body;
        }

        $existingHook = PostHookInspector::extractHook($body);
        if ($existingHook && trim($existingHook) === $hook) {
            return $body;
        }

        return $hook . "\n\n" . ltrim($body);
    }

    /**
     * @param array<string, mixed> $styleProfile
     * @return array<int, string>
     */
    private function suggestHashtags(
        string $projectId,
        ?string $userId,
        string $insight,
        string $content,
        ?string $transcriptExcerpt,
        array $styleProfile
    ): array {
        try {
            $json = $this->ai->complete(
                $this->hashtagPrompts
                    ->suggest(
                        $insight,
                        $content,
                        $transcriptExcerpt ? mb_substr($transcriptExcerpt, 0, 1800) : null,
                        $styleProfile,
                    )
                    ->withContext($projectId, $userId)
            )->data;

            $raw = isset($json['hashtags']) && is_iterable($json['hashtags']) ? $json['hashtags'] : [];
            $normalized = HashtagNormalizer::normalize($raw);
            if (count($normalized) > 3) {
                $normalized = array_slice($normalized, 0, 3);
            }
            return $normalized;
        } catch (\Throwable $e) {
            Log::warning('post_hashtags_suggest_failed', [
                'projectId' => $projectId,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }
}
