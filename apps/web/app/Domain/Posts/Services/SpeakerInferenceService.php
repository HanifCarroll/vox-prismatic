<?php

namespace App\Domain\Posts\Services;

use App\Services\Ai\AiResponse;
use App\Services\Ai\Prompts\SpeakerInferencePromptBuilder;
use App\Services\AiService;
use Illuminate\Support\Facades\Log;
use Throwable;

final class SpeakerInferenceService
{
    public function __construct(
        private readonly AiService $ai,
        private readonly SpeakerInferencePromptBuilder $prompts,
    ) {
    }

    /**
     * @param array<string, mixed> $styleProfile
     * @return array{summary: string, confidence: float, recommendedVoice: string, evidence: array<int, string>}|null
     */
    public function infer(
        string $projectId,
        ?string $userId,
        array $styleProfile,
        ?string $transcriptExcerpt,
        ?string $existingDraft = null,
    ): ?array {
        $transcriptExcerpt = $this->cleanTranscript($transcriptExcerpt);
        if ($transcriptExcerpt === null || empty($styleProfile)) {
            return null;
        }

        try {
            $response = $this->ai->complete(
                $this->prompts
                    ->infer($styleProfile, $transcriptExcerpt, $existingDraft)
                    ->withContext($projectId, $userId)
            );
        } catch (Throwable $e) {
            Log::warning('posts.speaker_inference.failed', [
                'projectId' => $projectId,
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        return $this->mapResponse($response);
    }

    private function cleanTranscript(?string $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        return mb_substr($trimmed, 0, 4000);
    }

    /**
     * @return array{summary: string, confidence: float, recommendedVoice: string, evidence: array<int, string>}|null
     */
    private function mapResponse(AiResponse $response): ?array
    {
        $data = $response->data ?? null;
        if (!is_array($data)) {
            return null;
        }

        $summary = isset($data['authorSummary']) ? trim((string) $data['authorSummary']) : '';
        if ($summary === '') {
            return null;
        }

        $confidence = isset($data['confidence']) ? (float) $data['confidence'] : 0.0;
        $recommendedVoice = isset($data['recommendedVoice']) ? (string) $data['recommendedVoice'] : 'first_person';
        if (!in_array($recommendedVoice, ['first_person', 'neutral_third_person'], true)) {
            $recommendedVoice = 'first_person';
        }

        $evidence = [];
        if (isset($data['evidence']) && is_iterable($data['evidence'])) {
            foreach ($data['evidence'] as $item) {
                if (!is_string($item)) {
                    continue;
                }
                $clip = trim($item);
                if ($clip === '') {
                    continue;
                }
                $evidence[] = mb_substr($clip, 0, 240);
                if (count($evidence) >= 5) {
                    break;
                }
            }
        }

        return [
            'summary' => mb_substr($summary, 0, 500),
            'confidence' => max(0.0, min(1.0, $confidence)),
            'recommendedVoice' => $recommendedVoice,
            'evidence' => $evidence,
        ];
    }
}
