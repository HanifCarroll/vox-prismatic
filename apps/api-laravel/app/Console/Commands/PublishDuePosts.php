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
        $now = now()->toISOString();
        $due = DB::table('posts')
            ->where('scheduled_at','<=',$now)
            ->where('status','approved')
            ->where('schedule_status','scheduled')
            ->orderBy('scheduled_at')
            ->limit($limit)->get();
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
                $resp = Http::withToken($token)->asJson()->post('https://api.linkedin.com/v2/ugcPosts', $ugcPayload);
                if (!$resp->ok()) throw new \Exception('linkedin_publish_failed');
                DB::table('posts')->where('id',$p->id)->update(['status'=>'published','published_at'=>now(),'schedule_status'=>null,'schedule_error'=>null,'schedule_attempted_at'=>now()]);
                $published++;
            } catch (\Throwable $e) {
                $failed++;
                $msg = $e->getMessage();
                DB::table('posts')->where('id',$p->id)->update(['schedule_status'=>'failed','schedule_error'=>$msg,'schedule_attempted_at'=>now()]);
                Log::warning('post_publish_failed', ['post'=>$p->id,'error'=>$msg]);
            }
        }
        $this->info("attempted={$attempted} published={$published} failed={$failed}");
        return self::SUCCESS;
    }
}

