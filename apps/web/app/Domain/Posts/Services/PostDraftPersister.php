<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Data\PostDraft;
use App\Domain\Posts\Repositories\PostRepository;

final class PostDraftPersister
{
    public function __construct(private readonly PostRepository $posts)
    {
    }

    /**
     * @param iterable<int, PostDraft> $drafts
     */
    public function persist(string $projectId, iterable $drafts): int
    {
        $records = [];

        foreach ($drafts as $draft) {
            if (! $draft instanceof PostDraft) {
                continue;
            }

            $records[] = [
                'insight_id' => $draft->insightId,
                'content' => $draft->content,
                'hashtags' => $draft->hashtags,
                'objective' => $draft->objective,
            ];
        }

        if (empty($records)) {
            return 0;
        }

        return $this->posts->insertDrafts($projectId, $records);
    }
}

