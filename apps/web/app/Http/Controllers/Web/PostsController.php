<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Jobs\RegeneratePostsJob;
use App\Models\ContentProject;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use App\Support\PostgresArray;
use App\Support\PostTypePreset;
use Illuminate\Validation\Rule;

class PostsController extends Controller
{
    private function authorizeProject(Request $request, ContentProject $project): void
    {
        if ((string) $project->user_id !== (string) $request->user()->id) {
            abort(403);
        }
    }

    private function ensurePostOnProject(Post $post, ContentProject $project): void
    {
        if ((string) $post->project_id !== (string) $project->id) {
            abort(404);
        }
    }

    public function update(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);

        $data = $request->validate([
            'content' => ['nullable','string'],
            'hashtags' => ['nullable','array'],
            'status' => ['nullable','string'],
        ]);

        $payload = ['updated_at' => now()];
        if (array_key_exists('content', $data)) {
            $payload['content'] = (string) $data['content'];
        }
        if (array_key_exists('status', $data)) {
            $payload['status'] = (string) $data['status'];
        }

        DB::table('posts')->where('id', $post->id)->update($payload);
        if (array_key_exists('hashtags', $data) && is_array($data['hashtags'])) {
            $tags = array_values(array_filter(array_map('strval', $data['hashtags'])));
            DB::statement('UPDATE posts SET hashtags = ?::text[] WHERE id = ?', [PostgresArray::text($tags), $post->id]);
        }

