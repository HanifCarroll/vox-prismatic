<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectProcessingFailed implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public string $projectId,
        public ?string $message = null,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("project.{$this->projectId}")];
    }

    public function broadcastAs(): string
    {
        return 'project.failed';
    }

    /**
     * @return array{projectId: string, message?: string}
     */
    public function broadcastWith(): array
    {
        $payload = ['projectId' => $this->projectId];
        if ($this->message !== null && $this->message !== '') {
            $payload['message'] = $this->message;
        }

        return $payload;
    }
}
