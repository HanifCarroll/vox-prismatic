<?php

namespace App\Domain\Posts\Support;

final class HookFrameworkCatalog
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        return [
            [
                'id' => 'problem-agitate',
                'label' => 'Problem → Agitate',
                'description' => 'Start with the painful status quo, then intensify it.',
                'example' => 'Most coaches post daily and still hear crickets. Here’s the brutal reason no one told you.',
                'tags' => ['pain', 'urgency'],
            ],
            [
                'id' => 'contrarian-flip',
                'label' => 'Contrarian Flip',
                'description' => 'Challenge a common belief with a bold reversal.',
                'example' => 'The worst advice in coaching? “Nurture every lead.” Here’s why that’s killing your pipeline.',
                'tags' => ['contrarian', 'pattern interrupt'],
            ],
            [
                'id' => 'data-jolt',
                'label' => 'Data Jolt',
                'description' => 'Lead with a specific metric that reframes risk/opportunity.',
                'example' => '87% of our inbound leads ghosted… until we changed one sentence in our opener.',
                'tags' => ['proof', 'specificity'],
            ],
            [
                'id' => 'confession-to-lesson',
                'label' => 'Confession → Lesson',
                'description' => 'Offer a vulnerable admission, then hint at the transformation.',
                'example' => 'I almost shut down my practice last year. The fix took 12 minutes a week.',
                'tags' => ['story', 'vulnerability'],
            ],
            [
                'id' => 'myth-bust',
                'label' => 'Myth Bust',
                'description' => 'Expose a beloved myth and tease the unexpected truth.',
                'example' => '“Add more value” is not why prospects ignore you. This is.',
                'tags' => ['belief shift', 'clarity'],
            ],
            [
                'id' => 'micro-case',
                'label' => 'Micro Case Study',
                'description' => 'Compress a before→after story into two lines.',
                'example' => 'Session 1: 14% close rate. Session 6: 61%. Same offer. Different first sentence.',
                'tags' => ['credibility', 'outcomes'],
            ],
        ];
    }

    /**
     * @param array<int, string> $ids
     * @return array<int, array<string, mixed>>
     */
    public function findMany(array $ids): array
    {
        $map = [];

        foreach ($this->all() as $framework) {
            $map[$framework['id']] = $framework;
        }

        $selected = [];

        foreach ($ids as $id) {
            if (isset($map[$id])) {
                $selected[] = $map[$id];
            }
        }

        return $selected;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function indexed(): array
    {
        $index = [];
        foreach ($this->all() as $framework) {
            $index[$framework['id']] = $framework;
        }

        return $index;
    }
}
