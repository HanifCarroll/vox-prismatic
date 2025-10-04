<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectProcessingProgress implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public string $projectId,
        public string $step,
        public int $progress,
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
        return 'project.progress';
    }

    /**
     * @return array{projectId: string, step: string, progress: int}
     */
    public function broadcastWith(): array
    {
        return [
            'projectId' => $this->projectId,
            'step' => $this->step,
            'progress' => $this->progress,
        ];
    }
}
