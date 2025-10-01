<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSchedulePreference extends Model
{
    protected $table = 'user_schedule_preferences';
    public $incrementing = false;
    protected $primaryKey = 'user_id';
    protected $keyType = 'string';
    protected $fillable = ['user_id','timezone','lead_time_minutes'];
}

