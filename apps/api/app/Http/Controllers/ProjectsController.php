<?php

namespace App\Http\Controllers;

use App\Domain\Projects\Actions\CreateProjectAction;
use App\Events\ProjectProcessingProgress;
use App\Exceptions\ForbiddenException;
use App\Exceptions\NotFoundException;
use App\Jobs\Projects\CleanTranscriptJob;
use App\Jobs\Projects\GenerateInsightsJob;
use App\Jobs\Projects\GeneratePostsJob;
use App\Models\ContentProject;
use App\Models\Insight;
use App\Models\Post as PostModel;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * @tags Projects
 */
class ProjectsController extends Controller
{
    private function toEnvelope(ContentProject $p): array
    {
        return [
            'id' => (string) $p->id,
            'userId' => (string) $p->user_id,
            'title' => $p->title,
            'sourceUrl' => $p->source_url,
            'currentStage' => $p->current_stage,
            'processingProgress' => $p->processing_progress,
            'processingStep' => $p->processing_step,
            'createdAt' => $p->created_at,
            'updatedAt' => $p->updated_at,
        ];
    }

    public function create(Request $request, CreateProjectAction $createProject): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable','string','max:255'],
            'transcript' => ['required','string'],
        ]);
        $user = $request->user();

        $project = $createProject->execute(
            (string) $user->id,
            $data['transcript'],
            $data['title'] ?? null,
            null,
            'create',
        );

        return response()->json(['project' => $this->toEnvelope($project)], 201);
    }

    public function list(Request $request): JsonResponse
    {
        $data = $request->validate([
            'page' => ['nullable','integer','min:1'],
            'pageSize' => ['nullable','integer','min:1','max:100'],
            'stage' => ['nullable'],
            'q' => ['nullable','string'],
        ]);
        $page = (int) ($data['page'] ?? 1);
        $pageSize = (int) ($data['pageSize'] ?? 10);
        $stages = $data['stage'] ?? null; // string or array
        $q = $data['q'] ?? null;
        $qb = ContentProject::query()->where('user_id', $request->user()->id);
        if ($stages) {
            $arr = is_array($stages) ? $stages : [$stages];
            $qb->whereIn('current_stage', $arr);
        }
        if ($q) {
            $qb->where('title', 'ilike', '%'.trim($q).'%');
        }
        $total = (clone $qb)->count();
        $items = $qb->orderByDesc('created_at')->forPage($page, $pageSize)->get()->map(fn($p) => $this->toEnvelope($p))->values();
        return response()->json(['items' => $items, 'meta' => ['page' => $page, 'pageSize' => $pageSize, 'total' => $total]]);
    }

    public function get(Request $request, string $id): JsonResponse
    {
        $p = ContentProject::query()->where('id', $id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');
        return response()->json(['project' => $this->toEnvelope($p)]);
    }

    public function status(Request $request, string $id): JsonResponse
    {
        $p = ContentProject::query()->select(['id','user_id','current_stage','processing_progress','processing_step'])->where('id', $id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');
        return response()->json(['project' => [
            'currentStage' => $p->current_stage,
            'processingProgress' => $p->processing_progress,
            'processingStep' => $p->processing_step,
        ]]);
    }

    public function updateStage(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['nextStage' => ['required','in:processing,posts,ready']]);
        $p = ContentProject::query()->where('id', $id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');
        $order = ['processing','posts','ready'];
        $currIdx = array_search($p->current_stage, $order, true);
        $nextIdx = array_search($data['nextStage'], $order, true);
        if ($nextIdx !== $currIdx + 1) {
            return response()->json(['error' => 'Invalid stage transition', 'code' => 'INVALID_TRANSITION', 'status' => 422], 422);
        }
        $prevStage = $p->current_stage;
        $p->current_stage = $data['nextStage'];
        $p->updated_at = now();
        $p->save();
        Log::info('projects.stage.update', [
            'project_id' => $id,
            'from' => $prevStage,
            'to' => $p->current_stage,
        ]);
        return response()->json(['project' => $this->toEnvelope($p)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable','string','max:255'],
            'transcript' => ['nullable','string'],
        ]);
        $p = ContentProject::query()->where('id',$id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');
        $dirty = false; $changed = [];
        if (array_key_exists('title', $data)) { $p->title = $data['title']; $dirty = true; $changed[] = 'title'; }
        if (array_key_exists('transcript', $data)) { $p->transcript_original = $data['transcript']; $dirty = true; $changed[] = 'transcript'; }
        if ($dirty) { $p->updated_at = now(); $p->save(); Log::info('projects.update', ['project_id' => $id, 'fields' => $changed]); }
        return response()->json(['project' => $this->toEnvelope($p)]);
    }

    public function delete(Request $request, string $id)
    {
        $p = ContentProject::query()->where('id',$id)->first();
        if ($p && $p->user_id === $request->user()->id) {
            $p->delete();
            Log::info('projects.delete', ['project_id' => $id, 'user_id' => $request->user()->id]);
        }
        return response()->noContent();
    }

    public function process(Request $request, string $id): JsonResponse
    {
        $p = ContentProject::query()->where('id', $id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');

        $activeSteps = ['queued', 'cleaning', 'insights', 'posts'];
        if ($p->current_stage === 'processing' && in_array($p->processing_step, $activeSteps, true)) {
            return response()->json([
                'error' => 'Project is already being processed',
                'code' => 'ALREADY_PROCESSING',
                'status' => 409,
            ], 409);
        }

        $postCount = (int) DB::table('posts')->where('project_id', $id)->count();
        if ($postCount > 0) {
            Log::info('projects.process.skipped_posts_exist', [
                'project_id' => $id,
                'user_id' => $request->user()->id,
                'post_count' => $postCount,
            ]);
            return response()->json([
                'queued' => false,
                'alreadyGenerated' => true,
                'project' => [
                    'currentStage' => $p->current_stage,
                    'processingStep' => $p->processing_step,
                    'processingProgress' => $p->processing_progress,
                ],
            ], 202);
        }

        DB::table('content_projects')->where('id', $id)->update([
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'updated_at' => now(),
        ]);

        event(new ProjectProcessingProgress($id, 'queued', 0));

        Bus::chain([
            new CleanTranscriptJob($id),
            new GenerateInsightsJob($id),
            new GeneratePostsJob($id),
        ])->onQueue('processing')->dispatch();

        Log::info('projects.process.queued', [
            'project_id' => $id,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'queued' => true,
            'project' => [
                'currentStage' => 'processing',
                'processingStep' => 'queued',
                'processingProgress' => 0,
            ],
        ], 202);
    }

}
