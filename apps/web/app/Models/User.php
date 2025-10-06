<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;

class User extends Authenticatable
{
    use HasFactory, Notifiable, Billable;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'email',
        'password',
        'is_admin',
        'linkedin_token','linkedin_id','linkedin_connected_at',
        'stripe_customer_id','stripe_subscription_id',
        'subscription_status','subscription_plan','subscription_current_period_end','cancel_at_period_end',
        'trial_ends_at','trial_notes',
        'stripe_id','pm_type','pm_last_four',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'linkedin_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'linkedin_connected_at' => 'datetime',
        'subscription_current_period_end' => 'datetime',
        'trial_ends_at' => 'datetime',
        'is_admin' => 'boolean',
        'cancel_at_period_end' => 'boolean',
    ];
}
