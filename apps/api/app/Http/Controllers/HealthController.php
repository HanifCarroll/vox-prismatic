<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        $dbStatus = 'unknown';
        $dbError = null;
        try {
            DB::select('select 1');
            $dbStatus = 'connected';
        } catch (\Throwable $e) {
            $dbStatus = 'disconnected';
            $dbError = $e->getMessage();
        }

        return response()->json([
            'status' => $dbStatus === 'connected' ? 'ok' : 'degraded',
            'timestamp' => now()->toISOString(),
            'environment' => config('app.env'),
            'database' => array_filter([
                'status' => $dbStatus,
                'error' => $dbError,
            ]),
        ]);
    }
}

