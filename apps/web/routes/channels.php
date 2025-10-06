<?php

use App\Models\ContentProject;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{userId}', function ($user, string $userId): bool {
    return (string) $user->id === (string) $userId;
});

Broadcast::channel('project.{projectId}', function ($user, string $projectId): bool {
    $project = ContentProject::query()
        ->select(['id', 'user_id'])
        ->where('id', $projectId)
        ->first();

    if (!$project) {
        return false;
    }

    return (string) $project->user_id === (string) $user->id;
});
