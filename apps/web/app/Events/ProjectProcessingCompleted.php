<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectProcessingCompleted implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public string $projectId) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("project.{$this->projectId}")];
    }

    public function broadcastAs(): string
    {
        return 'project.completed';
    }

    /**
     * @return array{projectId: string}
     */
    public function broadcastWith(): array
    {
        return [
            'projectId' => $this->projectId,
        ];
    }
}
