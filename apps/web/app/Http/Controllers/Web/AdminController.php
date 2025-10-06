<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Services\AdminUsageService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function __construct(private readonly AdminUsageService $usageService)
    {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        if (!$user?->is_admin) {
            abort(403);
        }

        $rangePreset = '30d';
        $now = Carbon::now();
        $from = $now->copy()->subDays(30);

        $usage = $this->usageService->summarize($from, $now);

        return Inertia::render('Admin/Index', [
            'initialRange' => $rangePreset,
            'initialFrom' => $from->toAtomString(),
            'initialTo' => $now->toAtomString(),
            'initialUsage' => $usage,
        ]);
    }
}
