Title: Simplify Laravel Middleware & Headers

Current State
- `config/sanctum.php` references a custom `ValidateCsrfToken` subclass that provides no functional difference from the framework default.
- OpenAPI cookie security scheme names `laravel_session`, but the configured session cookie is `content_session`.
- `SecureHeaders` sets a mix of legacy/low-impact headers; `LogAuthRequests` logs and sets `X-Request-Id` for every API request.

Desired State
- Use Sanctum/Laravel defaults where appropriate.
- Align OpenAPI cookie name with actual session cookie.
- Keep headers/logging minimal and environment-gated.

Motivation
- Reduce maintenance overhead and potential confusion.
- Provide accurate documentation to consumers.
- Keep dev logs readable and avoid noise.

High-Level Plan
1) In `config/sanctum.php`, switch `validate_csrf_token` to Laravel’s default middleware class.
2) Update the OpenAPI security scheme cookie name to match `SESSION_COOKIE`.
3) Review `SecureHeaders` and remove legacy headers or move enforcement to reverse proxy for prod.
4) Ensure `LogAuthRequests` obeys environment flags tightly (already partially done) and consider scoping to auth-critical routes.

