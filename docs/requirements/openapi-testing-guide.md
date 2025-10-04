# OpenAPI + Orval Testing Guide

## 🧪 Validate Backend Setup

### 1. Start the API
```bash
# Option 1: Docker (recommended)
pnpm dev-start

# Option 2: Local PHP (if configured)
cd apps/api
php artisan serve
```

### 2. Check OpenAPI Spec Endpoint
```bash
# Should return JSON OpenAPI 3.x specification
curl http://localhost:3001/api/openapi.json | jq '.'

# Verify it has:
# - info.title, info.version
# - servers array
# - paths object with /api/auth/*, /api/projects/*, etc.
# - components.schemas.ErrorResponse
# - tags array (Auth, Projects, Posts, etc.)
```

### 3. Validate Scramble Configuration
Check that the spec includes:

**Security Scheme** (cookie-based auth):
```json
{
  "components": {
    "securitySchemes": {
      "sanctum": {
        "type": "http",
        "scheme": "cookie",
        "description": "Cookie-based session authentication using Laravel Sanctum..."
      }
    }
  }
}
```

**Error Response Schema**:
```json
{
  "components": {
    "schemas": {
      "ErrorResponse": {
        "type": "object",
        "required": ["error", "code", "status"],
        "properties": {
          "error": { "type": "string" },
          "code": { "type": "string" },
          "status": { "type": "integer" },
          "details": {}
        }
      }
    }
  }
}
```

**Tags** (should see all 9 domains):
```json
{
  "tags": [
    { "name": "Auth" },
    { "name": "Projects" },
    { "name": "Transcripts" },
    { "name": "Posts" },
    { "name": "Scheduling" },
    { "name": "Settings" },
    { "name": "LinkedIn" },
    { "name": "Billing" },
    { "name": "Admin" }
  ]
}
```

## 🎨 Validate Frontend Setup

### 1. Generate API Client
```bash
cd apps/web

# Generate TypeScript types and React Query hooks
pnpm run generate:api
```

**Expected output**:
- Creates `src/api/generated.ts`
- Should see console output: "🎉 Successfully generated X files"
- No TypeScript errors

### 2. Check Generated Files
```bash
# Verify the file exists
ls -lh src/api/generated.ts

# Check that it has exports for each tag
rg "export.*use(Get|Post|Put|Patch|Delete)" src/api/generated.ts
```

**Should see hooks like**:
- `useGetAuthMe`
- `usePostAuthLogin`
- `useGetProjects`
- `usePostProjects`
- `usePatchProjectsById`
- etc.

### 3. Test Custom Axios Instance
Create a test file to verify CSRF handling:

```typescript
// apps/web/src/lib/client/__tests__/orval-fetcher.test.ts
import { describe, it, expect, vi } from 'vitest'
import { customInstance } from '../orval-fetcher'

describe('orval-fetcher', () => {
  it('should include credentials', async () => {
    // Mock fetch to capture the request
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    )

    await customInstance({
      url: '/api/test',
      method: 'GET',
    })

    // Verify credentials were included
    const call = (global.fetch as any).mock.calls[0]
    expect(call[1].credentials).toBe('include')
  })
})
```

Run tests:
```bash
pnpm test
```

## 🔍 Test Real API Calls

### 1. Test Auth Flow
Create a test component:

```typescript
// apps/web/src/test-components/AuthTest.tsx
import { useGetAuthMe } from '@/api/generated'

export function AuthTest() {
  const { data, isLoading, error } = useGetAuthMe()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {JSON.stringify(error)}</div>
  if (!data) return <div>Not authenticated</div>

  return (
    <div>
      <h1>Authenticated User</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
```

### 2. Test CSRF Token Flow
Monitor network requests in browser DevTools:

1. Open browser DevTools → Network tab
2. Trigger a mutation (e.g., login, create project)
3. Verify sequence:
   - **First request**: `GET /sanctum/csrf-cookie` (if no token)
   - **Second request**: `POST /api/auth/login` with:
     - Header: `X-XSRF-TOKEN: <token>`
     - Cookie: `XSRF-TOKEN=<token>`
     - Cookie: `laravel_session=<session>`

### 3. Verify Error Handling
Test with invalid credentials:

```typescript
import { usePostAuthLogin } from '@/api/generated'

function LoginTest() {
  const login = usePostAuthLogin()

  const testError = async () => {
    try {
      await login.mutateAsync({
        data: { email: 'wrong@example.com', password: 'wrong' }
      })
    } catch (err) {
      console.log('Error shape:', err)
      // Should match ApiError:
      // { error: string, code: string, status: number, details?: unknown }
    }
  }

  return <button onClick={testError}>Test Error</button>
}
```

## 🐛 Troubleshooting

### Issue: "Failed to fetch OpenAPI spec"
**Cause**: API not running or wrong URL
**Fix**:
```bash
# Check API is running
curl http://localhost:3001/api/health

# Update orval.config.ts if needed
input: { target: 'http://localhost:3001/api/openapi.json' }
```

### Issue: "Unable to obtain CSRF token"
**Cause**: CORS or cookie issues
**Fix**:
- Verify `apps/api/bootstrap/app.php` has `HandleCors` middleware
- Check `SANCTUM_STATEFUL_DOMAINS` in `.env`
- Ensure browser allows credentials for localhost

### Issue: Generated types don't match responses
**Cause**: Scramble inference mismatch
**Fix**:
- Add PHPDoc annotations to controller methods
- Use FormRequest classes for complex request bodies
- Add `@response` annotations for response shapes

### Issue: "Cannot find module '@/api/generated'"
**Cause**: File not generated yet
**Fix**:
```bash
cd apps/web
pnpm run generate:api
```

## ✅ Validation Checklist

Before proceeding to migration:

- [ ] OpenAPI spec available at `http://localhost:3001/api/openapi.json`
- [ ] Spec includes all 9 tags (Auth, Projects, etc.)
- [ ] ErrorResponse schema present in components
- [ ] Security scheme shows Sanctum cookie auth
- [ ] `pnpm run generate:api` succeeds without errors
- [ ] Generated hooks visible in `src/api/generated.ts`
- [ ] Custom Axios instance handles CSRF correctly
- [ ] Test API call returns expected data shape
- [ ] Error responses match ApiError type

## 📚 Reference

- **Scramble Docs**: https://scramble.dedoc.co
- **Orval Docs**: https://orval.dev
- **OpenAPI 3.x Spec**: https://swagger.io/specification/
- **Laravel Sanctum SPA Auth**: https://laravel.com/docs/sanctum#spa-authentication
