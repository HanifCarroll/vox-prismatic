<?php

namespace App\Http\Controllers;

use App\Exceptions\ForbiddenException;
use App\Exceptions\NotFoundException;
use App\Models\ContentProject;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TranscriptsController extends Controller
{
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate(['transcript' => ['required','string']]);
        $ai = app(AiService::class);
        $out = $ai->normalizeTranscript($data['transcript']);
        return response()->json($out);
    }

    public function get(Request $request, string $id): JsonResponse
    {
        $p = ContentProject::query()->select(['id','user_id','transcript_original'])->where('id',$id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');
        return response()->json(['transcript' => $p->transcript_original ?? null]);
    }

    public function put(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['transcript' => ['required','string']]);
        $p = ContentProject::query()->where('id',$id)->first();
        if (!$p) throw new NotFoundException('Not found');
        if ($p->user_id !== $request->user()->id) throw new ForbiddenException('Access denied');
        $ai = app(AiService::class);
        $norm = $ai->normalizeTranscript($data['transcript']);
        DB::table('content_projects')->where('id',$id)->update([
            'transcript_original' => $data['transcript'],
            'transcript_cleaned' => $norm['transcript'] ?? $data['transcript'],
            'updated_at' => now(),
        ]);
        return response()->json(['transcript' => $data['transcript']]);
    }
}

