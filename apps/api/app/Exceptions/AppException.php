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

