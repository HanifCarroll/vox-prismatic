<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Data\PostDraft;
use App\Domain\Posts\Support\HashtagNormalizer;
use App\Services\Ai\Prompts\PostPromptBuilder;
use App\Services\AiService;
use Illuminate\Support\Facades\Log;
use Throwable;

final class PostDraftGenerator
{
    public function __construct(
        private readonly AiService $ai,
        private readonly PostPromptBuilder $prompts,
    ) {
    }

    /**
     * @param array<string, mixed> $styleProfile
     */
    public function generateFromInsight(
        string $projectId,
        string $insightId,
        string $insightContent,
        ?string $insightQuote,
        ?string $supportingContext,
        array $styleProfile,
        string $objective,
        ?string $userId = null,
    ): ?PostDraft {
        try {
            $response = $this->ai->complete(
                $this->prompts
                    ->draftFromInsight($insightContent, $insightQuote, $supportingContext, $styleProfile, $objective)
                    ->withContext($projectId, $userId)
                    ->withMetadata([
                        'insightId' => $insightId,
                        'objective' => $objective,
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
        $content = isset($data['content']) ? (string) $data['content'] : null;

        if (! $content) {
            return null;
        }

        $hashtags = isset($data['hashtags']) && is_iterable($data['hashtags'])
            ? HashtagNormalizer::normalize($data['hashtags'])
            : [];

        return new PostDraft(
            insightId: $insightId,
            content: $content,
            hashtags: $hashtags,
            objective: $objective,
        );
    }
}

