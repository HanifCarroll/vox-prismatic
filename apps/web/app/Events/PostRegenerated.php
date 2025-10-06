<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PostRegenerated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    /**
     * @param array<string, mixed> $post
     */
    public function __construct(
        public string $userId,
        public array $post,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel("user.{$this->userId}")];
        $projectId = $this->post['projectId'] ?? null;
        if (is_string($projectId) && $projectId !== '') {
            $channels[] = new PrivateChannel("project.{$projectId}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'post.regenerated';
    }

    /**
     * @return array{post: array<string, mixed>}
     */
    public function broadcastWith(): array
    {
        return [
            'post' => $this->post,
        ];
    }
}
