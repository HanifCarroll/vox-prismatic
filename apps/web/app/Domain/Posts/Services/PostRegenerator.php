<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Support\PostContentNormalizer;
use App\Domain\Posts\Support\PostHookInspector;
use App\Domain\Posts\Support\HashtagNormalizer;
use App\Domain\Posts\Support\HookFrameworkCatalog;
use App\Services\Ai\Prompts\HookWorkbenchPromptBuilder;
use App\Services\Ai\Prompts\PostPromptBuilder;
use App\Services\AiService;
use App\Support\PostTypePreset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

final class PostRegenerator
{
    public function __construct(
        private readonly AiService $ai,
        private readonly PostPromptBuilder $prompts,
        private readonly HookWorkbenchPromptBuilder $hookPrompts,
        private readonly HookFrameworkCatalog $frameworks,
        private readonly StyleProfileResolver $styleProfiles,
        private readonly SpeakerInferenceService $speakerInference,
        private readonly \App\Services\Ai\Prompts\HashtagSuggestionsPromptBuilder $hashtagPrompts,
    ) {
    }

    /**
     * @return array{content:string, hashtags:array<int, string>}|null
     */
    public function regenerate(
        string $projectId,
        string $postId,
        string $insightContent,
        ?string $customInstructions,
        ?string $postType,
        ?string $userId = null,
        ?string $existingDraft = null,
    ): ?array {
        $postType = $postType ? strtolower($postType) : null;
        $instructions = PostTypePreset::mergeCustomInstructions($customInstructions, $postType);
        $presetDirective = '';

        if ($postType && ($hint = PostTypePreset::hint($postType))) {
            $presetDirective = "\nPreset target: {$postType} — {$hint}";
        }

        $styleProfile = [];
        $transcriptExcerpt = null;
        try {
            $project = DB::table('content_projects')
                ->select('id', 'user_id', 'transcript_original')
                ->where('id', $projectId)
                ->first();

            if ($project) {
                $transcriptExcerpt = isset($project->transcript_original)
                    ? (string) $project->transcript_original
                    : null;

                $styleProfile = $project->user_id
                    ? $this->styleProfiles->forUser((string) $project->user_id)
                    : $this->styleProfiles->forProject((string) $project->id);
            }
        } catch (Throwable $e) {
            Log::warning('regenerate_post.context_failed', [
                'post_id' => $postId,
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);
        }

        $draftExcerpt = $existingDraft ? mb_substr($existingDraft, 0, 2000) : null;

        $inference = $this->speakerInference->infer(
            $projectId,
            $userId,
            $styleProfile,
            $transcriptExcerpt,
            $draftExcerpt,
        );

        try {
            // Step 1: regenerate body only
            $response = $this->ai->complete(
                $this->prompts
                    ->regenerateFromInsight(
                        $insightContent,
                        $instructions,
                        $presetDirective,
                        $postType,
                        $styleProfile,
                        $transcriptExcerpt,
                        $inference,
                    )
                    ->withContext($projectId, $userId)
                    ->withMetadata([
                        'postId' => $postId,
                        'mode' => 'body-first',
                    ])
            );
        } catch (Throwable $e) {
            Log::warning('regenerate_post.failed', [
                'post_id' => $postId,
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        $data = $response->data;
        $body = $data['body'] ?? null;

        if (!$body) {
            return null;
        }

        $body = PostContentNormalizer::normalize((string) $body);

        // Step 2: generate hooks and merge best into body
        $content = $body;
        try {
            $content = $this->generateAndMergeHook(
                $projectId,
                $userId,
                $insightContent,
                $body,
                $transcriptExcerpt ? mb_substr($transcriptExcerpt, 0, 1800) : null,
                $styleProfile,
            );
        } catch (Throwable $e) {
            Log::warning('regenerate_post.hook_failed', [
                'post_id' => $postId,
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);
            $content = $body;
        }

        // Step 3: suggest hashtags (3)
        $hashtags = $this->suggestHashtags(
            $projectId,
            $userId,
            $insightContent,
            $content,
            $transcriptExcerpt ? mb_substr($transcriptExcerpt, 0, 1800) : null,
            $styleProfile,
        );

        return [
            'content' => (string) $content,
            'hashtags' => $hashtags,
        ];
    }

    private function generateAndMergeHook(
        string $projectId,
        ?string $userId,
        string $insight,
        string $body,
        ?string $transcriptExcerpt,
        array $styleProfile
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
                    [],
                    null,
                )
                ->withContext($projectId, $userId)
        )->data;

        $hooks = [];
        foreach (($json['hooks'] ?? []) as $hook) {
            if (!is_array($hook)) { continue; }
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
            foreach ($hooks as $h) { if ($h['id'] === $recommendedId) { $recommended = $h; break; } }
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
        if ($hookText === '') { return $body; }

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
        if ($hook === '') { return $body; }
        $existingHook = PostHookInspector::extractHook($body);
        if ($existingHook && trim($existingHook) === $hook) { return $body; }
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
            \Log::warning('regenerate_post.hashtags_failed', [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }
}
