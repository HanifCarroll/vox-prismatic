<?php

namespace App\Http\Controllers;

use App\Exceptions\ForbiddenException;
use App\Exceptions\NotFoundException;
use App\Models\ContentProject;
use App\Models\Post as PostModel;
use App\Services\AiService;
use App\Jobs\RegeneratePostsJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use App\Support\PostgresArray;
use App\Support\PostTypePreset;
use Illuminate\Validation\Rule;

/**
 * @tags Posts
 */
class PostsController extends Controller
{
    public function frameworks(): JsonResponse
    {
        // Must match OpenAPI hook framework schema
        $frameworks = [
            [
                'id' => 'problem-agitate',
                'label' => 'Problem → Agitate',
                'description' => 'Start with the painful status quo, then intensify it with a consequence that creates urgency to keep reading.',
                'example' => 'Most coaches post daily and still hear crickets. Here’s the brutal reason no one told you.',
                'tags' => ['pain', 'urgency'],
            ],
            [
                'id' => 'contrarian-flip',
                'label' => 'Contrarian Flip',
                'description' => 'Challenge a common belief with a bold reversal that signals you are about to reveal a better path forward.',
                'example' => 'The worst advice in coaching? “Nurture every lead.” Here’s why that’s killing your pipeline.',
                'tags' => ['contrarian', 'pattern interrupt'],
            ],
            [
                'id' => 'data-jolt',
                'label' => 'Data Jolt',
                'description' => 'Lead with a specific metric or contrast that reframes the opportunity or risk in unmistakable numbers.',
                'example' => '87% of our inbound leads ghosted… until we changed one sentence in our opener.',
                'tags' => ['proof', 'specificity'],
            ],
            [
                'id' => 'confession-to-lesson',
                'label' => 'Confession → Lesson',
                'description' => 'Offer a vulnerable admission or mistake that earns trust, then hint at the transformation you unlocked.',
                'example' => 'I almost shut down my practice last year. The fix took 12 minutes a week.',
                'tags' => ['story', 'vulnerability'],
            ],
            [
                'id' => 'myth-bust',
                'label' => 'Myth Bust',
                'description' => 'Expose a beloved industry myth, then tease the unexpected truth that flips the audience’s worldview.',
                'example' => '“Add more value” is not why prospects ignore you. This is.',
                'tags' => ['belief shift', 'clarity'],
            ],
            [
                'id' => 'micro-case',
                'label' => 'Micro Case Study',
                'description' => 'Compress a before→after story into two lines that prove you can create the transformation your audience craves.',
                'example' => 'Session 1: 14% close rate. Session 6: 61%. Same offer. Different first sentence.',
                'tags' => ['credibility', 'outcomes'],
            ],
        ];
        return response()->json(['frameworks' => $frameworks]);
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

    private function presentPost(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'projectId' => (string) $row->project_id,
            'insightId' => $row->insight_id,
            'content' => $row->content,
            'hashtags' => $this->parsePgTextArray($row->hashtags ?? null),
            'platform' => $row->platform,
            'status' => $row->status,
            'publishedAt' => $row->published_at,
            'scheduledAt' => $row->scheduled_at,
            'scheduleStatus' => $row->schedule_status,
            'scheduleError' => $row->schedule_error,
            'scheduleAttemptedAt' => $row->schedule_attempted_at,
            'createdAt' => $row->created_at,
            'updatedAt' => $row->updated_at,
        ];
    }

    private function nextAvailableSlot(iterable $slots, Carbon $candidate, int $maxIterations = 120): ?Carbon
    {
        $collection = $slots instanceof \Illuminate\Support\Collection ? $slots : collect($slots);
        $candidate = $candidate->copy();

        for ($i = 0; $i < $maxIterations; $i++) {
            foreach ($collection as $slot) {
                $slotDay = (int) $slot->iso_day_of_week;
                $slotMinutes = (int) $slot->minutes_from_midnight;
                $dayDiff = ($slotDay - $candidate->dayOfWeekIso + 7) % 7;

                $slotDate = $candidate
                    ->copy()
                    ->addDays($dayDiff)
                    ->setTime(intdiv($slotMinutes, 60), $slotMinutes % 60, 0);

                if ($slotDate->lessThan($candidate)) {
                    continue;
                }

                return $slotDate;
            }

            $candidate = $candidate->copy()->addDay()->startOfDay();
        }

        return null;
    }

