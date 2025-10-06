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

    public function callback(Request $request)
    {
        if (!$this->oauthConfigured()) {
            return redirect()->route('settings.index', ['section' => 'integrations'])->with('error', 'LinkedIn OAuth is not configured.');
        }
        try {
            $code = $request->query('code');
            $state = $request->query('state');
            $error = $request->query('error');
            $errorDescription = $request->query('error_description');
            if ($error) {
                throw new \Exception('LinkedIn OAuth error: ' . $error . ' - ' . ($errorDescription ?? ''));
            }
            if (!$code || !$state) throw new \Exception('Missing code or state');
            $cache = Cache::pull('linkedin_state:'.$state);
            if (!$cache || !isset($cache['userId'])) throw new \Exception('Invalid state');
            $userId = $cache['userId'];
            if ((string) $request->user()->id !== (string) $userId) {
                throw new \Exception('Mismatched session user');
            }
            $socialiteUser = Socialite::driver('linkedin')->stateless()->user();
            $accessToken = $socialiteUser->token;
            if (!$accessToken) throw new \Exception('Invalid token response');
            $memberId = $socialiteUser->getId();
            if (!$memberId) {
                $infoResp = \Illuminate\Support\Facades\Http::withToken($accessToken)->get('https://api.linkedin.com/v2/userinfo');
                $memberId = $infoResp->ok() ? (string) ($infoResp->json('sub') ?? '') : null;
            }
            \Illuminate\Support\Facades\DB::table('users')->where('id',$userId)->update([
                'linkedin_token' => $accessToken,
                'linkedin_id' => $memberId,
                'linkedin_connected_at' => now(),
            ]);
            return redirect()->route('settings.index', ['section' => 'integrations'])->with('status', 'Connected to LinkedIn.');
        } catch (\Throwable $e) {
            return redirect()->route('settings.index', ['section' => 'integrations'])->with('error', 'LinkedIn connection failed.');
        }
    }
}
