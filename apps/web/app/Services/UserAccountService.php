<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserAccountService
{
    public function deleteUser(User $user, bool $cancelSubscription = true): void
    {
        if ($cancelSubscription) {
            $this->cancelSubscription($user);
        }

        $this->removeUserRecords((string) $user->id);
    }

    public function deleteUserById(string $userId, bool $cancelSubscription = true): bool
    {
        /** @var User|null $user */
        $user = User::query()->find($userId);
        if (!$user) {
            return false;
        }

        $this->deleteUser($user, $cancelSubscription);

        return true;
    }

    private function cancelSubscription(User $user): void
    {
        try {
            $subscription = $user->subscription('default');
            if ($subscription && ($subscription->valid() || $subscription->onTrial())) {
                $subscription->cancelNow();
            }
        } catch (\Throwable $exception) {
            Log::warning('admin.user_deletion.subscription_cancel_failed', [
                'user_id' => (string) $user->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function removeUserRecords(string $userId): void
    {
        $projectIds = DB::table('content_projects')->where('user_id', $userId)->pluck('id')->all();

        DB::transaction(function () use ($userId, $projectIds): void {
            DB::table('ai_usage_events')->where('user_id', $userId)->delete();
            if (!empty($projectIds)) {
                DB::table('ai_usage_events')->whereIn('project_id', $projectIds)->delete();
            }

            DB::table('users')->where('id', $userId)->delete();
        });
    }
}
