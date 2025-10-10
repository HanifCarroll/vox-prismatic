<?php

return [
    'temperature' => (float) env('INSIGHTS_TEMPERATURE', 0.2),
    'threshold_chars' => (int) env('INSIGHTS_MAP_REDUCE_THRESHOLD_CHARS', 12000),
    'chunk' => [
        'max_chars' => (int) env('INSIGHTS_MAP_CHUNK_CHARS', 9000),
        'per_chunk' => (int) env('INSIGHTS_MAP_PER_CHUNK', 4),
    ],
    'reduce' => [
        'pool_max' => (int) env('INSIGHTS_REDUCE_POOL_MAX', 40),
        'target_min' => (int) env('INSIGHTS_REDUCE_TARGET_MIN', 5),
        'target_max' => env('INSIGHTS_REDUCE_TARGET_MAX') !== null
            ? (int) env('INSIGHTS_REDUCE_TARGET_MAX')
            : null,
    ],
];
