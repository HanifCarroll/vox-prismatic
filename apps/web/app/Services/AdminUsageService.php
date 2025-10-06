<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AdminUsageService
{
    /**
     * Build aggregated usage information for admin dashboards.
     */
    public function summarize(?Carbon $from = null, ?Carbon $to = null): array
    {
        $eventQuery = DB::table('ai_usage_events')
            ->select(['user_id', 'cost_usd', 'created_at']);

        if ($from) {
            $eventQuery->where('created_at', '>=', $from);
        }

        if ($to) {
            $eventQuery->where('created_at', '<=', $to);
        }

        $events = $eventQuery->get();

        /** @var \Illuminate\Support\Collection<int, object> $profiles */
        $profiles = DB::table('users')->select([
            'id',
            'email',
            'name',
            'stripe_customer_id',
            'subscription_status',
            'subscription_plan',
            'subscription_current_period_end',
            'cancel_at_period_end',
            'trial_ends_at',
            'trial_notes',
        ])->get();

        $byUser = [];

        foreach ($profiles as $profile) {
            $userId = (string) $profile->id;
            $byUser[$userId] = [
                'userId' => $userId,
                'email' => (string) ($profile->email ?? ''),
                'name' => $profile->name ? (string) $profile->name : '',
                'totalCostUsd' => 0.0,
                'totalActions' => 0,
                'lastActionAt' => null,
                'subscriptionStatus' => (string) ($profile->subscription_status ?? ''),
                'subscriptionPlan' => $profile->subscription_plan ? (string) $profile->subscription_plan : null,
                'subscriptionCurrentPeriodEnd' => $profile->subscription_current_period_end,
                'cancelAtPeriodEnd' => (bool) ($profile->cancel_at_period_end ?? false),
                'trialEndsAt' => $profile->trial_ends_at,
                'stripeCustomerId' => $profile->stripe_customer_id ? (string) $profile->stripe_customer_id : null,
                'trialNotes' => $profile->trial_notes ? (string) $profile->trial_notes : null,
            ];
        }

        foreach ($events as $event) {
            $userId = (string) ($event->user_id ?? '');
            if ($userId === '') {
                continue;
            }

            if (!isset($byUser[$userId])) {
                $byUser[$userId] = [
                    'userId' => $userId,
                    'email' => '',
                    'name' => '',
                    'totalCostUsd' => 0.0,
                    'totalActions' => 0,
                    'lastActionAt' => null,
                    'subscriptionStatus' => '',
                    'subscriptionPlan' => null,
                    'subscriptionCurrentPeriodEnd' => null,
                    'cancelAtPeriodEnd' => false,
                    'trialEndsAt' => null,
                    'stripeCustomerId' => null,
                    'trialNotes' => null,
                ];
            }

            $byUser[$userId]['totalCostUsd'] += (float) ($event->cost_usd ?? 0);
            $byUser[$userId]['totalActions'] += 1;

            $createdAt = Carbon::parse($event->created_at);
            $currentLast = $byUser[$userId]['lastActionAt'];

            if ($currentLast === null || Carbon::parse($currentLast)->lt($createdAt)) {
                $byUser[$userId]['lastActionAt'] = $createdAt->toAtomString();
            }
        }

        foreach ($byUser as &$row) {
            $row['totalCostUsd'] = round($row['totalCostUsd'], 6);
            $row['subscriptionCurrentPeriodEnd'] = $this->carbonOrNull($row['subscriptionCurrentPeriodEnd']);
            $row['trialEndsAt'] = $this->carbonOrNull($row['trialEndsAt']);
        }
        unset($row);

        usort($byUser, function (array $a, array $b): int {
            $nameA = strtolower($a['name'] ?? '');
            $nameB = strtolower($b['name'] ?? '');
            return $nameA <=> $nameB;
        });

        return $byUser;
    }

    private function carbonOrNull($value): ?string
    {
        if (!$value) {
            return null;
        }

        return Carbon::parse($value)->toAtomString();
    }
}
