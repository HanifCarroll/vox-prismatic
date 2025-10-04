---
description: Hono API server with TypeScript and Supabase (Auth + Postgres with RLS)
globs: "*.ts, *.js, package.json"
alwaysApply: false
---

# Hono API Server Guidelines

This is a **Hono** TypeScript API server using Supabase (Auth + Postgres with RLS). Follow these patterns and conventions when working in this codebase.

## Tech Stack
- **Runtime**: Node.js with tsx for development
- **Framework**: Hono (lightweight, fast web framework)
- **Database**: Supabase Postgres with RLS (access via supabase-js)
- **Validation**: Zod schemas with @hono/zod-validator
- **Authentication**: JWT with jose library
- **Logging**: Pino with file + console output
- **Testing**: Vitest
- **Code Quality**: Biome for linting/formatting

## Project Structure
```
src/
├── config/         # Environment config, database setup
├── services/      # Supabase clients and external integrations
├── middleware/    # Hono middleware (auth, logging, error, rate-limit)
├── modules/       # Feature modules (auth, content, projects, etc.)
├── services/      # Business logic and external integrations
├── utils/         # Shared utilities and helpers
├── app.ts         # Hono app configuration
└── server.ts      # Server entry point
```

## Logging Guidelines

### Always Use Logging Utilities
**When writing new code, always use the logging utilities**:

```typescript
import { log, createLogger } from '@/utils/logger'

// Use appropriate log levels
log.trace('Detailed trace information for debugging')
log.debug('Debug information', { data: 'value' })
log.info('General information', { userId: 123 })
log.warn('Warning messages', { threshold: 90 })
log.error('Error occurred', error, { context: 'operation' })

// Use specialized loggers for specific contexts
log.request('POST', '/api/users', { body: userData })
log.response('POST', '/api/users', 201, 45)
log.db('INSERT', 'users', { id: newUserId })
log.job('email-send', 'started', { batchSize: 100 })
log.auth('login-success', userId, { ip: clientIp })
log.perf('complex-query', 234, { rows: 1000 })

// Create module-specific loggers
const authLogger = createLogger('auth-module')
authLogger.info('OAuth token refreshed', { provider: 'linkedin' })
```

### Verify Features Using Logs
**After implementing any feature, check the logs to confirm it works**:
1. Run the new feature
2. Check `logs/app-YYYY-MM-DD.log` for expected messages
3. Verify no unexpected warnings or errors
4. Look for performance metrics in debug logs
5. Confirm database operations are logged

### Debug Using Log Files
```bash
# View today's logs
cat logs/app-2025-09-10.log

# Search for errors
rg "ERROR" logs/

# Find specific user activity
rg "userId.*123" logs/

# Monitor in real-time
tail -f logs/app-$(date +%Y-%m-%d).log

# Parse JSON logs
cat logs/app-*.log | jq 'select(.level == "error")'
```

### Log Levels
- **trace**: Most detailed debugging (captures everything)
- **debug**: Development debugging info
- **info**: General information (production default)
- **warn**: Warnings that don't prevent operation
- **error**: Errors and failures
- **fatal**: Critical errors that terminate the process

## Hono Patterns

### Route Organization
```typescript
// modules/[feature]/[feature].routes.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

// Always validate inputs with Zod
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

app.post('/', zValidator('json', createSchema), async (c) => {
  const data = c.req.valid('json')
  log.info('Creating resource', { data })
  
  // Business logic here
  
  return c.json({ success: true }, 201)
})

export default app
```

### Middleware Usage
```typescript
// Always use middleware for cross-cutting concerns
app.use('*', loggingMiddleware())
app.use('/api/*', authMiddleware())
app.use('/api/*', rateLimitMiddleware())
```

## Rate Limiting

### Universal Development Switch
**Rate limiting is automatically disabled in development!** This prevents the frustration of hitting rate limits while testing.

The rate limiting middleware uses a smart factory pattern that checks the environment:
- **Development** (`NODE_ENV=development`): Returns pass-through middleware (no rate limiting)
- **Production** (`NODE_ENV=production`): Applies actual rate limits
- **Manual Override** (`DISABLE_RATE_LIMIT=true`): Force disable even in production

### How It Works
```typescript
// In middleware/rate-limit.ts
function createRateLimiter(options) {
  if (env.NODE_ENV === 'development' || env.DISABLE_RATE_LIMIT === 'true') {
    return async (c, next) => next()  // Pass through, no limiting
  }
  return rateLimit(options)  // Apply actual limits
}

// All rate limiters use the factory
export const loginRateLimit = createRateLimiter({ ... })
export const registrationRateLimit = createRateLimiter({ ... })
export const apiRateLimit = createRateLimiter({ ... })
```

