@content/shared-types

What
- Shared Zod schemas and inferred TypeScript types for API <-> FE contracts.
- Ensures both the Vite React frontend and Hono API use a single source of truth.

Install
- As part of the monorepo: it's already available via workspace protocol.
- Import in frontend or backend code:

  import { LoginRequestSchema, AuthResponseSchema, UserSchema } from '@content/shared-types'

Usage
- Validate request bodies (FE or BE):

  const parsed = LoginRequestSchema.parse({ email, password })

- Type inference:

  type AuthResponse = z.infer<typeof AuthResponseSchema>

Schemas Included (initial)
- ErrorResponseSchema: `{ error, code?, status, details? }`
- UserSchema
- RegisterRequestSchema
- LoginRequestSchema
- AuthResponseSchema
- JwtPayloadSchema (minimal payload fields used on the client)

Notes
- Keep schemas minimal and platform-agnostic. Add new schemas as endpoints grow.
- Prefer reusing these schemas in API routes via the `validateRequest` middleware.

