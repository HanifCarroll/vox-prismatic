<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiUsageEvent extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $fillable = [
        'id','user_id','project_id','action','model','input_tokens','output_tokens','cost_usd','metadata','created_at'
    ];
    protected $casts = [ 'metadata' => 'array', 'created_at' => 'datetime' ];
}