    /**
     * @response array{
     *   items: list<array{
     *     id: string,
     *     projectId: string,
     *     insightId: string|null,
     *     content: string,
     *     hashtags: string[],
     *     platform: string,
     *     status: string,
     *     publishedAt: string|null,
     *     scheduledAt: string|null,
     *     scheduleStatus: string|null,
     *     scheduleError: string|null,
     *     scheduleAttemptedAt: string|null,
     *     createdAt: string,
     *     updatedAt: string
     *   }>,
     *   meta: array{page: int, pageSize: int, total: int}
     * }
     */
    public function listByProject(Request $request, string $id): JsonResponse
    {
        $this->ensureProject($id, $request->user()->id);
        $data = $request->validate(['page' => ['nullable','integer','min:1'], 'pageSize' => ['nullable','integer','min:1','max:100']]);
        $page = (int) ($data['page'] ?? 1); $pageSize = (int) ($data['pageSize'] ?? 10);
        $qb = DB::table('posts')->where('project_id',$id);
        $total = (clone $qb)->count();
        $rows = $qb->orderByDesc('created_at')->forPage($page,$pageSize)->get();
        $items = $rows->map(fn ($row) => $this->presentPost($row))->values();
        return response()->json(['items'=>$items,'meta'=>['page'=>$page,'pageSize'=>$pageSize,'total'=>$total]]);
    }

