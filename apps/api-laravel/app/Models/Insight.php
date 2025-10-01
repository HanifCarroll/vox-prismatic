<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Insight extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id','project_id','content','quote','score','is_approved'];
    protected $casts = [
        'is_approved' => 'boolean',
        'score' => 'float',
    ];
}

