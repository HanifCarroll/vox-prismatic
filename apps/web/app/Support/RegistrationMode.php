<?php

namespace App\Support;

enum RegistrationMode: string
{
    case Open = 'open';
    case Invite = 'invite';
    case Closed = 'closed';

    public static function fromString(?string $value): self
    {
        return match (strtolower(trim((string) $value))) {
            'open' => self::Open,
            'closed' => self::Closed,
            default => self::Invite,
        };
    }

    public function allowsPublicSignup(): bool
    {
        return $this === self::Open;
    }

    public function requiresInvite(): bool
    {
        return $this === self::Invite;
    }
}