    /**
     * @response array{
     *   items: list<array{
     *     id: string,
     *     projectId: string,
     *     insightId: string|null,
     *     content: string,
     *     hashtags: string[],
     *     platform: string,
     *     status: string,
     *     publishedAt: string|null,
     *     scheduledAt: string|null,
     *     scheduleStatus: string|null,
     *     scheduleError: string|null,
     *     scheduleAttemptedAt: string|null,
     *     createdAt: string,
     *     updatedAt: string
     *   }>,
     *   meta: array{page: int, pageSize: int, total: int}
     * }
     */
    public function listScheduled(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $data = $request->validate(['page'=>['nullable','integer','min:1'],'pageSize'=>['nullable','integer','min:1','max:100'],'status'=>['nullable','string']]);
        $page = (int) ($data['page'] ?? 1); $pageSize = (int) ($data['pageSize'] ?? 10);
        $qb = DB::table('posts')->join('content_projects','content_projects.id','=','posts.project_id')->where('content_projects.user_id',$userId)->whereNotNull('posts.scheduled_at');
        if (!empty($data['status'])) $qb->where('posts.schedule_status',$data['status']);
        $total = (clone $qb)->count();
        $rows = $qb->orderBy('posts.scheduled_at')->select('posts.*')->forPage($page,$pageSize)->get();
        $items = $rows->map(fn ($row) => $this->presentPost($row))->values();
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
        ]);
    }

    /**
     * @response array{
     *   post: array{
     *     id: string,
     *     projectId: string,
     *     insightId: string|null,
     *     content: string,
     *     hashtags: string[],
     *     platform: string,
     *     status: string,
     *     publishedAt: string|null,
     *     scheduledAt: string|null,
     *     scheduleStatus: string|null,
     *     scheduleError: string|null,
     *     scheduleAttemptedAt: string|null,
     *     createdAt: string,
     *     updatedAt: string
     *   }
     * }
     */
    public function get(Request $request, string $id): JsonResponse
    {
        $row = DB::table('posts')->where('id',$id)->first();
        if (!$row) throw new NotFoundException('Not found');
        $this->ensureProject((string)$row->project_id, $request->user()->id);
        return response()->json(['post' => $this->presentPost($row)]);
    }

    /**
     * @response array{
     *   post: array{
     *     id: string,
     *     projectId: string,
     *     insightId: string|null,
     *     content: string,
     *     hashtags: string[],
     *     platform: string,
     *     status: string,
     *     publishedAt: string|null,
     *     scheduledAt: string|null,
     *     scheduleStatus: string|null,
     *     scheduleError: string|null,
     *     scheduleAttemptedAt: string|null,
     *     createdAt: string,
     *     updatedAt: string
     *   }
     * }
     */
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
            DB::statement('UPDATE posts SET hashtags = ?::text[] WHERE id = ?', [PostgresArray::text($tags), $id]);
        }
        $updated = DB::table('posts')->where('id',$id)->first();
        return $this->get($request, $id);
    }

    /**
     * @response array{
     *   post: array{
     *     id: string,
     *     projectId: string,
     *     insightId: string|null,
     *     content: string,
     *     hashtags: string[],
     *     platform: string,
     *     status: string,
     *     publishedAt: string|null,
     *     scheduledAt: string|null,
     *     scheduleStatus: string|null,
     *     scheduleError: string|null,
     *     scheduleAttemptedAt: string|null,
     *     createdAt: string,
     *     updatedAt: string
     *   }
     * }
     */
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

    /**
     * @response array{
     *   scheduled: list<array{
     *     id: string,
     *     projectId: string,
     *     insightId: string|null,
     *     content: string,
     *     hashtags: string[],
     *     platform: string,
     *     status: string,
     *     publishedAt: string|null,
     *     scheduledAt: string|null,
     *     scheduleStatus: string|null,
     *     scheduleError: string|null,
     *     scheduleAttemptedAt: string|null,
     *     createdAt: string,
     *     updatedAt: string
     *   }>,
     *   meta: array{requested: int, scheduledCount: int}
     * }
     */
    public function autoScheduleProject(Request $request, string $projectId): JsonResponse
    {
        $this->ensureProject($projectId, $request->user()->id);
        $data = $request->validate(['limit'=>['nullable','integer','min:1','max:200']]);
        $limit = (int) ($data['limit'] ?? 20);
        $user = $request->user();
        if (!$user->linkedin_token) {
            return response()->json([
                'error' => 'LinkedIn is not connected',
                'code' => 'LINKEDIN_NOT_CONNECTED',
                'status' => 422,
            ], 422);
        }

        $pref = DB::table('user_schedule_preferences')->where('user_id',$user->id)->first();
        $slots = DB::table('user_preferred_timeslots')->where('user_id',$user->id)->where('active',true)->orderBy('iso_day_of_week')->orderBy('minutes_from_midnight')->get();
        if (!$pref || $slots->isEmpty()) return response()->json(['error'=>'No preferred timeslots configured','code'=>'NO_PREFERENCES','status'=>422],422);
        $lead = (int) ($pref->lead_time_minutes ?? 30);
        $approved = DB::table('posts')->where('project_id',$projectId)->where('status','approved')->whereNull('scheduled_at')->limit($limit)->get();
        $scheduled = [];
        $candidate = now()->addMinutes($lead);
        foreach ($approved as $p) {
            $next = $this->nextAvailableSlot($slots, $candidate);
            if (!$next) {
                break;
            }
            $candidate = $next->copy()->addMinutes(5);
            DB::table('posts')->where('id', $p->id)->update([
                'scheduled_at' => $next->utc(),
                'schedule_status' => 'scheduled',
                'schedule_error' => null,
                'schedule_attempted_at' => null,
                'updated_at' => now(),
            ]);
            $scheduled[] = (string) $p->id;
        }
        if (empty($scheduled)) {
            return response()->json([
                'error' => 'No available timeslot',
                'code' => 'NO_AVAILABLE_TIMESLOT',
                'status' => 422,
            ], 422);
        }

        $scheduledRows = DB::table('posts')->whereIn('id', $scheduled)->get();

        return response()->json([
            'scheduled' => $scheduledRows->map(fn ($row) => $this->presentPost($row))->values(),
            'meta' => ['requested' => $limit, 'scheduledCount' => count($scheduled)],
        ]);
    }

    /**
     * @response array{post: array{
     *   id: string,
     *   projectId: string,
     *   insightId: string|null,
     *   content: string,
     *   hashtags: string[],
     *   platform: string,
     *   status: string,
     *   publishedAt: string|null,
     *   scheduledAt: string|null,
     *   scheduleStatus: string|null,
     *   scheduleError: string|null,
     *   scheduleAttemptedAt: string|null,
     *   createdAt: string,
     *   updatedAt: string
     * }}
     */
    public function autoSchedule(Request $request, string $id): JsonResponse
    {
        $post = DB::table('posts')->where('id', $id)->first();
        if (!$post) {
            throw new NotFoundException('Not found');
        }

        $this->ensureProject((string) $post->project_id, $request->user()->id);

        if ($post->status !== 'approved') {
            return response()->json([
                'error' => 'Post must be approved before scheduling',
                'code' => 'POST_NOT_APPROVED',
                'status' => 422,
            ], 422);
        }

        if ($post->scheduled_at && $post->schedule_status === 'scheduled') {
            return response()->json([
                'error' => 'Post is already scheduled. Unschedule it first.',
                'code' => 'POST_ALREADY_SCHEDULED',
                'status' => 409,
            ], 409);
        }

        $user = $request->user();
        if (!$user->linkedin_token) {
            return response()->json([
                'error' => 'LinkedIn is not connected',
                'code' => 'LINKEDIN_NOT_CONNECTED',
                'status' => 422,
            ], 422);
        }

        $pref = DB::table('user_schedule_preferences')->where('user_id', $user->id)->first();
        $slots = DB::table('user_preferred_timeslots')
            ->where('user_id', $user->id)
            ->where('active', true)
            ->orderBy('iso_day_of_week')
            ->orderBy('minutes_from_midnight')
            ->get();

        if (!$pref || $slots->isEmpty()) {
            return response()->json([
                'error' => 'No preferred timeslots configured',
                'code' => 'NO_PREFERENCES',
                'status' => 422,
            ], 422);
        }

        $lead = (int) ($pref->lead_time_minutes ?? 30);
        $candidate = now()->addMinutes($lead);
        $next = $this->nextAvailableSlot($slots, $candidate);

        if (!$next) {
            return response()->json([
                'error' => 'No available timeslot',
                'code' => 'NO_AVAILABLE_TIMESLOT',
                'status' => 422,
            ], 422);
        }

        DB::table('posts')->where('id', $id)->update([
            'scheduled_at' => $next->utc(),
            'schedule_status' => 'scheduled',
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'updated_at' => now(),
        ]);

        $updated = DB::table('posts')->where('id', $id)->first();

        return response()->json(['post' => $this->presentPost($updated)]);
    }

    /**
     * @response array{post: array{
     *   id: string,
     *   projectId: string,
     *   insightId: string|null,
     *   content: string,
     *   hashtags: string[],
     *   platform: string,
     *   status: string,
     *   publishedAt: string|null,
     *   scheduledAt: string|null,
     *   scheduleStatus: string|null,
     *   scheduleError: string|null,
     *   scheduleAttemptedAt: string|null,
     *   createdAt: string,
     *   updatedAt: string
     * }}
     */
    public function schedule(Request $request, string $id): JsonResponse
    {
        $post = DB::table('posts')->where('id', $id)->first();
        if (!$post) {
            throw new NotFoundException('Not found');
        }

        $this->ensureProject((string) $post->project_id, $request->user()->id);

        if ($post->status !== 'approved') {
            return response()->json([
                'error' => 'Post must be approved before scheduling',
                'code' => 'POST_NOT_APPROVED',
                'status' => 422,
            ], 422);
        }

        $data = $request->validate(['scheduledAt' => ['required', 'date']]);
        $scheduledAt = Carbon::parse($data['scheduledAt'])->utc();
        $nowUtc = now()->utc();

        if ($scheduledAt->lessThanOrEqualTo($nowUtc)) {
            return response()->json([
                'error' => 'Scheduled time must be in the future',
                'code' => 'SCHEDULE_IN_PAST',
                'status' => 422,
            ], 422);
        }

        $user = $request->user();
        if (!$user->linkedin_token) {
            return response()->json([
                'error' => 'LinkedIn is not connected',
                'code' => 'LINKEDIN_NOT_CONNECTED',
                'status' => 422,
            ], 422);
        }

        $pref = DB::table('user_schedule_preferences')->where('user_id', $user->id)->first();
        $leadMinutes = (int) ($pref->lead_time_minutes ?? 0);
        if ($leadMinutes > 0 && $scheduledAt->lessThan($nowUtc->copy()->addMinutes($leadMinutes))) {
            return response()->json([
                'error' => "Scheduled time must be at least {$leadMinutes} minutes from now",
                'code' => 'SCHEDULE_BEFORE_LEAD',
                'status' => 422,
            ], 422);
        }

        DB::table('posts')->where('id', $id)->update([
            'scheduled_at' => $scheduledAt,
            'schedule_status' => 'scheduled',
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'updated_at' => now(),
        ]);

        $updated = DB::table('posts')->where('id', $id)->first();

        return response()->json(['post' => $this->presentPost($updated)]);
    }

    /**
     * @response array{post: array{
     *   id: string,
     *   projectId: string,
     *   insightId: string|null,
     *   content: string,
     *   hashtags: string[],
     *   platform: string,
     *   status: string,
     *   publishedAt: string|null,
     *   scheduledAt: string|null,
     *   scheduleStatus: string|null,
     *   scheduleError: string|null,
     *   scheduleAttemptedAt: string|null,
     *   createdAt: string,
     *   updatedAt: string
     * }}
     */
    public function unschedule(Request $request, string $id): JsonResponse
    {
        $post = DB::table('posts')->where('id', $id)->first();
        if (!$post) {
            throw new NotFoundException('Not found');
        }

        $this->ensureProject((string) $post->project_id, $request->user()->id);

        DB::table('posts')->where('id', $id)->update([
            'scheduled_at' => null,
            'schedule_status' => null,
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'updated_at' => now(),
        ]);

        $updated = DB::table('posts')->where('id', $id)->first();

        return response()->json(['post' => $this->presentPost($updated)]);
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
        $data = $request->validate([
            'ids' => ['required','array','min:1'],
            'ids.*' => ['uuid'],
            'customInstructions' => ['nullable','string'],
            'postType' => ['nullable','string', Rule::in(PostTypePreset::keys())],
        ]);
        $ids = array_map('strval', $data['ids']);
        $custom = isset($data['customInstructions']) ? trim((string) $data['customInstructions']) : null;
        $custom = $custom === '' ? null : $custom;
        $postType = isset($data['postType']) ? strtolower((string) $data['postType']) : null;
        Log::info('posts.bulk_regenerate.request', [
            'idCount' => count($ids),
            'postType' => $postType,
        ]);
        $rows = DB::table('posts')->whereIn(DB::raw('id::text'), $ids)->get();
        if ($rows->isEmpty()) {
            Log::info('posts.bulk_regenerate.no_rows', ['idCount' => count($ids)]);
            return response()->json(['updated'=>0,'items'=>[]]);
        }
        // Ownership check: all posts must belong to the requesting user's projects
        $userId = $request->user()->id;
        $projIds = $rows->pluck('project_id')->unique()->values();
        $owned = DB::table('content_projects')->whereIn('id',$projIds)->where('user_id',$userId)->count();
        if ($owned !== $projIds->count()) throw new ForbiddenException('Access denied');

        foreach ($rows as $p) {
            RegeneratePostsJob::dispatch((string) $p->id, $custom, (string) $userId, $postType);
        }
        // Return enqueued count, no items; client optimistically updates and refreshes list
        return response()->json(['updated'=>$rows->count(),'items'=>[]]);
    }

    public function hookWorkbench(Request $request, string $id): JsonResponse
    {
        // id refers to the Post id
        $post = DB::table('posts')->select('id','project_id','insight_id','content')->where('id',$id)->first();
        if (!$post) throw new NotFoundException('Post not found');
        $this->ensureProject((string)$post->project_id, $request->user()->id);

        $data = $request->validate([
            'frameworkIds' => ['nullable','array'],
            'customFocus' => ['nullable','string'],
            'count' => ['nullable','integer','min:3','max:5']
        ]);
        $count = (int) ($data['count'] ?? 3);

        // Framework library (same shape as frameworks())
        $frameworks = [
            ['id'=>'problem-agitate','label'=>'Problem → Agitate','description'=>'Start with the painful status quo, then intensify it with a consequence that creates urgency to keep reading.','example'=>'Most coaches post daily and still hear crickets. Here’s the brutal reason no one told you.','tags'=>['pain','urgency']],
            ['id'=>'contrarian-flip','label'=>'Contrarian Flip','description'=>'Challenge a common belief with a bold reversal that signals you are about to reveal a better path forward.','example'=>'The worst advice in coaching? “Nurture every lead.” Here’s why that’s killing your pipeline.','tags'=>['contrarian','pattern interrupt']],
            ['id'=>'data-jolt','label'=>'Data Jolt','description'=>'Lead with a specific metric or contrast that reframes the opportunity or risk in unmistakable numbers.','example'=>'87% of our inbound leads ghosted… until we changed one sentence in our opener.','tags'=>['proof','specificity']],
            ['id'=>'confession-to-lesson','label'=>'Confession → Lesson','description'=>'Offer a vulnerable admission or mistake that earns trust, then hint at the transformation you unlocked.','example'=>'I almost shut down my practice last year. The fix took 12 minutes a week.','tags'=>['story','vulnerability']],
            ['id'=>'myth-bust','label'=>'Myth Bust','description'=>'Expose a beloved industry myth, then tease the unexpected truth that flips the audience’s worldview.','example'=>'“Add more value” is not why prospects ignore you. This is.','tags'=>['belief shift','clarity']],
            ['id'=>'micro-case','label'=>'Micro Case Study','description'=>'Compress a before→after story into two lines that prove you can create the transformation your audience craves.','example'=>'Session 1: 14% close rate. Session 6: 61%. Same offer. Different first sentence.','tags'=>['credibility','outcomes']],
        ];
        $frameworkMap = [];
        foreach ($frameworks as $fw) { $frameworkMap[$fw['id']] = $fw; }

        $selected = [];
        if (!empty($data['frameworkIds']) && is_array($data['frameworkIds'])) {
            foreach ($data['frameworkIds'] as $idv) {
                $idv = (string) $idv;
                if (isset($frameworkMap[$idv])) $selected[] = $frameworkMap[$idv];
            }
        }
        if (empty($selected)) {
            $selected = array_slice($frameworks, 0, 4);
        }

        $project = DB::table('content_projects')->select('transcript_original','transcript_cleaned')->where('id',$post->project_id)->first();
        $transcript = (string) ($project?->transcript_cleaned ?? $project?->transcript_original ?? '');

        if (empty($post->insight_id)) {
            return response()->json(['error'=>'Hooks require an insight-backed post','code'=>'NO_INSIGHT','status'=>422],422);
        }
        $insightRow = DB::table('insights')->select('content')->where('id',$post->insight_id)->where('project_id',$post->project_id)->first();
        if (!$insightRow) throw new NotFoundException('Insight not found for post');

        $library = array_map(function($fw){
            $ex = isset($fw['example']) && $fw['example'] ? " Example: \"{$fw['example']}\"" : '';
            return '- '.$fw['id'].': '.$fw['label'].' → '.$fw['description'].$ex;
        }, $selected);

        $base = [
            'You are a hook strategist for high-performing LinkedIn posts.',
            'Generate scroll-stopping opening lines (<= 210 characters, 1-2 sentences, no emojis).',
            "Produce {$count} options.",
            'Each option must follow one of the approved frameworks below. Match the tone to the audience of executive coaches & consultants.',
            'For every hook, score curiosity (ability to earn a See More click) and value alignment (how clearly it sets up the promised lesson or outcome). Scores are 0-100 integers.',
            'Provide a short rationale referencing why the hook will resonate.',
            'Return ONLY JSON with shape { "summary"?: string, "recommendedId"?: string, "hooks": [{ "id", "frameworkId", "label", "hook", "curiosity", "valueAlignment", "rationale" }] }.',
            'Framework Library:',
            ...$library,
            '',
            'Project Insight (anchor the promise to this idea):',
            (string) ($insightRow->content ?? ''),
            '',
            'Transcript Excerpt (do not quote verbatim; use for credibility only):',
            mb_substr($transcript,0,1800),
            '',
            'Current Draft Opening:',
            mb_substr((string) $post->content,0,220),
        ];
        if (!empty($data['customFocus'])) {
            $base[] = '';
            $base[] = 'Audience Focus: '.mb_substr((string)$data['customFocus'],0,240);
        }
        $base[] = '';
        $base[] = 'Remember: respond with JSON only.';
        $prompt = implode("\n", $base);

        $ai = app(AiService::class);
        $json = $ai->generateJson(['prompt'=>$prompt,'temperature'=>0.4,'model'=>AiService::FLASH_MODEL,'action'=>'hook.workbench']);

        $hooks = [];
        foreach (($json['hooks'] ?? []) as $h) {
            if (!is_array($h)) continue;
            $fwId = (string)($h['frameworkId'] ?? ($selected[0]['id'] ?? 'custom'));
            $fw = $frameworkMap[$fwId] ?? null;
            $hooks[] = [
                'id' => isset($h['id']) ? (string)$h['id'] : (string) Str::uuid(),
                'frameworkId' => $fw ? $fw['id'] : $fwId,
                'label' => $fw['label'] ?? (string)($h['label'] ?? 'Hook'),
                'hook' => mb_substr((string)($h['hook'] ?? ''),0,210),
                'curiosity' => max(0, min(100, (int)($h['curiosity'] ?? 50))),
                'valueAlignment' => max(0, min(100, (int)($h['valueAlignment'] ?? 50))),
                'rationale' => mb_substr((string)($h['rationale'] ?? ''),0,360),
            ];
        }

        if (empty($hooks)) {
            return response()->json(['error'=>'No hooks generated','code'=>'NO_HOOKS','status'=>422],422);
        }
        $recommendedId = is_string(($json['recommendedId'] ?? null)) ? (string)$json['recommendedId'] : null;
        if (!$recommendedId || !collect($hooks)->firstWhere('id',$recommendedId)) {
            // Fallback: pick highest average score
            $best = null; $bestScore = -1;
            foreach ($hooks as $h) { $score = (int) round(($h['curiosity'] + $h['valueAlignment'])/2); if ($score > $bestScore) { $bestScore=$score; $best=$h; } }
            $recommendedId = $best['id'] ?? $hooks[0]['id'];
        }
        return response()->json([
            'hooks'=>$hooks,
            'summary'=>isset($json['summary']) && is_string($json['summary']) ? mb_substr($json['summary'],0,400) : null,
            'recommendedId'=>$recommendedId,
            'generatedAt'=>now(),
        ]);
    }
}
