<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPreferredTimeslot extends Model
{
    protected $table = 'user_preferred_timeslots';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id','user_id','iso_day_of_week','minutes_from_midnight','active'];
    protected $casts = ['active' => 'boolean'];
}

