<?php

namespace App\Http\Controllers\Marketing;

use App\Http\Controllers\Controller;
use App\Models\BetaSignup;
use App\Services\KitNewsletterService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LandingController extends Controller
{
    public function home(Request $request)
    {
        if ($request->user()) {
            return redirect()->route('projects.index');
        }

        return view('marketing.home', [
            'waitlistSuccess' => session('waitlist_success'),
        ]);
    }

    public function waitlist(Request $request, KitNewsletterService $kitNewsletterService): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));

        $signup = BetaSignup::updateOrCreate(
            ['email' => $email],
            ['ip_address' => $request->ip()]
        );

        Log::info('marketing.waitlist.signup', [
            'email' => $signup->email,
            'ip' => $signup->ip_address,
            'user_agent' => $request->userAgent(),
        ]);

        $kitNewsletterService->subscribe(
            $email,
            $request->headers->get('referer')
        );

        return back()->with('waitlist_success', 'Thanks! We will let you know when the beta opens up.');
    }
}
