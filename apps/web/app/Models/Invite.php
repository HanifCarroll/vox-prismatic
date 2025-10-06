<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class Invite extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'invites';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'code',
        'email',
        'max_uses',
        'uses',
        'expires_at',
        'created_by',
        'notes',
        'last_used_at',
    ];

    protected $casts = [
        'max_uses' => 'integer',
        'uses' => 'integer',
        'expires_at' => 'datetime',
        'last_used_at' => 'datetime',
    ];

    protected $attributes = [
        'max_uses' => 1,
        'uses' => 0,
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function invitees(): HasMany
    {
        return $this->hasMany(User::class, 'invite_id');
    }

    public function isExpired(?Carbon $now = null): bool
    {
        if ($this->expires_at === null) {
            return false;
        }

        $now ??= Carbon::now();
        return $this->expires_at->lte($now);
    }

    public function remainingUses(): ?int
    {
        if ($this->max_uses === null) {
            return null;
        }

        return max(0, $this->max_uses - $this->uses);
    }

    public function hasCapacity(): bool
    {
        if ($this->max_uses === null) {
            return true;
        }

        return $this->uses < $this->max_uses;
    }

    public function matchesEmail(?string $email): bool
    {
        if ($this->email === null) {
            return true;
        }

        return $email !== null && hash_equals($this->email, $email);
    }

    public function isValid(?string $email = null, ?Carbon $now = null): bool
    {
        return $this->matchesEmail($email) && $this->hasCapacity() && ! $this->isExpired($now);
    }

    public function consume(?Carbon $now = null): bool
    {
        $now ??= Carbon::now();

        $updated = $this->newModelQuery()
            ->whereKey($this->getKey())
            ->where(function ($query): void {
                $query->whereNull('max_uses')
                    ->orWhereColumn('uses', '<', 'max_uses');
            })
            ->update([
                'uses' => DB::raw('uses + 1'),
                'last_used_at' => $now,
                'updated_at' => $now,
            ]);

        if ($updated === 0) {
            return false;
        }

        $this->uses += 1;
        $this->last_used_at = $now;

        return true;
    }
}
