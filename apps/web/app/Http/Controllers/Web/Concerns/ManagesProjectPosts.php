<?php

namespace App\Http\Controllers\Web\Concerns;

use App\Models\ContentProject;
use App\Models\Post;
use Illuminate\Http\Request;

trait ManagesProjectPosts
{
    protected function authorizeProject(Request $request, ContentProject $project): void
    {
        if ((string) $project->user_id !== (string) $request->user()->id) {
            abort(403);
        }
    }

    protected function ensurePostOnProject(Post $post, ContentProject $project): void
    {
        if ((string) $post->project_id !== (string) $project->id) {
            abort(404);
        }
    }
}

