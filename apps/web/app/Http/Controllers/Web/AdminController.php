<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Services\AdminUsageService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function __construct(private readonly AdminUsageService $usageService)
    {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        if (!$user?->is_admin) {
            abort(403);
        }

        $rangePreset = '30d';
        $now = Carbon::now();
        $from = $now->copy()->subDays(30);

        $usage = $this->usageService->summarize($from, $now);

        return Inertia::render('Admin/Index', [
            'initialRange' => $rangePreset,
            'initialFrom' => $from->toAtomString(),
            'initialTo' => $now->toAtomString(),
            'initialUsage' => $usage,
        ]);
    }

    // JSON endpoints for Inertia UI
    public function usage(Request $request)
    {
        $user = $request->user();
        if (!$user?->is_admin) {
            abort(403);
        }

        $from = $request->query('from');
        $to = $request->query('to');
        $fromCarbon = $from ? \Illuminate\Support\Carbon::parse($from) : null;
        $toCarbon = $to ? \Illuminate\Support\Carbon::parse($to) : null;

        $usage = $this->usageService->summarize($fromCarbon, $toCarbon);
        return response()->json(['usage' => $usage]);
    }

    public function updateTrial(Request $request, string $userId)
    {
        $user = $request->user();
        if (!$user?->is_admin) {
            abort(403);
        }

        $data = $request->validate([
            'trialEndsAt' => ['nullable','date'],
            'trialNotes' => ['nullable','string','max:500'],
        ]);

        $now = now();
        $row = \Illuminate\Support\Facades\DB::table('users')->where('id', $userId)->first();
        if (!$row) {
            return response()->json(['error' => 'User not found'], 404);
        }
        $trialEndsAt = isset($data['trialEndsAt']) ? new \DateTime($data['trialEndsAt']) : null;
        $hasActive = $row->stripe_subscription_id && $row->subscription_status === 'active';
        $trialInFuture = $trialEndsAt && $trialEndsAt->getTimestamp() > $now->getTimestamp();
        $nextStatus = null;
        if (!$hasActive) {
            if ($trialInFuture) $nextStatus = 'trialing';
            else if (!$trialEndsAt && $row->subscription_status === 'trialing') $nextStatus = 'inactive';
            else if ($trialEndsAt && $trialEndsAt->getTimestamp() <= $now->getTimestamp() && $row->subscription_status === 'trialing') $nextStatus = 'inactive';
        }
        $payload = [
            'trial_ends_at' => $trialEndsAt ? $trialEndsAt->format('c') : null,
            'trial_notes' => $data['trialNotes'] ?? null,
            'updated_at' => $now,
        ];
        if ($nextStatus) $payload['subscription_status'] = $nextStatus;
        \Illuminate\Support\Facades\DB::table('users')->where('id', $userId)->update($payload);
        $updated = \Illuminate\Support\Facades\DB::table('users')->where('id', $userId)->first();

        return response()->json(['user' => $updated]);
    }

    public function destroyUser(Request $request, string $userId)
    {
        $user = $request->user();
        if (!$user?->is_admin) {
            abort(403);
        }
        if ((string) $user->id === $userId) {
            return response()->json(['error' => 'Admins cannot delete their own account from this panel.'], 422);
        }
        $deleted = app(\App\Services\UserAccountService::class)->deleteUserById($userId, cancelSubscription: true);
        if (!$deleted) {
            return response()->json(['error' => 'User not found'], 404);
        }
        return response()->json(['deleted' => true]);
    }
}
