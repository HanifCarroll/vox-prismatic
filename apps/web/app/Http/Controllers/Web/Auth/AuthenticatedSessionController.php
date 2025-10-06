<?php

namespace App\Http\Controllers\Web\Auth;

use App\Http\Controllers\Controller;
use App\Support\RegistrationMode;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->intended(route('projects.index'));
        }

        $mode = RegistrationMode::fromString(config('auth.registration_mode'));

        return Inertia::render('Auth/Login', [
            'canRegister' => $mode->allowsPublicSignup(),
            'isInviteOnly' => $mode->requiresInvite(),
            'contactEmail' => RegisteredUserController::CONTACT_EMAIL,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ]);

        $email = Str::of($validated['email'])->lower()->trim()->value();
        $credentials = [
            'email' => $email,
            'password' => $validated['password'],
        ];

        $remember = (bool) ($validated['remember'] ?? false);

        if (! Auth::attempt($credentials, $remember)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended(route('projects.index'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
