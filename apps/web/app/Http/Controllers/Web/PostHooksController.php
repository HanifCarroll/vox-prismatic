<?php

namespace App\Http\Controllers\Web;

use App\Domain\Posts\Support\HookFrameworkCatalog;
use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\Ai\Prompts\HookWorkbenchPromptBuilder;
use App\Services\AiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PostHooksController extends Controller
{
    public function __construct(
        private readonly HookFrameworkCatalog $catalog,
        private readonly HookWorkbenchPromptBuilder $prompts,
        private readonly AiService $ai,
    ) {
    }

    public function frameworks()
    {
        return response()->json([
            'frameworks' => $this->catalog->all(),
        ]);
    }

    public function hookWorkbench(Request $request, Post $post)
    {
        $row = DB::table('posts')->where('id', $post->id)->first();
        if (! $row) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $project = DB::table('content_projects')
            ->select('id', 'user_id', 'transcript_original')
            ->where('id', $row->project_id)
            ->first();

        if (! $project || (string) $project->user_id !== (string) $request->user()->id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'frameworkIds' => ['nullable', 'array'],
            'frameworkIds.*' => ['string'],
            'customFocus' => ['nullable', 'string', 'max:240'],
            'count' => ['nullable', 'integer', 'min:1', 'max:8'],
        ]);

        $count = isset($data['count']) ? max(1, min(8, (int) $data['count'])) : 4;

        $frameworkIndex = $this->catalog->indexed();
        $selected = [];

        if (! empty($data['frameworkIds']) && is_array($data['frameworkIds'])) {
            foreach ($data['frameworkIds'] as $id) {
                $id = (string) $id;
                if (isset($frameworkIndex[$id])) {
                    $selected[] = $frameworkIndex[$id];
                }
            }
        }

        if (empty($selected)) {
            $selected = array_slice($this->catalog->all(), 0, 4);
        }

        if (empty($row->insight_id)) {
            return response()->json(['error' => 'Hooks require an insight-backed post'], 422);
        }

        $insightRow = DB::table('insights')
            ->select('content')
            ->where('id', $row->insight_id)
            ->where('project_id', $row->project_id)
            ->first();

        if (! $insightRow) {
            return response()->json(['error' => 'Insight not found for post'], 404);
        }

        $transcript = (string) ($project->transcript_original ?? '');
        $transcriptExcerpt = mb_substr($transcript, 0, 1800);
        $draftOpening = mb_substr((string) $row->content, 0, 220);
        $focus = isset($data['customFocus']) ? mb_substr((string) $data['customFocus'], 0, 240) : null;

        $json = $this->ai->complete(
            $this->prompts
                ->hooks($selected, $count, (string) ($insightRow->content ?? ''), $draftOpening, $transcriptExcerpt, $focus)
                ->withContext((string) $project->id, (string) $project->user_id)
        )->data;

        $indexed = $this->catalog->indexed();

        $hooks = [];

        foreach (($json['hooks'] ?? []) as $hook) {
            if (! is_array($hook)) {
                continue;
            }

            $frameworkId = (string) ($hook['frameworkId'] ?? ($selected[0]['id'] ?? 'custom'));
            $framework = $indexed[$frameworkId] ?? null;

            $hooks[] = [
                'id' => isset($hook['id']) ? (string) $hook['id'] : (string) Str::uuid(),
                'frameworkId' => $framework ? $framework['id'] : $frameworkId,
                'label' => $framework['label'] ?? (string) ($hook['label'] ?? 'Hook'),
                'hook' => mb_substr((string) ($hook['hook'] ?? ''), 0, 210),
                'curiosity' => max(0, min(100, (int) ($hook['curiosity'] ?? 50))),
                'valueAlignment' => max(0, min(100, (int) ($hook['valueAlignment'] ?? 50))),
                'rationale' => mb_substr((string) ($hook['rationale'] ?? ''), 0, 360),
            ];
        }

        if (empty($hooks)) {
            return response()->json(['error' => 'No hooks generated'], 422);
        }

        $recommendedId = is_string(($json['recommendedId'] ?? null))
            ? (string) $json['recommendedId']
            : null;

        if (! $recommendedId || ! collect($hooks)->firstWhere('id', $recommendedId)) {
            $best = null;
            $bestScore = -1;

            foreach ($hooks as $hook) {
                $score = (int) round(($hook['curiosity'] + $hook['valueAlignment']) / 2);

                if ($score > $bestScore) {
                    $bestScore = $score;
                    $best = $hook;
                }
            }

            $recommendedId = $best['id'] ?? $hooks[0]['id'];
        }

        return response()->json([
            'hooks' => $hooks,
            'summary' => isset($json['summary']) && is_string($json['summary'])
                ? mb_substr($json['summary'], 0, 400)
                : null,
            'recommendedId' => $recommendedId,
            'generatedAt' => now(),
        ]);
    }
}

