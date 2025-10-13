<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class KitNewsletterService
{
    private readonly string $baseUrl;
    private readonly ?string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.kit.base_url', 'https://api.kit.com'), '/');
        $this->apiKey = config('services.kit.api_key');
    }

    public function subscribe(
        string $email,
        ?string $name = null,
        ?string $linkedinUrl = null,
        ?string $referrer = null
    ): void
    {
        if (empty($this->apiKey)) {
            Log::debug('kit.newsletter.missing_configuration', [
                'has_api_key' => !empty($this->apiKey),
            ]);

            return;
        }

        $payload = [
            'email_address' => $email,
        ];

        $firstName = $this->extractFirstName($name);
        if ($firstName !== null) {
            $payload['first_name'] = $firstName;
        }

        $customFields = [];
        if (!empty($linkedinUrl)) {
            $customFields['LinkedIn URL'] = $linkedinUrl;
        }

        if (!empty($customFields)) {
            $payload['fields'] = $customFields;
        }

        if (!empty($referrer)) {
            $payload['referrer'] = $referrer;
        }

        try {
            $response = Http::withHeaders([
                'X-Kit-Api-Key' => $this->apiKey,
            ])->acceptJson()->post(sprintf(
                '%s/v4/subscribers',
                $this->baseUrl
            ), $payload);

            if ($response->failed()) {
                Log::warning('kit.newsletter.subscribe_failed', [
                    'status' => $response->status(),
                    'email' => $email,
                    'body' => $response->json(),
                ]);
            }
        } catch (\Throwable $exception) {
            Log::error('kit.newsletter.subscribe_exception', [
                'email' => $email,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function extractFirstName(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        $trimmed = trim($name);
        if ($trimmed === '') {
            return null;
        }

        return Str::of($trimmed)->before(' ')->trim()->value() ?: $trimmed;
    }
}
