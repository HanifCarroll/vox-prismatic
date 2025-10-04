<?php

namespace App\Http\Controllers;

use App\Exceptions\ForbiddenException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @tags Admin
 */
class AdminController extends Controller
{
    private function ensureAdmin(Request $request): void
    {
        if (!$request->user()?->is_admin) throw new ForbiddenException('Admin access required');
    }

    public function usage(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $from = $request->query('from'); $to = $request->query('to');
        $qb = DB::table('ai_usage_events')->select('user_id','cost_usd','created_at');
        if ($from) $qb->where('created_at','>=',$from);
        if ($to) $qb->where('created_at','<=',$to);
        $events = $qb->get();
        // users
        $profiles = DB::table('users')->select(
            'id','name','stripe_customer_id','subscription_status','subscription_plan','subscription_current_period_end','cancel_at_period_end','trial_ends_at','trial_notes','email'
        )->get();
        $byUser = [];
        foreach ($profiles as $p) {
            $byUser[(string)$p->id] = [
                'userId' => (string)$p->id,
                'email' => $p->email,
                'name' => $p->name ?? '',
                'totalCostUsd' => 0,
                'totalActions' => 0,
                'lastActionAt' => null,
                'subscriptionStatus' => $p->subscription_status,
                'subscriptionPlan' => $p->subscription_plan,
                'subscriptionCurrentPeriodEnd' => $p->subscription_current_period_end,
                'cancelAtPeriodEnd' => (bool)$p->cancel_at_period_end,
                'trialEndsAt' => $p->trial_ends_at,
                'stripeCustomerId' => $p->stripe_customer_id,
                'trialNotes' => $p->trial_notes,
            ];
        }
        foreach ($events as $e) {
            $uid = $e->user_id; if (!$uid) continue;
            $row = $byUser[$uid] ?? ($byUser[$uid] = ['userId'=>$uid,'email'=>'','name'=>'','totalCostUsd'=>0,'totalActions'=>0,'lastActionAt'=>null]);
            $row['totalCostUsd'] += (float) $e->cost_usd;
            $row['totalActions'] += 1;
            $t = new \DateTime((string)$e->created_at);
            if (!$row['lastActionAt'] || $t > $row['lastActionAt']) $row['lastActionAt'] = $t;
            $byUser[$uid] = $row;
        }
        $usage = array_values($byUser);
        usort($usage, fn($a,$b) => strcmp((string)$a['name'], (string)$b['name']));
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
}