### Using Rate Limiters
```typescript
// Just use them normally - they auto-adjust based on environment
app.post('/login', loginRateLimit, handler)
app.post('/register', registrationRateLimit, handler)
app.use('/api/*', apiRateLimit)
```

### Benefits
- **Zero configuration changes** needed between dev and prod
- **No code changes** required in routes
- **Future proof** - all new rate limiters automatically inherit this behavior
- **Debug logging** available to confirm when rate limiting is bypassed

### Error Handling
```typescript
// Use the centralized error handler
try {
  // operation
} catch (error) {
  log.error('Operation failed', error)
  return c.json({ error: 'Internal server error' }, 500)
}
```

## Database Patterns (Supabase)

### Query Patterns
```typescript
import { createUserClient, supabaseService } from '@/services/supabase'

// User-scoped client (RLS enforced)
const client = createUserClient('<access-token>')
const { data, error } = await client.from('content_projects').select('*').order('created_at', { ascending: false })
if (error) throw error

// Service-role client (admin flows)
const { data: profiles } = await supabaseService.from('profiles').select('id, name').limit(100)
```

### Schema Definitions
```typescript
// db/schema/[table].ts
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  email: text('email').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

## Service Layer Pattern

### Keep Business Logic in Services
```typescript
// services/[feature].service.ts
export class UserService {
  async createUser(data: CreateUserDto) {
    log.info('Creating user', { email: data.email })
    
    // Validation
    if (await this.emailExists(data.email)) {
      log.warn('Email already exists', { email: data.email })
      throw new Error('Email already exists')
    }
    
    // Business logic
    const hashedPassword = await hash(data.password, 10)
    
    // Database operation
    log.db('INSERT', 'users', { email: data.email })
    const user = await db.insert(users).values({
      email: data.email,
      password: hashedPassword,
    }).returning()
    
    log.info('User created successfully', { userId: user[0].id })
    return user[0]
  }
}
```

## Testing Approach

### Integration Tests (Primary Focus)
```typescript
// __tests__/[feature].integration.test.ts
import { app } from '@/app'
import { describe, it, expect } from 'vitest'

describe('User API', () => {
  it('should create user and return JWT', async () => {
    const res = await app.request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePass123!',
      }),
    })
    
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toHaveProperty('token')
  })
})
```

## Environment Variables
Always access through the centralized config:
```typescript
import { env } from '@/config/env'

// Never use process.env directly
const apiKey = env.GOOGLE_AI_API_KEY  // ✅ Good
const apiKey = process.env.GOOGLE_AI_API_KEY  // ❌ Bad
```

## API Response Format
Maintain consistent response structure:
```typescript
// Success
c.json({ 
  data: result,
  message: 'Operation successful' 
}, 200)

// Error
c.json({ 
  error: 'Validation failed',
  details: errors 
}, 400)

// Paginated
c.json({
  data: items,
  pagination: {
    page: 1,
    limit: 20,
    total: 100,
  }
}, 200)
```

## Performance Considerations

1. **Use streaming for large responses**:
```typescript
import { stream } from 'hono/streaming'

app.get('/large-data', async (c) => {
  return stream(c, async (stream) => {
    // Stream data in chunks
    for await (const chunk of largeDataSource) {
      await stream.write(JSON.stringify(chunk))
    }
  })
})
```

2. **Implement caching where appropriate**:
```typescript
c.header('Cache-Control', 'public, max-age=3600')
```

3. **Use database indexes** for frequently queried fields
4. **Log performance metrics** for monitoring

## Security Best Practices

1. **Always validate input** with Zod schemas
2. **Sanitize user content** before storage
3. **Use safe queries** via supabase-js (parameters are safely encoded)
4. **Rate limit sensitive endpoints**
5. **Log security events** (failed auth, suspicious activity)
6. **Never log sensitive data** (passwords, tokens, keys)

## Development Workflow

```bash
# Start development server with hot reload
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting and formatting
pnpm check
pnpm format

# Database operations
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed data
```

## Common Patterns to Follow

### Functional Approach for Utilities
```typescript
// utils/[utility].ts
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}
```

### Use Early Returns
```typescript
// Good: Early returns reduce nesting
if (!isValid) {
  log.warn('Invalid input')
  return c.json({ error: 'Invalid input' }, 400)
}

// Continue with happy path
const result = await process(data)
return c.json({ data: result })
```

### Consistent Error Messages
```typescript
// Use consistent error format
throw new HTTPException(400, {
  message: 'Validation failed',
  cause: { field: 'email', reason: 'Invalid format' }
})
```

## Debugging Tips

1. **Check logs first** - Most issues are visible in logs
2. **Use log.trace()** liberally during development
3. **Add request IDs** for tracing through the system
4. **Monitor database query performance** in logs
5. **Use the Swagger UI** at `/swagger` for API testing

Remember: Good logging is like leaving breadcrumbs for your future self!
