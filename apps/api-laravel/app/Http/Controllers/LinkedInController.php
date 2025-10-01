<?php

namespace App\Http\Controllers;

use App\Exceptions\NotFoundException;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

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
        $params = http_build_query([
            'response_type' => 'code',
            'client_id' => env('LINKEDIN_CLIENT_ID'),
            'redirect_uri' => env('LINKEDIN_REDIRECT_URI'),
            'state' => $state,
            'scope' => 'openid profile email w_member_social',
        ]);
        $url = 'https://www.linkedin.com/oauth/v2/authorization?'.$params;
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
            $resp = Http::asForm()->post('https://www.linkedin.com/oauth/v2/accessToken', [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => env('LINKEDIN_REDIRECT_URI'),
                'client_id' => env('LINKEDIN_CLIENT_ID'),
                'client_secret' => env('LINKEDIN_CLIENT_SECRET'),
            ]);
            if (!$resp->ok()) throw new \Exception('Failed to exchange code for access token');
            $accessToken = $resp->json('access_token');
            if (!$accessToken) throw new \Exception('Invalid token response');
            $userId = $cache['userId'];
            $user = DB::table('users')->where('id',$userId)->first();
            if (!$user) throw new \Exception('User not found');
            // Fetch member id
            $infoResp = Http::withToken($accessToken)->get('https://api.linkedin.com/v2/userinfo');
            $memberId = $infoResp->ok() ? (string) ($infoResp->json('sub') ?? '') : null;
            DB::table('users')->where('id',$userId)->update([
                'linkedin_token' => $accessToken,
                'linkedin_id' => $memberId,
                'linkedin_connected_at' => now(),
            ]);
            if ($feUrl) {
                $u = $feUrl; $sep = str_contains($u,'?')?'&':'?';
                return redirect($u.$sep.'status=connected');
            }
            return response()->json(['connected'=>true]);
        } catch (\Throwable $e) {
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
        return response()->json(['connected'=>false]);
    }
}

