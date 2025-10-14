<?php

namespace App\Http\Controllers\Web;

use App\Domain\Posts\Services\StyleProfileResolver;
use App\Domain\Posts\Support\HookFrameworkCatalog;
use App\Domain\Posts\Support\PostHookInspector;
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
        private readonly StyleProfileResolver $styleProfiles,
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
        ]);

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
            $pool = $this->catalog->all();
            if (! empty($pool)) {
                shuffle($pool);
                $selected = array_slice($pool, 0, min(4, count($pool)));
            }
        }

        if (empty($selected)) {
            return response()->json(['error' => 'No hook frameworks available'], 422);
        }

        $selected = array_values($selected);
        $count = count($selected);

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
        $draftOpening = PostHookInspector::extractHook((string) $row->content) ?? '';
        $focus = isset($data['customFocus']) ? mb_substr((string) $data['customFocus'], 0, 240) : null;
        $styleProfile = $project->user_id
            ? $this->styleProfiles->forUser((string) $project->user_id)
            : $this->styleProfiles->forProject((string) $project->id);

        $recentHooks = DB::table('posts')
            ->select('id', 'content')
            ->where('project_id', $row->project_id)
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->filter(fn ($item) => (string) $item->id !== (string) $row->id)
            ->pluck('content');

        $recentHookList = PostHookInspector::extractHooks($recentHooks);

        $json = $this->ai->complete(
            $this->prompts
                ->hooks(
                    $selected,
                    $count,
                    (string) ($insightRow->content ?? ''),
                    $draftOpening,
                    $transcriptExcerpt,
                    $styleProfile,
                    $recentHookList,
                    $focus
                )
                ->withContext((string) $project->id, (string) $project->user_id)
        )->data;

        $indexed = $this->catalog->indexed();

        $hooks = [];
        $maxHooks = $count;

        foreach (($json['hooks'] ?? []) as $hook) {
            if (! is_array($hook)) {
                continue;
            }

            if (count($hooks) >= $maxHooks) {
                break;
            }

            $expectedFramework = $selected[count($hooks)]['id'] ?? null;
            $frameworkId = $expectedFramework
                ? (string) $expectedFramework
                : (string) ($hook['frameworkId'] ?? ($selected[0]['id'] ?? 'custom'));
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

        if (count($hooks) < $maxHooks) {
            return response()->json(['error' => 'Not enough hooks generated for the selected frameworks'], 422);
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
