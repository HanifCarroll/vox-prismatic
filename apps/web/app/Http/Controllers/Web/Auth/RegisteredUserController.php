<?php

namespace App\Http\Controllers\Web\Auth;

use App\Http\Controllers\Controller;
use App\Models\Invite;
use App\Models\User;
use App\Support\RegistrationMode;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public const CONTACT_EMAIL = 'hanifcarroll@gmail.com';

    public function create(Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->intended(route('projects.index'));
        }

        $mode = RegistrationMode::fromString(config('auth.registration_mode'));
        $bypassInvite = app()->environment('local') && $mode === RegistrationMode::Invite;

        if ($bypassInvite) {
            $mode = RegistrationMode::Open;
        }

        if ($mode === RegistrationMode::Closed) {
            abort(404);
        }

        $code = Str::of($request->query('code', ''))->trim()->value();

        return Inertia::render('Auth/Register', [
            'mode' => $mode->value,
            'contactEmail' => self::CONTACT_EMAIL,
            'code' => $code,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $mode = RegistrationMode::fromString(config('auth.registration_mode'));
        $bypassInvite = app()->environment('local') && $mode === RegistrationMode::Invite;

        if ($bypassInvite) {
            $mode = RegistrationMode::Open;
        }

        if ($mode === RegistrationMode::Closed) {
            abort(404);
        }

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email'],
            'password' => [
                'required',
                'string',
                Password::min(8)->letters()->mixedCase()->numbers()->symbols(),
            ],
        ];

        $codeLabel = 'invite code';
        if ($mode->requiresInvite()) {
            $rules['code'] = ['required', 'string', 'max:255'];
        } else {
            $rules['code'] = ['nullable', 'string', 'max:255'];
        }

        $validated = $request->validate($rules, [], [
            'email' => 'email address',
            'code' => $codeLabel,
        ]);

        $email = Str::of($validated['email'])->lower()->trim()->value();
        $name = Str::of($validated['name'])->trim()->value();
        $code = isset($validated['code']) ? Str::of($validated['code'])->trim()->value() : null;

        $user = DB::transaction(function () use ($mode, $email, $name, $validated, $code, $request) {
            if (User::query()->where('email', $email)->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'Email already registered.',
                ]);
            }

            $invite = null;

            if ($mode->requiresInvite()) {
                $invite = Invite::query()
                    ->where('code', $code)
                    ->lockForUpdate()
                    ->first();

                if (! $invite) {
                    throw ValidationException::withMessages([
                        'code' => 'Invalid invite code. Reach out to '.self::CONTACT_EMAIL.' for help.',
                    ]);
                }

                if (! $invite->matchesEmail($email)) {
                    throw ValidationException::withMessages([
                        'email' => 'This invite is reserved for a different email. Contact '.self::CONTACT_EMAIL.' for assistance.',
                    ]);
                }

                if ($invite->isExpired()) {
                    throw ValidationException::withMessages([
                        'code' => 'This invite has expired. Please contact '.self::CONTACT_EMAIL.' for a new one.',
                    ]);
                }

                if (! $invite->hasCapacity()) {
                    throw ValidationException::withMessages([
                        'code' => 'This invite has already been used.',
                    ]);
                }
            }

            $user = new User();
            $user->id = (string) Str::uuid();
            $user->name = $name;
            $user->email = $email;
            $user->password = Hash::make($validated['password']);
            if ($invite) {
                $user->invite_id = $invite->id;
                $user->invited_by = $invite->created_by;
            }
            $user->save();

            if ($invite && ! $invite->consume()) {
                throw ValidationException::withMessages([
                    'code' => 'This invite has already been used.',
                ]);
            }

            Log::info('auth.register.success.inertia', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
                'invite_id' => $invite?->id,
            ]);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('projects.index'));
    }
}
