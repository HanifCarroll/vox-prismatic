<?php

namespace App\Http\Controllers\Web;

use App\Domain\Projects\Actions\CancelProjectProcessingAction;
use App\Domain\Projects\Actions\CreateProjectAction;
use App\Domain\Projects\Actions\EnqueueProjectProcessingAction;
use App\Exceptions\ConflictException;
use App\Http\Controllers\Controller;
use App\Models\ContentProject;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectsController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string'],
            'stage' => ['nullable', 'string'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $stageFilters = trim((string) ($validated['stage'] ?? ''));
        $stages = $stageFilters === ''
            ? []
            : array_values(array_filter(explode(',', $stageFilters)));

        $projects = ContentProject::query()
            ->where('user_id', $request->user()->id)
            ->when($search !== '', function ($query) use ($search) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $search);
                $query->where('title', 'ilike', '%'.$escaped.'%');
            })
            ->when(count($stages) > 0, function ($query) use ($stages) {
                $query->whereIn('current_stage', $stages);
            })
            ->orderByDesc('created_at')
            ->paginate(perPage: 20)
            ->withQueryString()
            ->through(fn (ContentProject $project) => $this->projectListPayload($project));

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
            'filters' => [
                'search' => $search,
                'stages' => $stages,
            ],
            'stageOptions' => [
                ['value' => 'processing', 'label' => 'Processing'],
                ['value' => 'posts', 'label' => 'Posts'],
                ['value' => 'ready', 'label' => 'Ready'],
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Projects/Create');
    }

    public function store(Request $request, CreateProjectAction $createProject): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'transcript' => ['required', 'string', 'min:10'],
        ], [], [
            'transcript' => 'transcript',
        ]);

        $title = $validated['title'] ?? null;
        $title = $title !== null && trim($title) !== ''
            ? Str::of($title)->trim()->value()
            : null;

        $project = $createProject->execute(
            (string) $request->user()->id,
            $validated['transcript'],
            $title,
            null,
            'create_inertia',
        );

        return redirect()
            ->route('projects.show.tab', ['project' => $project, 'tab' => 'posts'])
            ->with('status', 'Project created.');
    }

    public function show(Request $request, ContentProject $project): Response
    {
        $this->authorizeProject($request, $project);

        // Tab comes from path segment
        $tab = (string) ($request->route('tab') ?? 'transcript');
        $allowedTabs = ['transcript', 'posts'];
        if (! in_array($tab, $allowedTabs, true)) {
            $tab = 'transcript';
        }

        $prefRow = \App\Models\UserSchedulePreference::query()->where('user_id', $request->user()->id)->first();
        $preferences = [
            'timezone' => $prefRow?->timezone ?? 'UTC',
            'leadTimeMinutes' => (int) ($prefRow?->lead_time_minutes ?? 30),
        ];

        return Inertia::render('Projects/Show', [
            'project' => fn () => $this->projectDetailPayload($project->fresh()),
            'posts' => fn () => $this->postsPayload($project->id),
            'channels' => [
                'project' => 'project.' . $project->id,
                'user' => 'user.' . $request->user()->id,
            ],
            'linkedIn' => [ 'connected' => (bool) $request->user()->linkedin_token ],
            'preferences' => $preferences,
            'initialTab' => $tab,
        ]);
    }

    public function update(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'transcript' => ['required', 'string', 'min:10'],
        ], [], [
            'transcript' => 'transcript',
        ]);

        $title = $validated['title'] ?? null;
        $title = $title !== null && trim($title) !== ''
            ? Str::of($title)->trim()->value()
            : null;

        DB::table('content_projects')->where('id', $project->id)->update([
            'title' => $title ?? 'Untitled Project',
            'transcript_original' => trim($validated['transcript']),
            'updated_at' => now(),
        ]);

        return back()->with('status', 'Project details saved.');
    }

    public function destroy(
        Request $request,
        ContentProject $project,
        CancelProjectProcessingAction $cancelProcessing,
    ): RedirectResponse
    {
        $this->authorizeProject($request, $project);

        $cancelProcessing->execute($project);

        $project->delete();

        return redirect()->route('projects.index')->with('status', 'Project deleted.');
    }

    public function process(
        Request $request,
        ContentProject $project,
        EnqueueProjectProcessingAction $enqueue,
    ): RedirectResponse {
        $this->authorizeProject($request, $project);

        try {
            $project->refresh();
            $enqueue->execute($project);
        } catch (ConflictException $exception) {
            throw ValidationException::withMessages([
                'processing' => $exception->getMessage(),
            ]);
        }

        return back()->with('status', 'Processing started.');
    }

    public function updateStage(Request $request, ContentProject $project)
    {
        $this->authorizeProject($request, $project);

        $data = $request->validate(['nextStage' => ['required','in:processing,posts,ready']]);

        $order = ['processing','posts','ready'];
        $currIdx = array_search($project->current_stage, $order, true);
        $nextIdx = array_search($data['nextStage'], $order, true);
        if ($nextIdx !== $currIdx + 1) {
            return response()->json(['error' => 'Invalid stage transition'], 422);
        }

        $prev = $project->current_stage;
        $project->current_stage = $data['nextStage'];
        $project->updated_at = now();
        $project->save();

        return response()->json([
            'project' => [
                'id' => (string) $project->id,
                'title' => $project->title ?? 'Untitled Project',
                'currentStage' => $project->current_stage,
                'processingProgress' => (int) ($project->processing_progress ?? 0),
                'processingStep' => $project->processing_step,
                'updatedAt' => optional($project->updated_at)?->toIso8601String(),
                'previousStage' => $prev,
            ],
        ]);
    }

    private function authorizeProject(Request $request, ContentProject $project): void
    {
        if ((string) $project->user_id !== (string) $request->user()->id) {
            abort(403);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function projectListPayload(ContentProject $project): array
    {
        return [
            'id' => (string) $project->id,
            'title' => $project->title ?? 'Untitled Project',
            'currentStage' => $project->current_stage,
            'processingProgress' => (int) ($project->processing_progress ?? 0),
            'processingStep' => $project->processing_step,
            'createdAt' => optional($project->created_at)?->toIso8601String(),
            'updatedAt' => optional($project->updated_at)?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function projectDetailPayload(ContentProject $project): array
    {
        return [
            'id' => (string) $project->id,
            'title' => $project->title ?? 'Untitled Project',
            'currentStage' => $project->current_stage,
            'processingProgress' => (int) ($project->processing_progress ?? 0),
            'processingStep' => $project->processing_step,
            'transcript' => (string) ($project->transcript_original ?? ''),
            'createdAt' => optional($project->created_at)?->toIso8601String(),
            'updatedAt' => optional($project->updated_at)?->toIso8601String(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function postsPayload(string $projectId): array
    {
        return Post::query()
            ->where('project_id', $projectId)
            // Keep order stable across updates: primarily by newest first,
            // and tie-break deterministically by id to avoid reshuffling when rows share the same timestamp
            ->orderByDesc('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (Post $post) {
                $hashtags = is_array($post->hashtags) ? array_values(array_filter($post->hashtags)) : [];

                return [
                    'id' => (string) $post->id,
                    'content' => $post->content,
                    'status' => $post->status,
                    'hashtags' => $hashtags,
                    'platform' => $post->platform,
                    'publishedAt' => optional($post->published_at)?->toIso8601String(),
                    'scheduledAt' => optional($post->scheduled_at)?->toIso8601String(),
                    'scheduleStatus' => $post->schedule_status,
                    'scheduleError' => $post->schedule_error,
                    'scheduleAttemptedAt' => optional($post->schedule_attempted_at)?->toIso8601String(),
                    'scheduleNextAttemptAt' => optional($post->schedule_next_attempt_at)?->toIso8601String(),
                    'scheduleAttempts' => (int) ($post->schedule_attempts ?? 0),
                    'createdAt' => optional($post->created_at)?->toIso8601String(),
                    'updatedAt' => optional($post->updated_at)?->toIso8601String(),
                ];
            })
            ->all();
    }
}
