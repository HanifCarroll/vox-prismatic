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
            'processing_step' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $p = ContentProject::query()->where('id', $id)->firstOrFail();
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
        $p->current_stage = $data['nextStage'];
        $p->updated_at = now();
        $p->save();
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
        $dirty = false;
        if (array_key_exists('title', $data)) { $p->title = $data['title']; $dirty = true; }
        if (array_key_exists('transcript', $data)) { $p->transcript_original = $data['transcript']; $dirty = true; }
        if ($dirty) { $p->updated_at = now(); $p->save(); }
        return response()->json(['project' => $this->toEnvelope($p)]);
    }

    public function delete(Request $request, string $id)
    {
        $p = ContentProject::query()->where('id',$id)->first();
        if ($p && $p->user_id === $request->user()->id) {
            $p->delete();
        }
        return response()->noContent();
    }

    public function process(Request $request, string $id)
    {
        $p = ContentProject::query()->where('id',$id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');
        $ai = app(AiService::class);

        return response()->stream(function () use ($p, $ai, $request) {
            $send = function(string $event, $data = null) {
                echo "event: {$event}\n";
                if (!is_null($data)) {
                    echo 'data: '.(is_string($data) ? $data : json_encode($data))."\n";
                }
                echo "\n";
                @ob_flush(); @flush();
            };

            $id = (string) $p->id;
            $stepDelayUs = app()->environment('testing') ? 0 : 300000;
            $finished = false;
            $heartbeatEvery = 15; $lastBeat = time();
            $tick = function() use (&$lastBeat, $heartbeatEvery, $send) {
                if (time() - $lastBeat >= $heartbeatEvery) { $send('ping', ['t' => time()*1000]); $lastBeat = time(); }
            };

            try {
                $send('started', ['progress' => 0]);
                DB::table('content_projects')->where('id',$id)->update(['processing_progress'=>0,'processing_step'=>'started','updated_at'=>now()]);
                usleep($stepDelayUs); $tick();

                // Load current transcript
                $row = DB::table('content_projects')->select('transcript_original','transcript_cleaned')->where('id',$id)->first();
                $original = (string) ($row->transcript_original ?? '');
                $cleaned = $row->transcript_cleaned;

                // Normalize transcript if needed
                $send('progress', ['step' => 'normalize_transcript', 'progress' => 10]);
                DB::table('content_projects')->where('id',$id)->update(['processing_progress'=>10,'processing_step'=>'normalize_transcript']);
                usleep($stepDelayUs); $tick();
                if (!$cleaned || trim($cleaned) === '') {
                    $out = $ai->normalizeTranscript($original);
                    $cleaned = $out['transcript'] ?? $original;
                    DB::table('content_projects')->where('id',$id)->update(['transcript_cleaned'=>$cleaned,'updated_at'=>now()]);
                }

                // Generate insights
                $send('progress', ['step' => 'generate_insights', 'progress' => 40]);
                DB::table('content_projects')->where('id',$id)->update(['processing_progress'=>40,'processing_step'=>'generate_insights']);
                usleep($stepDelayUs); $tick();
                $insightsPrompt = "Extract 5-10 crisp, high-signal insights from the transcript. Return JSON { \"insights\": [{ \"content\": string }] }. Transcript:\n\"\"\"\n{$cleaned}\n\"\"\"";
                $insightsJson = $ai->generateJson(['prompt'=>$insightsPrompt,'temperature'=>0.2,'model'=>AiService::FLASH_MODEL,'action'=>'insights.generate']);
                $items = [];
                if (isset($insightsJson['insights']) && is_array($insightsJson['insights'])) {
                    foreach ($insightsJson['insights'] as $it) {
                        if (!is_array($it) || empty($it['content'])) continue;
                        $items[] = ['id'=>(string) Str::uuid(),'project_id'=>$id,'content'=>trim((string)$it['content']),'quote'=>null,'score'=>null,'is_approved'=>false,'created_at'=>now(),'updated_at'=>now()];
                    }
                }
                if ($items) { DB::table('insights')->insert($items); }
                $send('insights_ready', ['count' => count($items), 'progress' => 60]);
                DB::table('content_projects')->where('id',$id)->update(['processing_progress'=>60,'processing_step'=>'insights_ready']);
                usleep($stepDelayUs); $tick();

                // Generate posts from insights
                $insights = DB::table('insights')->select('id','content')->where('project_id',$id)->orderBy('id')->get();
                $createdPosts = [];
                foreach ($insights as $ins) {
                    $prompt = "Write a LinkedIn post (no emoji unless needed) based on this insight. Keep to 4-6 short paragraphs. Return JSON { \"content\": string }.\n\nInsight:\n".$ins->content;
                    try {
                        $postJson = $ai->generateJson(['prompt'=>$prompt,'temperature'=>0.4,'model'=>AiService::FLASH_MODEL,'action'=>'post.generate']);
                        $content = isset($postJson['content']) ? (string)$postJson['content'] : null;
                        if ($content) {
                            $createdPosts[] = [
                                'id' => (string) Str::uuid(),
                                'project_id' => $id,
                                'insight_id' => (string)$ins->id,
                                'content' => $content,
                                'platform' => 'LinkedIn',
                                'status' => 'pending',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    } catch (\Throwable $e) { /* continue */ }
                }
                if ($createdPosts) {
                    DB::table('posts')->insert($createdPosts);
                }
                $send('posts_ready', ['count' => count($createdPosts), 'progress' => 90]);
                DB::table('content_projects')->where('id',$id)->update(['processing_progress'=>90,'processing_step'=>'posts_ready']);
                usleep($stepDelayUs); $tick();

                // Complete
                DB::table('content_projects')->where('id',$id)->update(['current_stage'=>'posts','processing_progress'=>100,'processing_step'=>'complete','updated_at'=>now()]);
                $send('complete', ['progress' => 100]);
                $finished = true;
            } catch (\Throwable $e) {
                Log::error('project_process_failed', ['project'=>$p->id,'error'=>$e->getMessage()]);
                DB::table('content_projects')->where('id',(string)$p->id)->update(['processing_step'=>'error','updated_at'=>now()]);
                $send('error', ['message' => 'Processing failed']);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
        ]);
    }

    public function processStream(Request $request, string $id)
    {
        $p = ContentProject::query()->where('id',$id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');

        return response()->stream(function () use ($id) {
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
                $send('progress', ['step' => $row->processing_step ?? 'snapshot', 'progress' => (int)($row->processing_progress ?? 0)]);
                if ($row->current_stage !== 'processing') { $send('complete', ['progress'=>100]); return; }
                $lastProgress = (int)($row->processing_progress ?? 0);
                $lastStep = $row->processing_step ?? null;
                for ($i=0; $i<120; $i++) { // ~2 minutes if 1s sleep
                    $tick();
                    $s = DB::table('content_projects')->select('current_stage','processing_progress','processing_step')->where('id',$id)->first();
                    if (!$s) { $send('error', ['message'=>'Status polling failed']); break; }
                    if ($s->current_stage !== 'processing') { $send('complete', ['progress'=>100]); break; }
                    $prog = (int)($s->processing_progress ?? 0);
                    $step = $s->processing_step ?? null;
                    if ($prog !== $lastProgress || $step !== $lastStep) {
                        $send('progress', ['step' => $step ?? 'processing', 'progress' => $prog]);
                        $lastProgress = $prog; $lastStep = $step;
                    }
                    sleep(1);
                }
            } catch (\Throwable $e) {
                $send('error', ['message' => 'Unable to start status stream']);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
        ]);
    }
}
