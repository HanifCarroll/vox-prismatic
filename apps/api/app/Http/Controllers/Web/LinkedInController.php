<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Inertia\Inertia;

class LinkedInController extends Controller
{
    private function oauthConfigured(): bool
    {
        return (bool) (env('LINKEDIN_CLIENT_ID') && env('LINKEDIN_CLIENT_SECRET') && env('LINKEDIN_REDIRECT_URI'));
    }

    public function auth(Request $request)
    {
        if (!$this->oauthConfigured()) {
            return redirect()->route('settings.index', ['tab' => 'integrations'])->with('error', 'LinkedIn OAuth is not configured.');
        }
        $user = $request->user();
        $state = Str::random(48);
        Cache::put('linkedin_state:'.$state, ['userId'=>(string)$user->id], now()->addMinutes(10));
        $driver = Socialite::driver('linkedin')
            ->stateless()
            ->scopes(['openid', 'profile', 'email', 'w_member_social'])
            ->with(['state' => $state]);
        $url = $driver->redirect()->getTargetUrl();
        Log::info('linkedin.oauth.start.web', ['user_id' => $user->id]);
        // If this is an Inertia visit (XHR), instruct client to perform a full redirect.
        // Otherwise, do a normal 302 so a hard navigation also works.
        if ($request->header('X-Inertia')) {
            return Inertia::location($url);
        }
        return redirect()->away($url);
    }
}
