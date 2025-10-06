<?php

namespace App\Support;

class PostgresArray
{
    /**
     * Render a PHP array of strings as a PostgreSQL text[] literal.
     */
    public static function text(array $items): string
    {
        $normalized = array_values(array_filter(array_map('strval', $items)));

        $escaped = array_map(
            fn (string $value): string => '"'.addcslashes($value, "\\\"").'"',
            $normalized,
        );

        return '{'.implode(',', $escaped).'}';
    }
}

