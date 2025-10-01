<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = [
        'id','project_id','insight_id','content','platform','status','published_at','scheduled_at','schedule_status','schedule_error','schedule_attempted_at'
    ];
    protected $casts = [
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'schedule_attempted_at' => 'datetime',
        // hashtags is a text[] in PG; we'll map as array via accessor/mutator
    ];

    protected $appends = ['hashtags'];

    public function getHashtagsAttribute(): array
    {
        $raw = $this->getRawOriginal('hashtags');
        if ($raw === null) return [];
        // PG returns in \{tag1,tag2\} format via pdo_pgsql; normalize
        if (is_string($raw)) {
            $trim = trim($raw, '{}');
            if ($trim === '') return [];
            // basic split, ignoring escaped commas
            return array_map(fn($s) => stripcslashes(trim($s, '"')), explode(',', $trim));
        }
        return (array)$raw;
    }

    public function setHashtagsAttribute($value): void
    {
        // Expect an array of strings; let query builder bind as text[] using cast
        $arr = array_values(array_filter(array_map('strval', (array)$value)));
        // Store via raw expression in repositories; here just expose virtual attr
    }
}

