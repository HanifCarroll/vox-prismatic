<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = (string) $request->user()->id;
        $data = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $page = (int) ($data['page'] ?? 1);
        $pageSize = (int) ($data['pageSize'] ?? 20);

        $qb = DB::table('posts')
            ->join('content_projects', 'content_projects.id', '=', 'posts.project_id')
            ->where('content_projects.user_id', $userId)
            ->whereNotNull('posts.scheduled_at');

        $total = (clone $qb)->count();

        $rows = $qb
            ->orderBy('posts.scheduled_at')
            ->select(
                'posts.id',
                'posts.project_id',
                'posts.content',
                'posts.scheduled_at',
                'posts.schedule_status',
                'posts.schedule_next_attempt_at',
                'posts.schedule_attempts',
                'posts.schedule_error',
                'content_projects.title as project_title'
            )
            ->forPage($page, $pageSize)
            ->get();

        $items = $rows->map(function ($r) {
            return [
                'id' => (string) $r->id,
                'projectId' => (string) $r->project_id,
                'projectTitle' => (string) ($r->project_title ?? ''),
                'content' => (string) $r->content,
                'scheduledAt' => $r->scheduled_at,
                'scheduleStatus' => $r->schedule_status,
                'scheduleNextAttemptAt' => $r->schedule_next_attempt_at,
                'scheduleAttempts' => (int) ($r->schedule_attempts ?? 0),
                'scheduleError' => $r->schedule_error,
            ];
        })->values();

        return Inertia::render('Calendar/Index', [
            'items' => $items,
            'meta' => [
                'page' => $page,
                'pageSize' => $pageSize,
                'total' => $total,
            ],
        ]);
    }
}
