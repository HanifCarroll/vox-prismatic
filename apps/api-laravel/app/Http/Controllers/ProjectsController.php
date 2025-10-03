<?php

namespace App\Http\Controllers;

use App\Exceptions\ForbiddenException;
use App\Exceptions\NotFoundException;
use App\Models\ContentProject;
use App\Models\Insight;
use App\Models\Post as PostModel;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

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

    public function create(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable','string','max:255'],
            'transcript' => ['required','string'],
        ]);
        $user = $request->user();
        $id = (string) Str::uuid();
        $now = now();
        $rawTitle = $data['title'] ?? null;
        $title = is_string($rawTitle) && trim($rawTitle) !== '' ? trim($rawTitle) : 'Untitled Project';
        DB::table('content_projects')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'title' => $title,
            'source_url' => null,
            'transcript_original' => trim($data['transcript']),
            'transcript_cleaned' => null,
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        // Dispatch processing job immediately
        $job = new \App\Jobs\ProcessProjectJob($id);
        dispatch($job);

        $p = ContentProject::query()->where('id', $id)->firstOrFail();
        Log::info('projects.create', [
            'project_id' => $id,
            'user_id' => $user->id,
        ]);
        Log::info('projects.process.queued', [
            'project_id' => $id,
            'user_id' => $user->id,
            'source' => 'create',
        ]);
        return response()->json(['project' => $this->toEnvelope($p)], 201);
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

        // Check if already processing (including queued or actively running)
        $activeSteps = ['queued', 'started', 'normalize_transcript', 'generate_insights', 'insights_ready', 'posts_ready'];
        if ($p->current_stage === 'processing' && in_array($p->processing_step, $activeSteps, true)) {
            return response()->json([
                'error' => 'Project is already being processed',
                'code' => 'ALREADY_PROCESSING',
                'status' => 409,
            ], 409);
        }

        // Set to processing state and reset progress
        DB::table('content_projects')->where('id', $id)->update([
            'current_stage' => 'processing',
            'processing_progress' => 0,
            'processing_step' => 'queued',
            'updated_at' => now(),
        ]);

        // Dispatch the job
        $job = new \App\Jobs\ProcessProjectJob($id);
        dispatch($job);

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

    public function processStream(Request $request, string $id)
    {
        $p = ContentProject::query()->where('id',$id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');

        $logSseEnv = env('LOG_SSE_PROGRESS');
        $logSse = $logSseEnv === null ? (config('app.env') !== 'production') : filter_var($logSseEnv, FILTER_VALIDATE_BOOLEAN);
        if ($logSse) {
            Log::info('projects.process.stream.connect', [
                'project_id' => $id,
                'user_id' => $request->user()->id,
            ]);
        }

        return response()->stream(function () use ($id, $logSse) {
            set_time_limit(0);
            $send = function(string $event, $data = null) {
                echo "event: {$event}\n";
                if (!is_null($data)) echo 'data: '.(is_string($data)?$data:json_encode($data))."\n";
                echo "\n";
                @ob_flush(); @flush();
            };
            $heartbeatEvery = 15; $lastBeat = time();
            $tick = function() use (&$lastBeat, $heartbeatEvery, $send) {
                if (time() - $lastBeat >= $heartbeatEvery) { $send('ping', ['t' => time()*1000]); $lastBeat = time(); }
            };
            try {
                $row = DB::table('content_projects')->select('current_stage','processing_progress','processing_step')->where('id',$id)->first();
                if (!$row) { $send('error', ['message'=>'Unable to load status']); return; }
                $initial = ['step' => $row->processing_step ?? 'snapshot', 'progress' => (int)($row->processing_progress ?? 0)];
                $send('progress', $initial);
                if ($logSse) { Log::info('projects.process.progress', ['project_id' => $id, 'step' => $initial['step'], 'progress' => $initial['progress']]); }
                // If the job has already failed, emit an error and close the stream
                if (($row->processing_step ?? null) === 'error') { $send('error', ['message' => 'Processing failed']); return; }
                if ($row->current_stage !== 'processing') { $send('complete', ['progress'=>100]); if ($logSse) { Log::info('projects.process.complete', ['project_id' => $id]); } return; }
                $lastProgress = (int)($row->processing_progress ?? 0);
                $lastStep = $row->processing_step ?? null;
                // Keep polling until stage changes (job timeout is 10 min, give 12 min max)
                $maxIterations = 720; // 12 minutes at 1s intervals
                for ($i=0; $i<$maxIterations; $i++) {
                    $tick();
                    $s = DB::table('content_projects')->select('current_stage','processing_progress','processing_step')->where('id',$id)->first();
                    if (!$s) { $send('error', ['message'=>'Status polling failed']); if ($logSse) { Log::error('projects.process.error', ['project_id' => $id, 'reason' => 'poll_failed']); } break; }
                    // Detect failure state and emit error event
                    if (($s->processing_step ?? null) === 'error') { $send('error', ['message' => 'Processing failed']); if ($logSse) { Log::error('projects.process.error', ['project_id' => $id, 'reason' => 'processing_failed']); } break; }
                    if ($s->current_stage !== 'processing') { $send('complete', ['progress'=>100]); if ($logSse) { Log::info('projects.process.complete', ['project_id' => $id]); } break; }
                    $prog = (int)($s->processing_progress ?? 0);
                    $step = $s->processing_step ?? null;
                    if ($prog !== $lastProgress || $step !== $lastStep) {
                        $payload = ['step' => $step ?? 'processing', 'progress' => $prog];
                        $send('progress', $payload);
                        if ($logSse) { Log::info('projects.process.progress', ['project_id' => $id, 'step' => $payload['step'], 'progress' => $payload['progress']]); }
                        $lastProgress = $prog; $lastStep = $step;
                    }
                    sleep(1);
                }
            } catch (\Throwable $e) {
                $send('error', ['message' => 'Unable to start status stream']);
                if ($logSse) { Log::error('projects.process.error', ['project_id' => $id, 'reason' => 'stream_failed', 'error' => $e->getMessage()]); }
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform, must-revalidate',
            'Pragma' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
