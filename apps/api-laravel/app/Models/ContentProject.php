<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentProject extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'content_projects';
    protected $fillable = [
        'id','user_id','title','source_url','transcript_original','transcript_cleaned','current_stage','processing_progress','processing_step'
    ];
    protected $casts = [
        'processing_progress' => 'integer',
    ];
}

