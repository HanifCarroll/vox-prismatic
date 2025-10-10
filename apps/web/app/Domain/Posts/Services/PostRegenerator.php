<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Support\HashtagNormalizer;
use App\Services\Ai\Prompts\PostPromptBuilder;
use App\Services\AiService;
use App\Support\PostTypePreset;
use Illuminate\Support\Facades\Log;
use Throwable;

final class PostRegenerator
{
    public function __construct(
        private readonly AiService $ai,
        private readonly PostPromptBuilder $prompts,
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
    ): ?array {
        $postType = $postType ? strtolower($postType) : null;
        $instructions = PostTypePreset::mergeCustomInstructions($customInstructions, $postType);
        $presetDirective = '';

        if ($postType && ($hint = PostTypePreset::hint($postType))) {
            $presetDirective = "\nPreset target: {$postType} — {$hint}";
        }

        try {
            $response = $this->ai->complete(
                $this->prompts
                    ->regenerateFromInsight($insightContent, $instructions, $presetDirective, $postType)
                    ->withContext($projectId, $userId)
                    ->withMetadata([
                        'postId' => $postId,
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
        $content = $data['content'] ?? null;

        if (! $content) {
            return null;
        }

        $hashtags = isset($data['hashtags']) && is_iterable($data['hashtags'])
            ? HashtagNormalizer::normalize($data['hashtags'])
            : [];

        return [
            'content' => (string) $content,
            'hashtags' => $hashtags,
        ];
    }
}

