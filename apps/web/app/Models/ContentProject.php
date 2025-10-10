<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentProject extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'content_projects';
    protected $fillable = [
        'id',
        'user_id',
        'title',
        'source_url',
        'transcript_original',
        'current_stage',
        'processing_progress',
        'processing_step',
        'processing_batch_id',
        'insights_started_at',
        'insights_completed_at',
        'posts_started_at',
        'posts_completed_at',
    ];
    protected $casts = [
        'processing_progress' => 'integer',
        'insights_started_at' => 'datetime',
        'insights_completed_at' => 'datetime',
        'posts_started_at' => 'datetime',
        'posts_completed_at' => 'datetime',
    ];
}
