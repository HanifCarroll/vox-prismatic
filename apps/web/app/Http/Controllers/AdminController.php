<?php

namespace App\Http\Controllers;

use App\Exceptions\ForbiddenException;
use App\Services\AdminUsageService;
use App\Services\UserAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @tags Admin
 */
class AdminController extends Controller
{
    public function __construct(
        private readonly AdminUsageService $usageService,
        private readonly UserAccountService $userAccountService,
    ) {
    }

    private function ensureAdmin(Request $request): void
    {
        if (!$request->user()?->is_admin) throw new ForbiddenException('Admin access required');
    }

    public function usage(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $from = $request->query('from');
        $to = $request->query('to');

        $fromCarbon = $from ? Carbon::parse($from) : null;
        $toCarbon = $to ? Carbon::parse($to) : null;

        $usage = $this->usageService->summarize($fromCarbon, $toCarbon);

        return response()->json(['usage' => $usage]);
    }

    public function updateTrial(Request $request, string $userId): JsonResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate(['trialEndsAt'=>['nullable','date'],'trialNotes'=>['nullable','string','max:500']]);
        $user = DB::table('users')->where('id',$userId)->first();
        if (!$user) return response()->json(['error'=>'User not found','code'=>'NOT_FOUND','status'=>404],404);
        $now = now();
        $trialEndsAt = isset($data['trialEndsAt']) ? new \DateTime($data['trialEndsAt']) : null;
        $hasActive = $user->stripe_subscription_id && $user->subscription_status === 'active';
        $trialInFuture = $trialEndsAt && $trialEndsAt->getTimestamp() > $now->getTimestamp();
        $nextStatus = null;
        if (!$hasActive) {
            if ($trialInFuture) $nextStatus = 'trialing';
            else if (!$trialEndsAt && $user->subscription_status === 'trialing') $nextStatus = 'inactive';
            else if ($trialEndsAt && $trialEndsAt->getTimestamp() <= $now->getTimestamp() && $user->subscription_status === 'trialing') $nextStatus = 'inactive';
        }
        $payload = [
            'trial_ends_at' => $trialEndsAt ? $trialEndsAt->format('c') : null,
            'trial_notes' => $data['trialNotes'] ?? null,
            'updated_at' => $now,
        ];
        if ($nextStatus) $payload['subscription_status'] = $nextStatus;
        DB::table('users')->where('id',$userId)->update($payload);
        $updated = DB::table('users')->where('id',$userId)->first();
        return response()->json(['user' => $updated]);
    }

    public function destroyUser(Request $request, string $userId): JsonResponse
    {
        $this->ensureAdmin($request);

        if ((string) $request->user()->id === $userId) {
            return response()->json([
                'error' => 'Admins cannot delete their own account from this panel.',
                'code' => 'CANNOT_DELETE_SELF',
                'status' => 422,
            ], 422);
        }

        $deleted = $this->userAccountService->deleteUserById($userId, cancelSubscription: true);

        if (!$deleted) {
            return response()->json([
                'error' => 'User not found',
                'code' => 'NOT_FOUND',
                'status' => 404,
            ], 404);
        }

        return response()->json(['deleted' => true]);
    }
}
