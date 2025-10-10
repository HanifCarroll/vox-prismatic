<?php

namespace App\Http\Controllers\Web;

use App\Domain\Posts\Repositories\PostRepository;
use App\Domain\Posts\Services\PostStateService;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\ManagesProjectPosts;
use App\Jobs\RegeneratePostsJob;
use App\Models\ContentProject;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

class PostDraftsController extends Controller
{
    use ManagesProjectPosts;

    public function __construct(
        private readonly PostStateService $state,
        private readonly PostRepository $posts,
    ) {
    }

    public function update(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);

        $data = $request->validate([
            'content' => ['nullable', 'string'],
            'hashtags' => ['nullable', 'array'],
            'status' => ['nullable', 'string'],
        ]);

        $payload = Arr::only($data, ['content', 'status']);
        $hashtags = array_key_exists('hashtags', $data) && is_array($data['hashtags']) ? $data['hashtags'] : null;

        $this->state->updateDraft((string) $post->id, $payload, $hashtags);

        return back()->with('status', 'Post updated.');
    }

    public function bulkStatus(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['uuid'],
            'status' => ['required', 'string'],
        ]);

        $ids = collect($data['ids'])
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values()
            ->all();

        if (empty($ids)) {
            return back()->with('status', 'No posts updated.');
        }

        $updated = $this->state->bulkUpdateStatus((string) $project->id, $ids, (string) $data['status']);

        if ($updated === 0) {
            return back()->with('status', 'No posts updated.');
        }

        return back()->with('status', 'Bulk status updated.');
    }

    public function bulkRegenerate(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['uuid'],
            'customInstructions' => ['nullable', 'string'],
            'postType' => ['nullable', 'string', Rule::in(\App\Support\PostTypePreset::keys())],
        ]);

        $ids = collect($data['ids'])
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values()
            ->all();

        $custom = isset($data['customInstructions']) ? trim((string) $data['customInstructions']) : null;
        $custom = $custom === '' ? null : $custom;
        $postType = isset($data['postType']) ? strtolower((string) $data['postType']) : null;

        $rows = $this->posts->findManyForProject((string) $project->id, $ids);

        foreach ($rows as $row) {
            RegeneratePostsJob::dispatch(
                (string) $row->id,
                $custom,
                (string) $request->user()->id,
                $postType,
            );
        }

        return back()->with('status', 'Regeneration queued.');
    }
}

