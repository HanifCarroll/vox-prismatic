<?php

namespace App\Http\Controllers;

use App\Exceptions\UnauthorizedException;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
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

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        Log::info('auth.logout', [
            'user_id' => $request->user()?->id,
            'ip' => $request->ip(),
        ]);
        return response()->json(['ok' => true]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required','email'],
            'name' => ['required','string','max:255'],
            'password' => [
                'required',
                'string',
                PasswordRule::min(12)->letters()->mixedCase()->numbers()->symbols()->uncompromised(),
            ],
        ]);
        $exists = User::where('email', strtolower(trim($data['email'])))->exists();
        if ($exists) {
            return response()->json([
                'error' => 'Email already registered',
                'code' => 'CONFLICT',
                'status' => 409,
            ], 409);
        }
        $user = new User();
        $user->id = (string) Str::uuid();
        $user->email = strtolower(trim($data['email']));
        $user->name = trim($data['name']);
        $user->password = Hash::make($data['password']);
        $user->save();
        // Reload to ensure DB defaults (e.g., subscription_status/plan) are present on the model
        $user->refresh();

        Auth::login($user);
        $request->session()->regenerate();
        Log::info('auth.register.success', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required','email'],
            'password' => ['required','string'],
            'remember' => ['sometimes','boolean'],
        ]);
        $credentials = ['email' => strtolower(trim($data['email'])), 'password' => $data['password']];
        $remember = isset($data['remember']) ? (bool) $data['remember'] : false;
        if (!Auth::attempt($credentials, $remember)) {
            throw new UnauthorizedException('Invalid credentials');
        }
        $request->session()->regenerate();
        /** @var User $user */
        $user = Auth::user();
        Log::info('auth.login.success', [
            'user_id' => $user->id,
            'remember' => $remember,
            'ip' => $request->ip(),
        ]);
        return response()->json(['user' => $this->userPayload($user)]);
    }
}
