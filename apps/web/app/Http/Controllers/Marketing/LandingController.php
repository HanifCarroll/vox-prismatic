<?php

namespace App\Http\Controllers\Marketing;

use App\Http\Controllers\Controller;
use App\Models\BetaSignup;
use App\Services\KitNewsletterService;
use Illuminate\Http\JsonResponse;
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

    public function waitlist(Request $request, KitNewsletterService $kitNewsletterService): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'linkedin_url' => ['required', 'string', 'max:255', 'url:http,https'],
        ]);

        $name = trim($validated['name']);
        $email = strtolower(trim($validated['email']));
        $linkedinUrl = trim($validated['linkedin_url']);

        $signup = BetaSignup::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'linkedin_url' => $linkedinUrl,
                'ip_address' => $request->ip(),
            ]
        );

        Log::info('marketing.waitlist.signup', [
            'name' => $signup->name,
            'email' => $signup->email,
            'linkedin_url' => $signup->linkedin_url,
            'ip' => $signup->ip_address,
            'user_agent' => $request->userAgent(),
        ]);

        $kitNewsletterService->subscribe(
            $email,
            $name,
            $linkedinUrl,
            $request->headers->get('referer')
        );

        $message = 'Thanks! We will let you know when the beta opens up.';

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
            ]);
        }

        return back()->with('waitlist_success', $message);
    }
}
