<?php

namespace App\Exceptions;

use Exception;

abstract class AppException extends Exception
{
    protected int $status;
    protected ErrorCode $codeEnum;
    protected array|null $details;

    public function __construct(int $status, string $message, ErrorCode $codeEnum, array $details = null)
    {
        parent::__construct($message);
        $this->status = $status;
        $this->codeEnum = $codeEnum;
        $this->details = $details;
    }

    public function getStatusCode(): int
    {
        return $this->status;
    }

    public function getCodeString(): string
    {
        return $this->codeEnum->value;
    }

    public function getSafeDetails(): ?array
    {
        return $this->details;
    }
}

class ValidationException extends AppException
{
    public function __construct(string $message = 'Validation error', array $details = null)
    {
        parent::__construct(422, $message, ErrorCode::VALIDATION_ERROR, $details);
    }
}

class UnauthorizedException extends AppException
{
    public function __construct(string $message = 'Unauthorized')
    {
        parent::__construct(401, $message, ErrorCode::UNAUTHORIZED);
    }
}

class ForbiddenException extends AppException
{
    public function __construct(string $message = 'Forbidden')
    {
        parent::__construct(403, $message, ErrorCode::FORBIDDEN);
    }
}

class NotFoundException extends AppException
{
    public function __construct(string $message = 'Not Found')
    {
        parent::__construct(404, $message, ErrorCode::NOT_FOUND);
    }
}

class ConflictException extends AppException
{
    public function __construct(string $message = 'Conflict')
    {
        parent::__construct(409, $message, ErrorCode::CONFLICT);
    }
}

class InternalServerException extends AppException
{
    public function __construct(string $message = 'Internal Server Error')
    {
        parent::__construct(500, $message, ErrorCode::INTERNAL_ERROR);
    }
}

