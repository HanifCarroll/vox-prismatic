<?php

namespace App\Exceptions;

class ForbiddenException extends AppException
{
    public function __construct(string $message = 'Forbidden')
    {
        parent::__construct(403, $message, ErrorCode::FORBIDDEN);
    }
}
