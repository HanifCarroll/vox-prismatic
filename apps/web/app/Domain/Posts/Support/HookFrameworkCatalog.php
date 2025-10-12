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
            [
                'id' => 'directive-surge',
                'label' => 'Directive Surge',
                'description' => 'Lead with an imperative that commands action and hints at payoff.',
                'example' => 'Stop letting brittle migrations stall every feature—lock your data handoff in one playbook.',
                'tags' => ['command', 'momentum'],
            ],
            [
                'id' => 'vivid-snapshot',
                'label' => 'Vivid Snapshot',
                'description' => 'Drop the reader into a hyper-specific scene that spotlights the friction.',
                'example' => 'Friday, 11:47 p.m.—six engineers still copy-pasting prod data into Docker by hand.',
                'tags' => ['imagery', 'pain'],
            ],
            [
                'id' => 'future-cast',
                'label' => 'Future Cast',
                'description' => 'Project the reader into a near-future win anchored in the insight.',
                'example' => 'Next launch, your demo clicks because the database behaves exactly like prod—on demand.',
                'tags' => ['vision', 'aspiration'],
            ],
            [
                'id' => 'proof-fragment',
                'label' => 'Proof Fragment',
                'description' => 'Lead with a punchy stat, quote, or metric fragment for instant credibility.',
                'example' => '“Rollback time: 72 minutes → 6.” That shift came from one automation pass.',
                'tags' => ['proof', 'specificity'],
            ],
            [
                'id' => 'contrast-bridge',
                'label' => 'Contrast Bridge',
                'description' => 'Juxtapose the old grind with the improved state in a single beat.',
                'example' => 'Before: panic every deploy. After: database changes ship before lunch, without drama.',
                'tags' => ['contrast', 'outcome'],
            ],
            [
                'id' => 'mantra-drop',
                'label' => 'Mantra Drop',
                'description' => 'State a sharp principle that reframes the reader’s approach.',
                'example' => 'Reliable systems aren’t built in sprints—they’re rehearsed daily in your staging loop.',
                'tags' => ['principle', 'authority'],
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
