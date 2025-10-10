<?php

namespace App\Domain\Posts\Services;

use App\Exceptions\ValidationException;
use App\Models\ContentProject;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

final class LinkedInPublisher
{
    public function __construct(private readonly PostStateService $state)
    {
    }

    public function publish(Post $post, ContentProject $project, User $user): void
    {
        $this->assertOwnership($post, $project);

        if ($post->status !== 'approved') {
            throw new ValidationException('Post must be approved before publishing');
        }

        $token = $user->linkedin_token;
        if (! $token) {
            throw new ValidationException('LinkedIn is not connected');
        }

        $memberId = $this->resolveLinkedInMemberId($user, $token);

        $payload = [
            'author' => 'urn:li:person:' . $memberId,
            'lifecycleState' => 'PUBLISHED',
            'specificContent' => [
                'com.linkedin.ugc.ShareContent' => [
                    'shareCommentary' => [
                        'text' => mb_substr((string) $post->content, 0, 2999),
                    ],
                    'shareMediaCategory' => 'NONE',
                ],
            ],
            'visibility' => [
                'com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC',
            ],
        ];

        try {
            $response = Http::withToken($token)
                ->withHeaders(['X-Restli-Protocol-Version' => '2.0.0'])
                ->asJson()
                ->post('https://api.linkedin.com/v2/ugcPosts', $payload);
        } catch (Throwable $e) {
            Log::error('linkedin.publish.exception', [
                'error' => $e->getMessage(),
                'post_id' => (string) $post->id,
                'user_id' => (string) $user->id,
            ]);

            $message = app()->environment('local')
                ? 'LinkedIn publish failed: ' . $e->getMessage()
                : 'LinkedIn publish failed';

            throw new ValidationException($message);
        }

        if (! $response->successful()) {
            $status = $response->status();
            $body = $response->body();
            $json = null;

            try {
                $json = $response->json();
            } catch (Throwable) {
                // ignore
            }

            $message = is_array($json)
                ? (string) ($json['message'] ?? $json['error_description'] ?? $json['error'] ?? 'Unknown error')
                : (string) $body;

            $snippet = mb_substr($message, 0, 200);

            Log::warning('linkedin.publish.failed', [
                'status' => $status,
                'response' => $snippet,
                'post_id' => (string) $post->id,
                'user_id' => (string) $user->id,
            ]);

            $flash = in_array($status, [401, 403], true)
                ? 'LinkedIn authorization failed. Please reconnect LinkedIn from Settings.'
                : 'LinkedIn publish failed';

            if (app()->environment('local')) {
                $flash .= " (status {$status})";
                if ($snippet !== '') {
                    $flash .= ": {$snippet}";
                }
            }

            throw new ValidationException($flash);
        }

        $this->state->markPublished((string) $post->id);
    }

    private function resolveLinkedInMemberId(User $user, string $token): string
    {
        $memberId = $user->linkedin_id;

        if ($memberId) {
            return (string) $memberId;
        }

        $response = Http::withToken($token)->get('https://api.linkedin.com/v2/userinfo');

        if (! $response->successful()) {
            throw new ValidationException('Failed to fetch LinkedIn user');
        }

        $memberId = (string) ($response->json('sub') ?? '');

        if ($memberId === '') {
            throw new ValidationException('Failed to resolve LinkedIn user identity');
        }

        DB::table('users')
            ->where('id', $user->id)
            ->update(['linkedin_id' => $memberId]);

        return $memberId;
    }

    private function assertOwnership(Post $post, ContentProject $project): void
    {
        if ((string) $post->project_id !== (string) $project->id) {
            throw new ValidationException('Post does not belong to this project');
        }
    }
}

