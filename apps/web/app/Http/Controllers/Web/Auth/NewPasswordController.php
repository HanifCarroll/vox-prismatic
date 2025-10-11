<?php

namespace App\Http\Controllers\Web\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    public function create(Request $request, string $token): Response|RedirectResponse
    {
        if ($request->user()) {
            return redirect()->route('projects.index');
        }

        $email = Str::of($request->input('email', ''))->trim()->lower()->value();

        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => $email,
            'status' => session('status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => [
                'required',
                PasswordRule::min(12)->letters()->mixedCase()->numbers()->symbols()->uncompromised(),
            ],
            'password_confirmation' => ['required', 'same:password'],
        ]);

        $email = Str::of($validated['email'])->lower()->trim()->value();

        $status = Password::reset(
            [
                'email' => $email,
                'password' => $validated['password'],
                'password_confirmation' => $validated['password_confirmation'],
                'token' => $validated['token'],
            ],
            function ($user) use ($validated) {
                $user->forceFill([
                    'password' => Hash::make($validated['password']),
                ]);

                $user->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            },
        );

        if ($status === Password::PASSWORD_RESET) {
            return redirect()->route('login')->with('status', __('Your password has been reset.'));
        }

        throw ValidationException::withMessages([
            'email' => __($status),
        ]);
    }
}
