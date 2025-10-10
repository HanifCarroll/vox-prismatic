<?php

namespace App\Http\Controllers\Web;

use App\Domain\Posts\Services\PostSchedulingService;
use App\Exceptions\ValidationException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\ManagesProjectPosts;
use App\Models\ContentProject;
use App\Models\Post;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PostSchedulingController extends Controller
{
    use ManagesProjectPosts;

    public function __construct(private readonly PostSchedulingService $scheduling)
    {
    }

    public function schedule(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);

        $data = $request->validate([
            'scheduledAt' => ['required', 'date'],
        ]);

        try {
            $scheduledAt = Carbon::parse($data['scheduledAt']);
            $this->scheduling->schedule($post, $project, $request->user(), $scheduledAt);

            return back()->with('status', 'Post scheduled.');
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function unschedule(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);

        $this->scheduling->unschedule($post, $project);

        return back()->with('status', 'Post unscheduled.');
    }

    public function bulkUnschedule(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);

        $payload = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['uuid'],
        ]);

        $ids = collect($payload['ids'])
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values()
            ->all();

        if (empty($ids)) {
            return back()->with('status', 'No posts unscheduled.');
        }

        $updated = $this->scheduling->bulkUnschedule($project, $ids);

        if ($updated === 0) {
            return back()->with('status', 'No posts unscheduled.');
        }

        return back()->with('status', 'Posts unscheduled.');
    }

    public function autoSchedule(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);

        try {
            $this->scheduling->autoSchedule($post, $project, $request->user());

            return back()->with('status', 'Post auto-scheduled.');
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function autoScheduleProject(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);

        $payload = $request->validate([
            'ids' => ['nullable', 'array', 'min:1'],
            'ids.*' => ['uuid'],
        ]);

        try {
            $scheduled = $this->scheduling->autoScheduleProject($project, $request->user(), $payload['ids'] ?? null);

            return back()->with('status', "Auto-scheduled {$scheduled} posts.");
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}

