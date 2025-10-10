<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\AiRequest;

class TranscriptPromptBuilder
{
    public function normalization(string $transcript, array $metadata = ['mode' => 'single']): AiRequest
    {
        $prompt = "You are a text cleaner for meeting transcripts.\n\n".
            "Clean the transcript by:\n- Removing timestamps and system messages\n- Removing filler words (um, uh) and repeated stutters unless meaningful\n- Converting to plain text (no HTML)\n- Normalizing spaces and line breaks for readability\n- IMPORTANT: If speaker labels like \"Me:\" and \"Them:\" are present, PRESERVE them verbatim at the start of each line. Do not invent or rename speakers.\n\n".
            "Return JSON { \"transcript\": string, \"length\": number } where length is the character count of transcript.\n\nTranscript:\n\"\"\"\n{$transcript}\n\"\"\"";

        return new AiRequest(
            action: 'transcript.normalize',
            prompt: $prompt,
            schema: [
                'type' => 'object',
                'properties' => [
                    'transcript' => ['type' => 'string'],
                    'length' => ['type' => 'integer'],
                ],
                'required' => ['transcript', 'length'],
                'additionalProperties' => false,
            ],
            temperature: null,
            metadata: $metadata,
            expectedBytes: strlen($transcript),
        );
    }

    public function title(string $transcript): AiRequest
    {
        $prompt = "You are titling a cleaned meeting transcript.\n\n".
            "Rules:\n".
            "- Return JSON { \"title\": string }\n".
            "- 4–9 words, Title Case, no quotes/emojis/hashtags.\n".
            "- No trailing punctuation.\n".
            "- Use the same language as the transcript.\n\n".
            "Transcript:\n\"\"\"\n{$transcript}\n\"\"\"";

        return new AiRequest(
            action: 'transcript.title',
            prompt: $prompt,
            schema: [
                'type' => 'object',
                'properties' => [
                    'title' => ['type' => 'string'],
                ],
                'required' => ['title'],
                'additionalProperties' => false,
            ],
            temperature: null,
            metadata: ['mode' => 'title'],
        );
    }
}
