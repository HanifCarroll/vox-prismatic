<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserStyleProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password as PasswordRule;

/**
 * @tags Settings
 */
class SettingsController extends Controller
{
    private function userPayload(User $u): array
    {
        return [
            'id' => (string) $u->id,
            'email' => $u->email,
            'name' => $u->name,
            'createdAt' => $u->created_at,
            'isAdmin' => (bool) $u->is_admin,
            'stripeCustomerId' => $u->stripe_customer_id,
            'stripeSubscriptionId' => $u->stripe_subscription_id,
            'subscriptionStatus' => $u->subscription_status,
            'subscriptionPlan' => $u->subscription_plan,
            'subscriptionCurrentPeriodEnd' => $u->subscription_current_period_end,
            'cancelAtPeriodEnd' => (bool) $u->cancel_at_period_end,
            'trialEndsAt' => $u->trial_ends_at,
            'trialNotes' => $u->trial_notes,
        ];
    }

    public function profile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate([
            'name' => ['nullable','string','max:255'],
            'email' => ['nullable','email'],
        ]);
        if (array_key_exists('name', $data)) { $user->name = $data['name']; }
        if (array_key_exists('email', $data)) { $user->email = strtolower(trim($data['email'])); }
        $user->save();
        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate([
            'currentPassword' => ['required','current_password:web'],
            'newPassword' => [
                'required',
                'string',
                PasswordRule::min(12)->letters()->mixedCase()->numbers()->symbols()->uncompromised(),
                'same:newPasswordConfirmation',
            ],
            'newPasswordConfirmation' => ['required','string'],
        ]);
        $user->password = Hash::make($data['newPassword']);
        $user->save();
        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function getStyle(Request $request): JsonResponse
    {
        $user = $request->user();
        $row = UserStyleProfile::query()->where('user_id',$user->id)->first();
        return response()->json(['style' => $row?->style ?? null]);
    }

    public function putStyle(Request $request): JsonResponse
    {
        $data = $request->validate(['style' => ['required','array']]);
        $user = $request->user();
        $exists = UserStyleProfile::query()->where('user_id',$user->id)->exists();
        if ($exists) {
            DB::table('user_style_profiles')->where('user_id',$user->id)->update(['style' => json_encode($data['style']),'updated_at'=>now()]);
        } else {
            DB::table('user_style_profiles')->insert(['user_id'=>$user->id,'style'=>json_encode($data['style']),'created_at'=>now(),'updated_at'=>now()]);
        }
        return response()->json(['style' => $data['style']]);
    }

    public function deleteAccount(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'currentPassword' => ['required','current_password:web'],
            'confirm' => ['required','in:DELETE'],
        ]);

        $userId = (string) $user->id;

        // Attempt to cancel any active Stripe subscription immediately
        try {
            $sub = $user->subscription('default');
            if ($sub && ($sub->valid() || $sub->onTrial())) {
                $sub->cancelNow();
            }
        } catch (\Throwable $e) {
            // Non-fatal: proceed with deletion even if Stripe cancellation fails
            // Error details will be logged by exception handler in local env
        }

        // Collect project IDs for cleanup of auxiliary tables without FKs
        $projectIds = DB::table('content_projects')->where('user_id', $userId)->pluck('id')->all();

        DB::transaction(function () use ($userId, $projectIds): void {
            // Clean up AI usage records (no FKs)
            DB::table('ai_usage_events')->where('user_id', $userId)->delete();
            if (!empty($projectIds)) {
                DB::table('ai_usage_events')->whereIn('project_id', $projectIds)->delete();
            }

            // Deleting the user will cascade to content_projects, insights, posts, and user_* tables via FKs
            DB::table('users')->where('id', $userId)->delete();
        });

        // Proactively log out and invalidate session cookies
        \Illuminate\Support\Facades\Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['success' => true]);
    }
}
