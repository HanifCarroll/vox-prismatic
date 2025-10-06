<?php

namespace App\Exceptions;

class UnauthorizedException extends AppException
{
    public function __construct(string $message = 'Unauthorized')
    {
        parent::__construct(401, $message, ErrorCode::UNAUTHORIZED);
    }
}
