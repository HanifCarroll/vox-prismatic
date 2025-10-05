<?php

namespace App\Exceptions;

class InternalServerException extends AppException
{
    public function __construct(string $message = 'Internal Server Error')
    {
        parent::__construct(500, $message, ErrorCode::INTERNAL_ERROR);
    }
}
