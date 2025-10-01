<?php

namespace App\Http\Controllers;

use App\Exceptions\ForbiddenException;
use App\Exceptions\NotFoundException;
use App\Models\ContentProject;
use App\Models\Post as PostModel;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PostsController extends Controller
{
    public function frameworks(): JsonResponse
    {
        $frameworks = [
            ['id'=>'question','name'=>'Question Hook','examples'=>['What if your content wrote itself?']],
            ['id'=>'counter','name'=>'Contrarian Hook','examples'=>['Most advice about LinkedIn is wrong—here’s why.']],
            ['id'=>'story','name'=>'Story Hook','examples'=>['Last year I almost quit building content tools...']],
        ];
        return response()->json(['frameworks'=>$frameworks]);
    }
    private function parsePgTextArray($raw): array
    {
        if ($raw === null) return [];
        if (is_string($raw)) {
            $trim = trim($raw, '{}');
            if ($trim === '') return [];
            $parts = preg_split('/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/', $trim) ?: [];
            return array_values(array_filter(array_map(fn($s)=> stripcslashes(trim($s, '"')), $parts), fn($s)=> $s!==''));
        }
        return (array) $raw;
    }
    private function ensureProject(string $id, string $ownerId): void
    {
        $p = ContentProject::query()->select(['id','user_id'])->where('id',$id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $ownerId) throw new ForbiddenException('Access denied');
    }

    public function listByProject(Request $request, string $id): JsonResponse
    {
        $this->ensureProject($id, $request->user()->id);
        $data = $request->validate(['page' => ['nullable','integer','min:1'], 'pageSize' => ['nullable','integer','min:1','max:100']]);
        $page = (int) ($data['page'] ?? 1); $pageSize = (int) ($data['pageSize'] ?? 10);
        $qb = DB::table('posts')->where('project_id',$id);
        $total = (clone $qb)->count();
        $rows = $qb->orderByDesc('created_at')->forPage($page,$pageSize)->get();
        $items = $rows->map(function($r){
            return [
                'id'=>(string)$r->id,
                'projectId'=>(string)$r->project_id,
                'insightId'=>$r->insight_id,
                'content'=>$r->content,
                'hashtags'=>$this->parsePgTextArray($r->hashtags ?? null),
                'platform'=>$r->platform,
                'status'=>$r->status,
                'publishedAt'=>$r->published_at,
                'scheduledAt'=>$r->scheduled_at,
                'scheduleStatus'=>$r->schedule_status,
                'scheduleError'=>$r->schedule_error,
                'scheduleAttemptedAt'=>$r->schedule_attempted_at,
                'createdAt'=>$r->created_at,
                'updatedAt'=>$r->updated_at,
            ];
        })->values();
        return response()->json(['items'=>$items,'meta'=>['page'=>$page,'pageSize'=>$pageSize,'total'=>$total]]);
    }

    public function listScheduled(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $data = $request->validate(['page'=>['nullable','integer','min:1'],'pageSize'=>['nullable','integer','min:1','max:100'],'status'=>['nullable','string']]);
        $page = (int) ($data['page'] ?? 1); $pageSize = (int) ($data['pageSize'] ?? 10);
        $qb = DB::table('posts')->join('content_projects','content_projects.id','=','posts.project_id')->where('content_projects.user_id',$userId)->whereNotNull('posts.scheduled_at');
        if (!empty($data['status'])) $qb->where('posts.schedule_status',$data['status']);
        $total = (clone $qb)->count();
        $rows = $qb->orderBy('posts.scheduled_at')->select('posts.*')->forPage($page,$pageSize)->get();
        $items = $rows->map(function($r){
            return [
                'id'=>(string)$r->id,
                'projectId'=>(string)$r->project_id,
                'insightId'=>$r->insight_id,
                'content'=>$r->content,
                'hashtags'=>$this->parsePgTextArray($r->hashtags ?? null),
                'platform'=>$r->platform,
                'status'=>$r->status,
                'publishedAt'=>$r->published_at,
                'scheduledAt'=>$r->scheduled_at,
                'scheduleStatus'=>$r->schedule_status,
                'scheduleError'=>$r->schedule_error,
                'scheduleAttemptedAt'=>$r->schedule_attempted_at,
                'createdAt'=>$r->created_at,
                'updatedAt'=>$r->updated_at,
            ];
        })->values();
        return response()->json(['items'=>$items,'meta'=>['page'=>$page,'pageSize'=>$pageSize,'total'=>$total]]);
    }

    public function analytics(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $data = $request->validate(['days'=>['nullable','integer','min:1','max:365']]);
        $days = (int) ($data['days'] ?? 30);
        $since = now()->subDays($days);
        $rows = DB::table('posts')
            ->join('content_projects','content_projects.id','=','posts.project_id')
            ->where('content_projects.user_id',$userId)
            ->where('posts.created_at','>=',$since)
            ->select('posts.status','posts.hashtags','posts.created_at','posts.published_at','posts.scheduled_at')
            ->get();
        $statusCounts = ['pending'=>0,'approved'=>0,'rejected'=>0,'published'=>0];
        $scheduledCount = 0; $publishedInPeriod = 0; $totalHours = 0; $publishCount = 0; $daily = [];
        $tags = [];
        foreach ($rows as $r) {
            $statusCounts[$r->status] = ($statusCounts[$r->status] ?? 0) + 1;
            if ($r->scheduled_at) $scheduledCount++;
            if ($r->published_at) {
                $publishedInPeriod++;
                $k = substr((string)$r->published_at,0,10);
                $daily[$k] = ($daily[$k] ?? 0) + 1;
                if ($r->created_at) {
                    $dh = ((strtotime((string)$r->published_at) - strtotime((string)$r->created_at)) / 3600);
                    if (is_finite($dh)) { $totalHours += $dh; $publishCount++; }
                }
            }
        }
        ksort($daily);
        $dailyArr = array_map(fn($k) => ['date'=>$k,'published'=>$daily[$k]], array_keys($daily));
        $topHashtags = []; // hashtags array extraction omitted for brevity
        $avg = $publishCount>0 ? $totalHours/$publishCount : null;
        return response()->json([
            'summary' => [
                'totalPosts' => count($rows),
                'statusCounts' => ['pending'=>$statusCounts['pending']??0,'approved'=>$statusCounts['approved']??0,'rejected'=>$statusCounts['rejected']??0,'published'=>$statusCounts['published']??0],
                'scheduledCount' => $scheduledCount,
                'publishedInPeriod' => $publishedInPeriod,
                'averageTimeToPublishHours' => $avg,
                'rangeDays' => $days,
            ],
            'daily' => $dailyArr,
            'topHashtags' => $topHashtags,
        ]);
    }

    public function get(Request $request, string $id): JsonResponse
    {
        $row = DB::table('posts')->where('id',$id)->first();
        if (!$row) throw new NotFoundException('Not found');
        $this->ensureProject((string)$row->project_id, $request->user()->id);
        return response()->json(['post' => [
            'id'=>(string)$row->id,
            'projectId'=>(string)$row->project_id,
            'insightId'=>$row->insight_id,
            'content'=>$row->content,
            'hashtags'=>$this->parsePgTextArray($row->hashtags ?? null),
            'platform'=>$row->platform,
            'status'=>$row->status,
            'publishedAt'=>$row->published_at,
            'scheduledAt'=>$row->scheduled_at,
            'scheduleStatus'=>$row->schedule_status,
            'scheduleError'=>$row->schedule_error,
            'scheduleAttemptedAt'=>$row->schedule_attempted_at,
            'createdAt'=>$row->created_at,
            'updatedAt'=>$row->updated_at,
        ]]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $row = DB::table('posts')->where('id',$id)->first();
        if (!$row) throw new NotFoundException('Not found');
        $this->ensureProject((string)$row->project_id, $request->user()->id);
        $data = $request->validate(['content'=>['nullable','string'],'hashtags'=>['nullable','array'],'status'=>['nullable','string']]);
        $payload = ['updated_at'=>now()];
        if (array_key_exists('content',$data)) $payload['content'] = $data['content'];
        if (array_key_exists('status',$data)) $payload['status'] = $data['status'];
        DB::table('posts')->where('id',$id)->update($payload);
        if (array_key_exists('hashtags',$data) && is_array($data['hashtags'])) {
            $tags = array_values(array_filter(array_map('strval',$data['hashtags'])));
            $escaped = array_map(fn($t) => '"'.str_replace('"','\\"',$t).'"', $tags);
            $arraySql = 'ARRAY['.implode(',',$escaped).']::text[]';
            DB::statement("UPDATE posts SET hashtags = $arraySql WHERE id = ?", [$id]);
        }
        $updated = DB::table('posts')->where('id',$id)->first();
        return $this->get($request, $id);
    }

    public function publishNow(Request $request, string $id): JsonResponse
    {
        $row = DB::table('posts')->where('id',$id)->first();
        if (!$row) throw new NotFoundException('Not found');
        $this->ensureProject((string)$row->project_id, $request->user()->id);
        if ($row->status !== 'approved') {
            return response()->json(['error'=>'Post must be approved before publishing','code'=>'POST_NOT_APPROVED','status'=>422],422);
        }
        $user = $request->user();
        $token = $user->linkedin_token;
        if (!$token) {
            return response()->json(['error'=>'LinkedIn is not connected','code'=>'LINKEDIN_NOT_CONNECTED','status'=>422],422);
        }
        $member = $user->linkedin_id;
        if (!$member) {
            $resp = Http::withToken($token)->get('https://api.linkedin.com/v2/userinfo');
            if (!$resp->ok()) return response()->json(['error'=>'Failed to fetch LinkedIn user','code'=>'LINKEDIN_USERINFO_FAILED','status'=>400],400);
            $member = (string) ($resp->json('sub') ?? '');
            if ($member) DB::table('users')->where('id',$user->id)->update(['linkedin_id'=>$member]);
        }
        $ugcPayload = [
            'author' => 'urn:li:person:'.$member,
            'lifecycleState' => 'PUBLISHED',
            'specificContent' => ['com.linkedin.ugc.ShareContent' => ['shareCommentary' => ['text' => mb_substr($row->content,0,2999)], 'shareMediaCategory' => 'NONE']],
            'visibility' => ['com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC'],
        ];
        $resp = Http::withToken($token)->asJson()->post('https://api.linkedin.com/v2/ugcPosts', $ugcPayload);
        if (!$resp->ok()) return response()->json(['error'=>'LinkedIn publish failed','code'=>'LINKEDIN_PUBLISH_FAILED','status'=>400],400);
        DB::table('posts')->where('id',$id)->update(['status'=>'published','published_at'=>now(),'schedule_status'=>null,'schedule_error'=>null,'schedule_attempted_at'=>now()]);
        return $this->get($request, $id);
    }

    public function autoSchedule(Request $request, string $id): JsonResponse
    {
        $this->ensureProject($id, $request->user()->id);
        $data = $request->validate(['limit'=>['nullable','integer','min:1','max:200']]);
        $limit = (int) ($data['limit'] ?? 20);
        $user = $request->user();
        $pref = DB::table('user_schedule_preferences')->where('user_id',$user->id)->first();
        $slots = DB::table('user_preferred_timeslots')->where('user_id',$user->id)->where('active',true)->orderBy('iso_day_of_week')->orderBy('minutes_from_midnight')->get();
        if (!$pref || $slots->isEmpty()) return response()->json(['error'=>'No preferred timeslots configured','code'=>'NO_PREFERENCES','status'=>422],422);
        $lead = (int) ($pref->lead_time_minutes ?? 30);
        $approved = DB::table('posts')->where('project_id',$id)->where('status','approved')->whereNull('scheduled_at')->limit($limit)->get();
        $scheduled = [];
        $candidate = now()->addMinutes($lead);
        $takeNext = function () use (&$candidate, $slots) {
            for ($i=0;$i<90;$i++) {
                $iso = (($candidate->dayOfWeekIso));
                $mins = $candidate->hour*60 + $candidate->minute;
                foreach ($slots as $s) {
                    if ((int)$s->iso_day_of_week === $iso && (int)$s->minutes_from_midnight >= $mins) {
                        $h = intdiv((int)$s->minutes_from_midnight,60); $m = ((int)$s->minutes_from_midnight)%60;
                        $at = $candidate->copy()->setTime($h,$m,0);
                        $candidate = $at->copy()->addMinutes(5);
                        return $at;
                    }
                }
                $candidate = $candidate->copy()->addDay()->startOfDay();
            }
            return null;
        };
        foreach ($approved as $p) {
            $at = $takeNext(); if (!$at) break;
            DB::table('posts')->where('id',$p->id)->update(['scheduled_at'=>$at,'schedule_status'=>'scheduled','schedule_error'=>null]);
            $scheduled[] = ['id'=>(string)$p->id];
        }
        return response()->json(['scheduled'=>$scheduled,'meta'=>['requested'=>$limit,'scheduledCount'=>count($scheduled)]]);
    }

    public function bulkSetStatus(Request $request): JsonResponse
    {
        $data = $request->validate(['ids'=>['required','array','min:1'],'status'=>['required','string']]);
        $ids = array_map('strval',$data['ids']);
        $rows = DB::table('posts')->whereIn('id',$ids)->get();
        if ($rows->isEmpty()) return response()->json(['updated'=>0,'items'=>[]]);
        // Ownership check: all posts must belong to user's projects
        $userId = $request->user()->id;
        $projectIds = $rows->pluck('project_id')->unique()->values();
        $owned = DB::table('content_projects')->whereIn('id',$projectIds)->where('user_id',$userId)->count();
        if ($owned !== $projectIds->count()) throw new ForbiddenException('Access denied');
        DB::table('posts')->whereIn('id',$ids)->update(['status'=>$data['status'],'updated_at'=>now()]);
        $out = DB::table('posts')->whereIn('id',$ids)->get();
        return response()->json(['updated'=>$out->count(),'items'=>$out]);
    }

    public function bulkRegenerate(Request $request): JsonResponse
    {
        $data = $request->validate(['ids'=>['required','array','min:1'],'customInstructions'=>['nullable','string']]);
        $ids = array_map('strval',$data['ids']);
        $rows = DB::table('posts')->whereIn('id',$ids)->get();
        if ($rows->isEmpty()) return response()->json(['updated'=>0,'items'=>[]]);
        $userId = $request->user()->id;
        $projIds = $rows->pluck('project_id')->unique()->values();
        $owned = DB::table('content_projects')->whereIn('id',$projIds)->where('user_id',$userId)->count();
        if ($owned !== $projIds->count()) throw new ForbiddenException('Access denied');
        $ai = app(AiService::class);
        $outItems = [];
        foreach ($rows as $p) {
            $insightText = '';
            if ($p->insight_id) {
                $ins = DB::table('insights')->select('content')->where('id',$p->insight_id)->where('project_id',$p->project_id)->first();
                $insightText = $ins?->content ?? '';
            }
            $extra = !empty($data['customInstructions']) ? "\nGuidance: ".$data['customInstructions'] : '';
            $prompt = "Regenerate a high-quality LinkedIn post from this insight. 4-6 short paragraphs, crisp, no emoji overload. Return JSON { \"content\": string }.\n\nInsight:\n{$insightText}{$extra}";
            try {
                $out = $ai->generateJson(['prompt'=>$prompt,'temperature'=>0.4,'model'=>AiService::FLASH_MODEL,'action'=>'post.regenerate']);
                $content = $out['content'] ?? null;
                if ($content) {
                    DB::table('posts')->where('id',$p->id)->update([
                        'content'=>$content,
                        'status'=>'pending',
                        'updated_at'=>now(),
                        'schedule_status'=>null,'schedule_error'=>null,'schedule_attempted_at'=>null,
                    ]);
                    $row = DB::table('posts')->where('id',$p->id)->first();
                    $outItems[] = $row;
                }
            } catch (\Throwable $e) { /* skip */ }
        }
        return response()->json(['updated'=>count($outItems),'items'=>$outItems]);
    }

    public function hookWorkbench(Request $request, string $id): JsonResponse
    {
        $this->ensureProject($id, $request->user()->id);
        $data = $request->validate(['frameworkIds'=>['nullable','array'],'customFocus'=>['nullable','string'],'count'=>['nullable','integer','min:3','max:5']]);
        $count = (int) ($data['count'] ?? 3);
        $ai = app(AiService::class);
        $prompt = "Generate $count opening hooks for a LinkedIn post based on the project context. Return JSON { \"hooks\": [ { \"id\": string, \"title\": string, \"example\": string } ] }.";
        $json = $ai->generateJson(['prompt'=>$prompt,'temperature'=>0.5,'model'=>AiService::FLASH_MODEL,'action'=>'hook.workbench']);
        $hooks = [];
        foreach (($json['hooks'] ?? []) as $h) {
            if (!is_array($h)) continue;
            $hooks[] = [
                'id' => $h['id'] ?? (string) Str::uuid(),
                'frameworkId' => $h['frameworkId'] ?? 'custom',
                'title' => $h['title'] ?? 'Hook',
                'example' => $h['example'] ?? '',
                'score' => 0,
                'valueAlignment' => 50,
                'rationale' => $h['rationale'] ?? '',
            ];
        }
        return response()->json(['hooks'=>$hooks,'generatedAt'=>now()]);
    }
}
