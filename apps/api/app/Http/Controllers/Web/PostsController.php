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
        ]);
        $ids = array_map('strval', $data['ids']);
        $rows = DB::table('posts')
            ->whereIn(DB::raw('id::text'), $ids)
            ->where('project_id', $project->id)
            ->get();
        foreach ($rows as $p) {
            RegeneratePostsJob::dispatch((string) $p->id, (string) ($data['customInstructions'] ?? '') ?: null, (string) $request->user()->id);
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
            if (!$resp->ok()) {
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

        $resp = Http::withToken($token)->asJson()->post('https://api.linkedin.com/v2/ugcPosts', $ugcPayload);
        if (!$resp->ok()) {
            return back()->with('error', 'LinkedIn publish failed');
        }

        DB::table('posts')->where('id', $post->id)->update([
            'status' => 'published',
            'published_at' => now(),
            'schedule_status' => null,
            'schedule_error' => null,
            'schedule_attempted_at' => now(),
        ]);

        return back()->with('status', 'Post published.');
    }

    public function schedule(Request $request, ContentProject $project, Post $post): RedirectResponse
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
            'updated_at' => now(),
        ]);
        return back()->with('status', 'Post unscheduled.');
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
                $slotDate = $candidate->copy()->addDays($dayDiff)->setTime(intdiv($slotMinutes, 60), $slotMinutes % 60, 0);
                if ($slotDate->lessThan($candidate)) {
                    continue;
                }
                return $slotDate;
            }
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
        $slots = DB::table('user_preferred_timeslots')->where('user_id', $user->id)->where('active', true)->orderBy('iso_day_of_week')->orderBy('minutes_from_midnight')->get();
        if (!$pref || $slots->isEmpty()) return back()->with('error', 'No preferred timeslots configured');
        $lead = (int) ($pref->lead_time_minutes ?? 30);
        $candidate = now()->addMinutes($lead);
        $next = $this->nextAvailableSlot($slots, $candidate);
        if (!$next) return back()->with('error', 'No available timeslot');
        DB::table('posts')->where('id', $post->id)->update([
            'scheduled_at' => $next->utc(),
            'schedule_status' => 'scheduled',
            'schedule_error' => null,
            'schedule_attempted_at' => null,
            'updated_at' => now(),
        ]);
        return back()->with('status', 'Post auto-scheduled.');
    }

    public function autoScheduleProject(Request $request, ContentProject $project): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $user = $request->user();
        if (!$user->linkedin_token) return back()->with('error', 'LinkedIn is not connected');
        $pref = DB::table('user_schedule_preferences')->where('user_id', $user->id)->first();
        $slots = DB::table('user_preferred_timeslots')->where('user_id', $user->id)->where('active', true)->orderBy('iso_day_of_week')->orderBy('minutes_from_midnight')->get();
        if (!$pref || $slots->isEmpty()) return back()->with('error', 'No preferred timeslots configured');
        $lead = (int) ($pref->lead_time_minutes ?? 30);
        $approved = DB::table('posts')->where('project_id', $project->id)->where('status', 'approved')->whereNull('scheduled_at')->get();
        $scheduled = 0; $candidate = now()->addMinutes($lead);
        foreach ($approved as $p) {
            $next = $this->nextAvailableSlot($slots, $candidate);
            if (!$next) break;
            $candidate = $next->copy()->addMinutes(5);
            DB::table('posts')->where('id', $p->id)->update([
                'scheduled_at' => $next->utc(),
                'schedule_status' => 'scheduled',
                'schedule_error' => null,
                'schedule_attempted_at' => null,
                'updated_at' => now(),
            ]);
            $scheduled++;
        }
        if ($scheduled === 0) return back()->with('error', 'No available timeslot');
        return back()->with('status', "Auto-scheduled {$scheduled} posts.");
    }
}
