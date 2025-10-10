<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KitNewsletterService
{
    private readonly string $baseUrl;
    private readonly ?string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.kit.base_url', 'https://api.kit.com'), '/');
        $this->apiKey = config('services.kit.api_key');
    }

    public function subscribe(string $email, ?string $referrer = null): void
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
}
