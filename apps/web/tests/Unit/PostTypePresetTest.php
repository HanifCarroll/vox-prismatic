<?php

namespace Tests\Unit;

use App\Support\PostTypePreset;
use PHPUnit\Framework\TestCase;

class PostTypePresetTest extends TestCase
{
    public function test_merge_returns_null_when_no_input(): void
    {
        $this->assertNull(PostTypePreset::mergeCustomInstructions(null, null));
    }

    public function test_merge_returns_preset_line_when_no_custom_text(): void
    {
        $result = PostTypePreset::mergeCustomInstructions(null, 'story');

        $this->assertSame(
            'Preset: story — Tell a vivid narrative with stakes, tension, and a takeaway for the reader.',
            $result,
        );
    }

    public function test_merge_appends_custom_text_after_preset_line(): void
    {
        $result = PostTypePreset::mergeCustomInstructions('Keep it punchy.', 'listicle');

        $this->assertSame(
            "Preset: listicle — Deliver a punchy numbered list with scannable, high-utility points.\nKeep it punchy.",
            $result,
        );
    }

    public function test_merge_detects_existing_preset_line_and_avoids_dupes(): void
    {
        $custom = "Preset: how_to — structure as steps with a practical takeaway.\nAdd an example.";

        $this->assertSame(
            $custom,
            PostTypePreset::mergeCustomInstructions($custom, 'how_to'),
        );
    }
}