        return back()->with('status', 'Post updated.');
    }

    public function bulkStatus(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $data = $request->validate(['ids' => ['required','array','min:1'], 'status' => ['required','string']]);
        $ids = array_map('strval', $data['ids']);
        $rows = DB::table('posts')->whereIn(DB::raw('id::text'), $ids)->where('project_id', $project->id)->get();
        if ($rows->isEmpty()) {
            return back()->with('status', 'No posts updated.');
        }
        DB::table('posts')->whereIn(DB::raw('id::text'), $ids)->where('project_id', $project->id)->update([
            'status' => (string) $data['status'],
            'updated_at' => now(),
        ]);
        return back()->with('status', 'Bulk status updated.');
    }

    public function bulkRegenerate(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);
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
        $rows = DB::table('posts')
            ->whereIn(DB::raw('id::text'), $ids)
            ->where('project_id', $project->id)
            ->get();
        foreach ($rows as $p) {
            RegeneratePostsJob::dispatch((string) $p->id, $custom, (string) $request->user()->id, $postType);
        }
        return back()->with('status', 'Regeneration queued.');
    }

    public function publish(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);
        $row = DB::table('posts')->where('id', $post->id)->first();
        if (!$row || $row->status !== 'approved') {
            return back()->with('error', 'Post must be approved before publishing');
        }

        $user = $request->user();
        $token = $user->linkedin_token;
        if (!$token) {
            return back()->with('error', 'LinkedIn is not connected');
        }

        $member = $user->linkedin_id;
        if (!$member) {
            $resp = Http::withToken($token)->get('https://api.linkedin.com/v2/userinfo');
            if (!$resp->successful()) {
                return back()->with('error', 'Failed to fetch LinkedIn user');
            }
            $member = (string) ($resp->json('sub') ?? '');
            if ($member) DB::table('users')->where('id', $user->id)->update(['linkedin_id' => $member]);
        }

        $ugcPayload = [
            'author' => 'urn:li:person:' . $member,
            'lifecycleState' => 'PUBLISHED',
            'specificContent' => [
                'com.linkedin.ugc.ShareContent' => [
                    'shareCommentary' => ['text' => mb_substr($row->content, 0, 2999)],
                    'shareMediaCategory' => 'NONE',
                ],
            ],
            'visibility' => ['com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC'],
        ];

        try {
            $resp = Http::withToken($token)
                ->withHeaders(['X-Restli-Protocol-Version' => '2.0.0'])
                ->asJson()
                ->post('https://api.linkedin.com/v2/ugcPosts', $ugcPayload);

            if (!$resp->successful()) {
                $status = $resp->status();
                $body = $resp->body();
                $json = null;
                try { $json = $resp->json(); } catch (\Throwable $e) {}
                $message = is_array($json)
                    ? (string) ($json['message'] ?? $json['error_description'] ?? $json['error'] ?? 'Unknown error')
                    : (string) $body;
                $snippet = mb_substr($message, 0, 200);

                \Log::warning('LinkedIn publish failed', [
                    'status' => $status,
                    'response' => $snippet,
                    'post_id' => (string) $post->id,
                    'user_id' => (string) $user->id,
                ]);

                $flash = in_array($status, [401,403], true)
                    ? 'LinkedIn authorization failed. Please reconnect LinkedIn from Settings.'
                    : 'LinkedIn publish failed';
                if (app()->environment('local')) {
                    $flash .= " (status {$status})";
                    if ($snippet !== '') { $flash .= ": {$snippet}"; }
                }
                return back()->with('error', $flash);
            }
        } catch (\Throwable $e) {
            \Log::error('LinkedIn publish exception', [
                'error' => $e->getMessage(),
                'post_id' => (string) $post->id,
                'user_id' => (string) $user->id,
            ]);
            $flash = 'LinkedIn publish failed';
            if (app()->environment('local')) {
                $flash .= ': ' . $e->getMessage();
            }
            return back()->with('error', $flash);
        }

        DB::table('posts')->where('id', $post->id)->update([
            'status' => 'published',
            'published_at' => now(),
            'schedule_status' => null,
            'schedule_error' => null,
            'schedule_attempted_at' => now(),
            'schedule_attempts' => 0,
            'schedule_next_attempt_at' => null,
        ]);

        return back()->with('status', 'Post published.');
    }

    public function schedule(Request $request, ContentProject $project, Post $post)
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);
        $row = DB::table('posts')->where('id', $post->id)->first();
        if (!$row || $row->status !== 'approved') {
            return back()->with('error', 'Post must be approved before scheduling');
        }
        $data = $request->validate(['scheduledAt' => ['required', 'date']]);
        $scheduledAt = Carbon::parse($data['scheduledAt'])->utc();
        $nowUtc = now()->utc();
        if ($scheduledAt->lessThanOrEqualTo($nowUtc)) {
            return back()->with('error', 'Scheduled time must be in the future');
        }
        $user = $request->user();
        if (!$user->linkedin_token) {
            return back()->with('error', 'LinkedIn is not connected');
        }
        $pref = DB::table('user_schedule_preferences')->where('user_id', $user->id)->first();
        $leadMinutes = (int) ($pref->lead_time_minutes ?? 0);
        if ($leadMinutes > 0 && $scheduledAt->lessThan($nowUtc->copy()->addMinutes($leadMinutes))) {
            return back()->with('error', "Scheduled time must be at least {$leadMinutes} minutes from now");
        }
        DB::table('posts')->where('id', $post->id)->update([
            'scheduled_at' => $scheduledAt,
            'schedule_status' => 'scheduled',
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'schedule_attempts' => 0,
            'schedule_next_attempt_at' => null,
            'updated_at' => now(),
        ]);
        return back()->with('status', 'Post scheduled.');
    }

    public function unschedule(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);
        DB::table('posts')->where('id', $post->id)->update([
            'scheduled_at' => null,
            'schedule_status' => null,
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'schedule_attempts' => 0,
            'schedule_next_attempt_at' => null,
            'updated_at' => now(),
        ]);
        return back()->with('status', 'Post unscheduled.');
    }

    public function bulkUnschedule(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $data = $request->validate([
            'ids' => ['required','array','min:1'],
            'ids.*' => ['uuid'],
        ]);
        $ids = array_map('strval', $data['ids']);
        $rows = DB::table('posts')
            ->whereIn(DB::raw('id::text'), $ids)
            ->where('project_id', $project->id)
            ->get();
        if ($rows->isEmpty()) {
            return back()->with('status', 'No posts unscheduled.');
        }
        DB::table('posts')
            ->whereIn(DB::raw('id::text'), $ids)
            ->where('project_id', $project->id)
            ->update([
                'scheduled_at' => null,
                'schedule_status' => null,
                'schedule_error' => null,
                'schedule_attempted_at' => null,
                'schedule_attempts' => 0,
                'schedule_next_attempt_at' => null,
                'updated_at' => now(),
            ]);
        return back()->with('status', 'Posts unscheduled.');
    }

    private function nextAvailableSlot(iterable $slots, Carbon $candidate, int $maxIterations = 120): ?Carbon
    {
        $collection = $slots instanceof \Illuminate\Support\Collection ? $slots : collect($slots);
        $candidate = $candidate->copy(); // retains timezone

        if ($collection->isEmpty()) {
            return null;
        }

        for ($i = 0; $i < $maxIterations; $i++) {
            $best = null;

            foreach ($collection as $slot) {
                $slotDay = (int) $slot->iso_day_of_week;           // ISO: Mon=1..Sun=7
                $slotMinutes = (int) $slot->minutes_from_midnight; // minutes since 00:00 local
                $dayDiff = ($slotDay - $candidate->dayOfWeekIso + 7) % 7;

                $occurrence = $candidate
                    ->copy()
                    ->addDays($dayDiff)
                    ->setTime(intdiv($slotMinutes, 60), $slotMinutes % 60, 0);

                // If the slot on the same day/time has already passed, roll to the next week
                if ($occurrence->lessThan($candidate)) {
                    $occurrence = $occurrence->addDays(7);
                }

                if ($best === null || $occurrence->lessThan($best)) {
                    $best = $occurrence;
                }
            }

            if ($best !== null) {
                return $best; // earliest next occurrence across all preferred slots
            }

            // Fallback: advance a day and retry
            $candidate = $candidate->copy()->addDay()->startOfDay();
        }

        return null;
    }

    public function autoSchedule(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);
        $row = DB::table('posts')->where('id', $post->id)->first();
        if (!$row || $row->status !== 'approved') return back()->with('error', 'Post must be approved before scheduling');
        if ($row->scheduled_at && $row->schedule_status === 'scheduled') return back()->with('error', 'Post is already scheduled. Unschedule it first.');
        $user = $request->user();
        if (!$user->linkedin_token) return back()->with('error', 'LinkedIn is not connected');
        $pref = DB::table('user_schedule_preferences')->where('user_id', $user->id)->first();
        $slots = DB::table('user_preferred_timeslots')
            ->where('user_id', $user->id)
            ->where('active', true)
            ->orderBy('iso_day_of_week')
            ->orderBy('minutes_from_midnight')
            ->get();
        if (!$pref || $slots->isEmpty()) return back()->with('error', 'No preferred timeslots configured');
        $lead = (int) ($pref->lead_time_minutes ?? 30);
        $tz = (string) ($pref->timezone ?? 'UTC');
        $candidate = now($tz)->addMinutes($lead);
        $next = $this->nextAvailableSlot($slots, $candidate);
        if (!$next) return back()->with('error', 'No available timeslot');
        DB::table('posts')->where('id', $post->id)->update([
            'scheduled_at' => $next->utc(),
            'schedule_status' => 'scheduled',
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'schedule_attempts' => 0,
            'schedule_next_attempt_at' => null,
            'updated_at' => now(),
        ]);
        return back()->with('status', 'Post auto-scheduled.');
    }

    public function autoScheduleProject(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $payload = $request->validate([
            'ids' => ['nullable', 'array', 'min:1'],
            'ids.*' => ['uuid'],
        ]);

        $selectedIds = collect($payload['ids'] ?? [])->filter()->map(fn ($id) => (string) $id)->unique();

        $user = $request->user();
        if (! $user->linkedin_token) {
            return back()->with('error', 'LinkedIn is not connected');
        }

        $pref = DB::table('user_schedule_preferences')->where('user_id', $user->id)->first();
        $slots = DB::table('user_preferred_timeslots')
            ->where('user_id', $user->id)
            ->where('active', true)
            ->orderBy('iso_day_of_week')
            ->orderBy('minutes_from_midnight')
            ->get();

        if (! $pref || $slots->isEmpty()) {
            return back()->with('error', 'No preferred timeslots configured');
        }

        $lead = (int) ($pref->lead_time_minutes ?? 30);
        $tz = (string) ($pref->timezone ?? 'UTC');

        $eligiblePosts = DB::table('posts')
            ->where('project_id', $project->id)
            ->where('status', 'approved')
            ->whereNull('scheduled_at')
            ->when($selectedIds->isNotEmpty(), fn ($query) => $query->whereIn('id', $selectedIds->all()))
            ->get();

        if ($eligiblePosts->isEmpty()) {
            if ($selectedIds->isNotEmpty()) {
                return back()->with('error', 'Selected posts must be approved and unscheduled before auto-scheduling.');
            }

            return back()->with('error', 'No approved posts ready for auto-scheduling.');
        }

        $scheduled = 0;
        $candidate = now($tz)->addMinutes($lead);

        foreach ($eligiblePosts as $post) {
            $next = $this->nextAvailableSlot($slots, $candidate);
            if (! $next) {
                break;
            }

            // Nudge candidate just past this slot (no arbitrary 5-minute jump)
            $candidate = $next->copy()->addSecond();

            DB::table('posts')->where('id', $post->id)->update([
                'scheduled_at' => $next->utc(),
                'schedule_status' => 'scheduled',
                'schedule_error' => null,
                'schedule_attempted_at' => null,
                'schedule_attempts' => 0,
                'schedule_next_attempt_at' => null,
                'updated_at' => now(),
            ]);

            $scheduled++;
        }

        if ($scheduled === 0) {
            return back()->with('error', 'No available timeslot');
        }

        return back()->with('status', "Auto-scheduled {$scheduled} posts.");
    }

    // Hook Workbench + frameworks (JSON for Inertia UI)
    public function frameworks()
    {
        $frameworks = [
            [ 'id' => 'problem-agitate', 'label' => 'Problem → Agitate', 'description' => 'Start with the painful status quo, then intensify it.', 'example' => 'Most coaches post daily and still hear crickets. Here’s the brutal reason no one told you.', 'tags' => ['pain','urgency'] ],
            [ 'id' => 'contrarian-flip', 'label' => 'Contrarian Flip', 'description' => 'Challenge a common belief with a bold reversal.', 'example' => 'The worst advice in coaching? “Nurture every lead.” Here’s why that’s killing your pipeline.', 'tags' => ['contrarian','pattern interrupt'] ],
            [ 'id' => 'data-jolt', 'label' => 'Data Jolt', 'description' => 'Lead with a specific metric that reframes risk/opportunity.', 'example' => '87% of our inbound leads ghosted… until we changed one sentence in our opener.', 'tags' => ['proof','specificity'] ],
            [ 'id' => 'confession-to-lesson', 'label' => 'Confession → Lesson', 'description' => 'Offer a vulnerable admission, then hint at the transformation.', 'example' => 'I almost shut down my practice last year. The fix took 12 minutes a week.', 'tags' => ['story','vulnerability'] ],
            [ 'id' => 'myth-bust', 'label' => 'Myth Bust', 'description' => 'Expose a beloved myth and tease the unexpected truth.', 'example' => '“Add more value” is not why prospects ignore you. This is.', 'tags' => ['belief shift','clarity'] ],
            [ 'id' => 'micro-case', 'label' => 'Micro Case Study', 'description' => 'Compress a before→after story into two lines.', 'example' => 'Session 1: 14% close rate. Session 6: 61%. Same offer. Different first sentence.', 'tags' => ['credibility','outcomes'] ],
        ];
        return response()->json(['frameworks' => $frameworks]);
    }

    public function hookWorkbench(Request $request, \App\Models\Post $post)
    {
        $row = DB::table('posts')->where('id', $post->id)->first();
        if (!$row) {
            return response()->json(['error' => 'Not found'], 404);
        }
        $project = DB::table('content_projects')->select('id','user_id','transcript_original')->where('id', $row->project_id)->first();
        if (!$project || (string)$project->user_id !== (string)$request->user()->id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'frameworkIds' => ['nullable','array'],
            'customFocus' => ['nullable','string','max:240'],
            'count' => ['nullable','integer','min:1','max:8'],
        ]);
        $count = isset($data['count']) ? max(1, min(8, (int)$data['count'])) : 4;

        $frameworks = [
            [ 'id' => 'problem-agitate', 'label' => 'Problem → Agitate', 'description' => '', 'example' => '', 'tags' => [] ],
            [ 'id' => 'contrarian-flip', 'label' => 'Contrarian Flip', 'description' => '', 'example' => '', 'tags' => [] ],
            [ 'id' => 'data-jolt', 'label' => 'Data Jolt', 'description' => '', 'example' => '', 'tags' => [] ],
            [ 'id' => 'confession-to-lesson', 'label' => 'Confession → Lesson', 'description' => '', 'example' => '', 'tags' => [] ],
            [ 'id' => 'myth-bust', 'label' => 'Myth Bust', 'description' => '', 'example' => '', 'tags' => [] ],
            [ 'id' => 'micro-case', 'label' => 'Micro Case Study', 'description' => '', 'example' => '', 'tags' => [] ],
        ];
        $frameworkMap = [];
        foreach ($frameworks as $fw) { $frameworkMap[$fw['id']] = $fw; }

        $selected = [];
        if (!empty($data['frameworkIds']) && is_array($data['frameworkIds'])) {
            foreach ($data['frameworkIds'] as $idv) {
                $idv = (string)$idv;
                if (isset($frameworkMap[$idv])) $selected[] = $frameworkMap[$idv];
            }
        }
        if (empty($selected)) { $selected = array_slice($frameworks, 0, 4); }

        if (empty($row->insight_id)) {
            return response()->json(['error' => 'Hooks require an insight-backed post'], 422);
        }
        $insightRow = DB::table('insights')->select('content')->where('id',$row->insight_id)->where('project_id',$row->project_id)->first();
        if (!$insightRow) { return response()->json(['error' => 'Insight not found for post'], 404); }

        $library = array_map(function($fw){ return '- '.$fw['id'].': '.$fw['label'].' → '.$fw['description']; }, $selected);
        $transcript = (string) ($project->transcript_original ?? '');

        $base = [
            'You are a hook strategist for high-performing LinkedIn posts.',
            'Generate scroll-stopping opening lines (<= 210 characters, 1-2 sentences, no emojis).',
            "Produce {$count} options.",
            'Each option must follow one of the approved frameworks below. Match the tone to the audience of executive coaches & consultants.',
            'For every hook, score curiosity and value alignment (0-100). Provide a short rationale.',
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
            mb_substr((string) $row->content,0,220),
        ];
        if (!empty($data['customFocus'])) { $base[]=''; $base[]='Audience Focus: '.mb_substr((string)$data['customFocus'],0,240); }
        $base[]=''; $base[]='Remember: respond with JSON only.';
        $prompt = implode("\n", $base);

        $ai = app(\App\Services\AiService::class);
        $json = $ai->generateJson([
            'prompt' => $prompt,
            'temperature' => 0.4,
            'action' => 'hook.workbench',
            'projectId' => (string) $project->id,
            'userId' => (string) $project->user_id,
        ]);

        $hooks = [];
        foreach (($json['hooks'] ?? []) as $h) {
            if (!is_array($h)) continue;
            $fwId = (string)($h['frameworkId'] ?? ($selected[0]['id'] ?? 'custom'));
            $fw = $frameworkMap[$fwId] ?? null;
            $hooks[] = [
                'id' => isset($h['id']) ? (string)$h['id'] : (string) \Illuminate\Support\Str::uuid(),
                'frameworkId' => $fw ? $fw['id'] : $fwId,
                'label' => $fw['label'] ?? (string)($h['label'] ?? 'Hook'),
                'hook' => mb_substr((string)($h['hook'] ?? ''),0,210),
                'curiosity' => max(0, min(100, (int)($h['curiosity'] ?? 50))),
                'valueAlignment' => max(0, min(100, (int)($h['valueAlignment'] ?? 50))),
                'rationale' => mb_substr((string)($h['rationale'] ?? ''),0,360),
            ];
        }
        if (empty($hooks)) { return response()->json(['error'=>'No hooks generated'],422); }
        $recommendedId = is_string(($json['recommendedId'] ?? null)) ? (string)$json['recommendedId'] : null;
        if (!$recommendedId || !collect($hooks)->firstWhere('id',$recommendedId)) {
            $best = null; $bestScore = -1; foreach ($hooks as $h) { $s=(int) round(($h['curiosity']+$h['valueAlignment'])/2); if ($s>$bestScore){$bestScore=$s;$best=$h;} }
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
