<?php

namespace App\Domain\Posts\Support;

final class ObjectiveScheduler
{
    /**
     * @param array<string, mixed> $styleProfile
     * @return array<int, string>
     */
    public function build(int $count, array $styleProfile): array
    {
        if ($count <= 0) {
            return [];
        }

        $schedule = array_fill(0, $count, 'educate');
        $goal = $styleProfile['promotionGoal'] ?? 'none';

        if ($goal === 'none') {
            return $schedule;
        }

        $conversionCount = max(1, (int) round($count * 0.2));

        if ($conversionCount >= $count) {
            return array_fill(0, $count, 'conversion_' . $goal);
        }

        $step = $count / $conversionCount;
        $used = [];

        for ($i = 0; $i < $conversionCount; $i++) {
            $index = (int) round(($i + 1) * $step) - 1;
            $index = max(0, min($count - 1, $index));

            while (in_array($index, $used, true)) {
                $index = ($index + 1) % $count;
            }

            $schedule[$index] = 'conversion_' . $goal;
            $used[] = $index;
        }

        return $schedule;
    }
}

