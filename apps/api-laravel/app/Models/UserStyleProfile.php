<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserStyleProfile extends Model
{
    protected $table = 'user_style_profiles';
    public $incrementing = false;
    protected $primaryKey = 'user_id';
    protected $keyType = 'string';
    protected $fillable = ['user_id','style'];
    protected $casts = [ 'style' => 'array' ];
}

