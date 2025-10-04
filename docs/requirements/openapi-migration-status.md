# OpenAPI + Orval Migration Status

## ✅ Completed (Phases 0-2)

### Phase 0: Inventory
- [x] Analyzed API routes in `apps/api/routes/api.php`
- [x] Documented 9 domain groups: Health, Auth, Projects, Transcripts, Posts, Scheduling, Settings, LinkedIn, Billing, Admin
- [x] Confirmed response envelope pattern: `{project: {...}}`, `{items: [...], meta: {...}}`
- [x] Verified CSRF flow in `apps/web/src/lib/client/base.ts`

### Phase 1: Backend (Laravel + Scramble)
- [x] Installed `dedoc/scramble` (v0.12.35) as dev dependency
- [x] Created `apps/api/config/scramble.php` configuration
- [x] Configured Scramble in `apps/api/app/Providers/AppServiceProvider.php`:
  - Cookie-based Sanctum authentication security scheme
  - ErrorResponse component schema
  - Route filtering for `api/*` paths
- [x] Added OpenAPI spec endpoint: `GET /api/openapi.json`
- [x] Tagged all controllers with `@tags` PHPDoc:
  - `AuthController` → Auth
  - `ProjectsController` → Projects
  - `TranscriptsController` → Transcripts
  - `PostsController` → Posts
  - `SchedulingController` → Scheduling
  - `SettingsController` → Settings
  - `LinkedInController` → LinkedIn
  - `BillingController` → Billing
  - `AdminController` → Admin

### Phase 2: Frontend (Orval Setup)
- [x] Installed Orval packages in `apps/web/package.json`:
  - `orval` (^7.13.0)
  - `@orval/core` (^7.13.0)
  - `@orval/axios` (^7.13.0)
  - `axios` (^1.12.2)
- [x] Created `apps/web/orval.config.ts`:
  - Input: `http://localhost:3001/api/openapi.json`
  - Output: `./src/api/generated.ts`
  - Mode: `tags-split` (split by tags)
  - Client: `react-query`
- [x] Created CSRF-aware Axios instance in `apps/web/src/lib/client/orval-fetcher.ts`:
  - Automatic CSRF token handling (fetches `/sanctum/csrf-cookie` before non-GET requests)
  - SSR cookie forwarding from server context
  - Error transformation to `ApiError` shape
  - Credentials included on all requests
- [x] Added `generate:api` script to `apps/web/package.json`

## 📋 Next Steps (Phases 3-4)

### Phase 3: Incremental Migration
**Goal**: Replace existing API client code with Orval-generated hooks

1. **Generate Initial SDK**
   ```bash
   cd apps/web
   pnpm run generate:api
   ```
   This will create `src/api/generated.ts` with TypeScript types and React Query hooks.

2. **Migrate Auth Module**
   - Location: `apps/web/src/hooks/queries/useAuthQueries.ts`
   - Replace imports from `@content/shared-types` with Orval-generated types
   - Replace custom `fetchJson` calls with Orval hooks (e.g., `useGetAuthMe`, `usePostAuthLogin`)

3. **Migrate Projects Module**
   - Location: `apps/web/src/hooks/queries/useProjectsQueries.ts`
   - Location: `apps/web/src/hooks/mutations/useProjectMutations.ts`
   - Replace with Orval hooks (e.g., `useGetProjects`, `usePostProjects`, `usePatchProjectsById`)

4. **Migrate Remaining Modules** (in order)
   - Posts (`usePostsQueries.ts`, `usePostMutations.ts`)
   - Settings (`useSettingsQueries.ts`, `useSettingsMutations.ts`)
   - Scheduling (`useSchedulingQueries.ts`, `useSchedulingMutations.ts`)
   - LinkedIn (`useLinkedInQueries.ts`)
   - Billing (`useBillingQueries.ts`, `useBillingMutations.ts`)
   - Admin (`useAdminQueries.ts`)

### Phase 4: Cleanup
1. **Remove Shared Types**
   - Delete `apps/shared-types` directory
   - Remove `@content/shared-types` from `apps/web/package.json`
   - Remove Vite alias for `@content/shared-types`
   - Update Dockerfile if it copies shared-types

2. **Update Build Configuration**
   - Add `pnpm run generate:api` to CI pipeline before build
   - Ensure API is running during generation or use exported JSON file
   - Add `.gitignore` entry for `apps/web/src/api/generated.ts` if desired

## 🔧 How to Use Generated SDK

### Basic Query Example
```typescript
import { useGetAuthMe } from '@/api/generated'

function UserProfile() {
  const { data, isLoading, error } = useGetAuthMe()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>Hello {data?.user.name}</div>
}
```

### Mutation Example
```typescript
import { usePostAuthLogin } from '@/api/generated'

function LoginForm() {
  const login = usePostAuthLogin()

  const handleSubmit = async (email: string, password: string) => {
    try {
      await login.mutateAsync({ data: { email, password } })
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

## 📝 Key Implementation Details

### CSRF Token Handling
The Orval fetcher automatically:
1. Checks for `XSRF-TOKEN` cookie before non-GET requests
2. Fetches `/sanctum/csrf-cookie` if token is missing
3. Includes token in `X-XSRF-TOKEN` header
4. Prevents duplicate CSRF fetch requests with pending promise

### Error Handling
All API errors are transformed to:
```typescript
{
  error: string      // Human-readable message
  code: string       // Machine-readable code
  status: number     // HTTP status
  details?: unknown  // Optional additional context
}
```

### Response Envelopes
Scramble infers types from controller return shapes:
- Single items: `{ project: Project }`
- Lists: `{ items: Project[], meta: { page, pageSize, total } }`
- User: `{ user: User }`

## ⚠️ Important Notes

1. **API Must Be Running**: To generate types, either:
   - Have the API running at `http://localhost:3001`
   - OR modify `orval.config.ts` to use a local exported JSON file

2. **Keep Zod Where Needed**: Client-side validation can still use Zod schemas derived from Orval types

3. **Realtime Events**: SSE/broadcast events are out of scope for OpenAPI. Keep existing Echo setup for:
   - `project.progress`
   - `post.regenerated`
   - Other real-time notifications

4. **Authentication**: Cookie-based Sanctum auth remains unchanged. CSRF flow is automatically handled by Orval fetcher.

## 🎯 Success Criteria

Migration is complete when:
- [x] Backend generates valid OpenAPI 3.x spec at `/api/openapi.json`
- [x] Frontend can generate TypeScript types from spec
- [ ] All API calls use Orval-generated hooks
- [ ] No imports from `@content/shared-types` remain
- [ ] `apps/shared-types` directory is deleted
- [ ] Build passes with zero TypeScript errors
- [ ] All tests pass with Orval types
