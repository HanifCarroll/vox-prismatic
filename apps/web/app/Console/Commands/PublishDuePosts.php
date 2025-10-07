<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PublishDuePosts extends Command
{
    protected $signature = 'posts:publish-due {--limit=10}';
    protected $description = 'Publish scheduled posts that are due';

    public function handle(): int
    {
        $limit = (int) $this->option('limit');
        // Use Carbon directly so the database driver handles proper binding/casting
        $now = now();
        $due = DB::table('posts')
            ->where('status', 'approved')
            ->where(function ($q) use ($now) {
                $q->where(function ($qq) use ($now) {
                    $qq->where('schedule_status', 'scheduled')
                        ->where('scheduled_at', '<=', $now);
                })->orWhere(function ($qq) use ($now) {
                    $qq->where('schedule_status', 'failed')
                        ->whereNotNull('schedule_next_attempt_at')
                        ->where('schedule_next_attempt_at', '<=', $now);
                });
            })
            ->orderByRaw('COALESCE(schedule_next_attempt_at, scheduled_at) asc')
            ->limit($limit)
            ->get();
        $attempted = 0; $published = 0; $failed = 0;
        foreach ($due as $p) {
            $attempted++;
            try {
                $project = DB::table('content_projects')->select('user_id')->where('id',$p->project_id)->first();
                $userId = $project?->user_id; if (!$userId) throw new \Exception('owner_not_found');
                $profile = DB::table('users')->select('linkedin_token','linkedin_id')->where('id',$userId)->first();
                $token = $profile?->linkedin_token; if (!$token) throw new \Exception('linkedin_not_connected');
                $member = $profile?->linkedin_id;
                if (!$member) {
                    $infoResp = Http::withToken($token)->get('https://api.linkedin.com/v2/userinfo');
                    if (!$infoResp->ok()) throw new \Exception('linkedin_userinfo_failed');
                    $member = (string) ($infoResp->json('sub') ?? '');
                    if ($member) DB::table('users')->where('id',$userId)->update(['linkedin_id'=>$member]);
                }
                $ugcPayload = [
                    'author' => 'urn:li:person:'.$member,
                    'lifecycleState' => 'PUBLISHED',
                    'specificContent' => ['com.linkedin.ugc.ShareContent' => ['shareCommentary' => ['text' => mb_substr($p->content,0,2999)], 'shareMediaCategory' => 'NONE']],
                    'visibility' => ['com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC'],
                ];
                $resp = Http::withToken($token)
                    ->withHeaders(['X-Restli-Protocol-Version' => '2.0.0'])
                    ->asJson()
                    ->post('https://api.linkedin.com/v2/ugcPosts', $ugcPayload);
                // LinkedIn responds with 201 Created on success; use successful() not ok()
                if (!$resp->successful()) {
                    throw new \Exception('linkedin_publish_failed');
                }
                DB::table('posts')->where('id', $p->id)->update([
                    'status' => 'published',
                    'published_at' => now(),
                    'schedule_status' => null,
                    'schedule_error' => null,
                    'schedule_attempted_at' => now(),
                    'schedule_attempts' => 0,
                    'schedule_next_attempt_at' => null,
                ]);
                $published++;
            } catch (\Throwable $e) {
                $failed++;
                $msg = (string) $e->getMessage();

                // Determine retry policy
                $attempts = (int) ($p->schedule_attempts ?? 0) + 1;
                $maxAttempts = 8;
                $permanent = in_array($msg, ['owner_not_found','linkedin_not_connected'], true);

                $next = null;
                if (!$permanent && $attempts < $maxAttempts) {
                    // Exponential backoff: base 5 min, max 6 hours, with +/- 30s jitter
                    $minutes = (int) min(pow(2, $attempts) * 5, 360);
                    $nextCarbon = now()->addMinutes($minutes);
                    try {
                        $jitter = random_int(-30, 30); // seconds
                    } catch (\Throwable $ex) {
                        $jitter = 0;
                    }
                    if ($jitter !== 0) {
                        $nextCarbon = $nextCarbon->addSeconds($jitter);
                    }
                    $next = $nextCarbon;
                }

                $payload = [
                    'schedule_status' => 'failed',
                    'schedule_error' => $msg,
                    'schedule_attempted_at' => now(),
                    'schedule_attempts' => $attempts,
                    'schedule_next_attempt_at' => $next,
                ];

                if (!$next) {
                    // If no next retry (permanent or max attempts), freeze attempt count and leave next_attempt null
                    // Optionally, we could append a marker to the error
                    $payload['schedule_error'] = $msg === '' ? 'failed' : $msg;
                }

                DB::table('posts')->where('id', $p->id)->update($payload);
                Log::warning('post_publish_failed', [
                    'post' => (string) $p->id,
                    'attempts' => $attempts,
                    'next_attempt_at' => $next ? $next->toIso8601String() : null,
                    'error' => $msg,
                ]);
            }
        }
        $this->info("attempted={$attempted} published={$published} failed={$failed}");
        return self::SUCCESS;
    }
}
