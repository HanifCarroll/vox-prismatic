<?php

namespace App\Exceptions;

class NotFoundException extends AppException
{
    public function __construct(string $message = 'Not Found')
    {
        parent::__construct(404, $message, ErrorCode::NOT_FOUND);
    }
}
