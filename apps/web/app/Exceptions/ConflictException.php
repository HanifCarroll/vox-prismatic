<?php

namespace App\Exceptions;

class ConflictException extends AppException
{
    public function __construct(string $message = 'Conflict')
    {
        parent::__construct(409, $message, ErrorCode::CONFLICT);
    }
}
