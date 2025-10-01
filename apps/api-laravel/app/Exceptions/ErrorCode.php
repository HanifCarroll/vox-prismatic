<?php

namespace App\Exceptions;

enum ErrorCode: string
{
    // Validation
    case VALIDATION_ERROR = 'VALIDATION_ERROR';
    case INVALID_INPUT = 'INVALID_INPUT';

    // Auth
    case UNAUTHORIZED = 'UNAUTHORIZED';
    case INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';

    // Access
    case FORBIDDEN = 'FORBIDDEN';
    case NOT_FOUND = 'NOT_FOUND';
    case CONFLICT = 'CONFLICT';
    case BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION';

    // Rate limit
    case RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED';

    // Internal
    case INTERNAL_ERROR = 'INTERNAL_ERROR';
}

