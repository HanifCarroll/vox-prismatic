<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = (string) $request->user()->id;
        $data = $request->validate(['days' => ['nullable', 'integer', 'min:1', 'max:365']]);
        $days = (int) ($data['days'] ?? 30);
        $since = now()->subDays($days);

        $rows = DB::table('posts')
            ->join('content_projects', 'content_projects.id', '=', 'posts.project_id')
            ->where('content_projects.user_id', $userId)
            ->where('posts.created_at', '>=', $since)
            ->select('posts.status', 'posts.hashtags', 'posts.created_at', 'posts.published_at', 'posts.scheduled_at')
            ->get();

        $statusCounts = ['pending' => 0, 'approved' => 0, 'rejected' => 0, 'published' => 0];
        $scheduledCount = 0;
        $publishedInPeriod = 0;
        $totalHours = 0;
        $publishCount = 0;
        $daily = [];

        foreach ($rows as $r) {
            $statusCounts[$r->status] = ($statusCounts[$r->status] ?? 0) + 1;
            if ($r->scheduled_at) {
                $scheduledCount++;
            }
            if ($r->published_at) {
                $publishedInPeriod++;
                $k = substr((string) $r->published_at, 0, 10);
                $daily[$k] = ($daily[$k] ?? 0) + 1;
                if ($r->created_at) {
                    $dh = ((strtotime((string) $r->published_at) - strtotime((string) $r->created_at)) / 3600);
                    if (is_finite($dh)) {
                        $totalHours += $dh;
                        $publishCount++;
                    }
                }
            }
        }

        ksort($daily);
        $dailyArr = array_map(fn ($k) => ['date' => $k, 'published' => $daily[$k]], array_keys($daily));

        $avg = $publishCount > 0 ? $totalHours / $publishCount : null;

        return Inertia::render('Analytics/Index', [
            'summary' => [
                'totalPosts' => count($rows),
                'statusCounts' => [
                    'pending' => $statusCounts['pending'] ?? 0,
                    'approved' => $statusCounts['approved'] ?? 0,
                    'rejected' => $statusCounts['rejected'] ?? 0,
                    'published' => $statusCounts['published'] ?? 0,
                ],
                'scheduledCount' => $scheduledCount,
                'publishedInPeriod' => $publishedInPeriod,
                'averageTimeToPublishHours' => $avg,
                'rangeDays' => $days,
            ],
            'daily' => $dailyArr,
        ]);
    }
}
