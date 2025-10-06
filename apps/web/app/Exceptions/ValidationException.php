<?php

namespace App\Exceptions;

class ValidationException extends AppException
{
    public function __construct(string $message = 'Validation error', array $details = null)
    {
        parent::__construct(422, $message, ErrorCode::VALIDATION_ERROR, $details);
    }
}
