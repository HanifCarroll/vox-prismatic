<?php

namespace App\Http\Controllers;

use App\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

/**
 * @tags LinkedIn
 */
class LinkedInController extends Controller
{
    private function oauthConfigured(): bool
    {
        return (bool) (env('LINKEDIN_CLIENT_ID') && env('LINKEDIN_CLIENT_SECRET') && env('LINKEDIN_REDIRECT_URI'));
    }

    public function auth(Request $request): JsonResponse
    {
        if (!$this->oauthConfigured()) {
            return response()->json(['error'=>'LinkedIn OAuth is not configured','code'=>'INVALID_INPUT','status'=>422],422);
        }
        $user = $request->user();
        $state = Str::random(48);
        Cache::put('linkedin_state:'.$state, ['userId'=>(string)$user->id], now()->addMinutes(10));
        $driver = Socialite::driver('linkedin')
            ->stateless()
            ->scopes(['openid', 'profile', 'email', 'w_member_social'])
            ->with(['state' => $state]);
        $url = $driver->redirect()->getTargetUrl();
        Log::info('linkedin.oauth.start', ['user_id' => $user->id]);
        return response()->json(['url'=>$url]);
    }

    public function callback(Request $request)
    {
        $code = $request->query('code');
        $state = $request->query('state');
        $feUrl = env('LINKEDIN_FE_REDIRECT_URL');
        try {
            if (!$code || !$state) throw new \Exception('Missing code or state');
            $cache = Cache::pull('linkedin_state:'.$state);
            if (!$cache || !isset($cache['userId'])) throw new \Exception('Invalid state');
            if (!$this->oauthConfigured()) throw new \Exception('LinkedIn OAuth is not configured');
            $userId = $cache['userId'];
            $user = DB::table('users')->where('id',$userId)->first();
            if (!$user) throw new \Exception('User not found');
            $socialiteUser = Socialite::driver('linkedin')->stateless()->user();
            $accessToken = $socialiteUser->token;
            if (!$accessToken) throw new \Exception('Invalid token response');
            $memberId = $socialiteUser->getId();
            if (!$memberId) {
                $infoResp = Http::withToken($accessToken)->get('https://api.linkedin.com/v2/userinfo');
                $memberId = $infoResp->ok() ? (string) ($infoResp->json('sub') ?? '') : null;
            }
            DB::table('users')->where('id',$userId)->update([
                'linkedin_token' => $accessToken,
                'linkedin_id' => $memberId,
                'linkedin_connected_at' => now(),
            ]);
            Log::info('linkedin.oauth.callback.success', ['user_id' => $userId]);
            if ($feUrl) {
                $u = $feUrl; $sep = str_contains($u,'?')?'&':'?';
                return redirect($u.$sep.'status=connected');
            }
            return response()->json(['connected'=>true]);
        } catch (\Throwable $e) {
            Log::warning('linkedin.oauth.callback.error', [
                'error' => $e->getMessage(),
            ]);
            if ($feUrl) {
                $u = $feUrl; $sep = str_contains($u,'?')?'&':'?';
                $u = $u.$sep.'status=error';
                if (app()->environment('local')) $u .= '&message='.urlencode($e->getMessage());
                return redirect($u);
            }
            return response()->json(['error'=>'LinkedIn callback failed','code'=>'INVALID_INPUT','status'=>400],400);
        }
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json(['connected'=> (bool) $user->linkedin_token]);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();
        DB::table('users')->where('id',$user->id)->update(['linkedin_token'=>null,'linkedin_id'=>null]);
        Log::info('linkedin.disconnect', ['user_id' => $user->id]);
        return response()->json(['connected'=>false]);
    }
}
