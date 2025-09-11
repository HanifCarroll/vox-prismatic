---
description: Use pnpm for JavaScript workspaces (Angular/Tauri) and .NET for API.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using pnpm for package management for the JavaScript apps (Angular web, Tauri desktop).

- Use `pnpm install` instead of `npm install` or `yarn install`
- Use `pnpm run <script>` instead of `npm run <script>` or `yarn run <script>`
- For Angular, use the Angular CLI (`ng serve`, `ng build`) via package scripts
- For Tauri desktop, use `pnpm tauri dev` and `pnpm tauri build`
- Access environment variables in JS apps via `process.env` where applicable
- The API is a .NET 8 project; use `dotnet` CLI for build/test/run

## APIs (Project Conventions)

- API server is **ASP.NET Core Web API**.
- Persistence uses **Entity Framework Core** with **PostgreSQL**. Prefer DbContext repositories; avoid ad‑hoc SQL.
- HTTP client:
  - Frontend: Angular `HttpClient` (or `fetch` as needed)
  - Backend: .NET `HttpClient` with Polly for retries/backoff (configured)
- Validation: use DTOs with data annotations and explicit checks in services/controllers.
- OpenAPI/Docs via Swashbuckle (Swagger UI) at `/swagger`. A global prefix `/api` is enforced via an API prefix convention.

## Tauri v2

This project uses **Tauri v2**. Always use the latest Tauri v2 syntax and APIs:

### API Imports
- Use `import { invoke } from "@tauri-apps/api/core"` (NOT `@tauri-apps/api/tauri`)
- Use `import { getCurrentWindow } from "@tauri-apps/api/window"`
- Use `import { listen } from "@tauri-apps/api/event"`

### Tauri Commands
- Commands are registered with `tauri::generate_handler![]`
- Use `#[tauri::command]` attribute for command functions
- Command functions can be `async` and return `Result<T, String>`
- State management uses `State<'_, AppState>` parameter

### Backend (Rust)
- Use `tauri::Builder::default()` for app setup
- Use `AppHandle` for accessing app functionality
- Use `Manager` trait for path operations: `app_handle.path().app_data_dir()`
- Use proper async patterns with `tokio` runtime

### Frontend Integration
- Use modern Tauri v2 event system with `listen()`
- Use `invoke()` for calling backend commands
- Handle `Result` types properly in TypeScript

## Testing

Use `pnpm --filter web-angular test` (Angular CLI with Karma/Jasmine) for the web app.
Use `dotnet test` for API solution tests.

Unit test frameworks vary by project; prefer the defaults configured in each app.

## Frontend

The web application uses **Angular 20** with the following practices:
- Standalone components (no NgModules)
- Signals for component and shared state; `computed()` for derived state
- Change detection: `OnPush` for presentational/list components
- Native control flow (`@if`, `@for`, `@switch`), with `track` on lists
- Typed Reactive Forms for complex inputs (wizards, editors)
- SSE integration for real‑time updates
- Tailwind CSS v4 for styling

The desktop application uses **Tauri v2** with React and Vite for native desktop functionality.

# Content Creation Monorepo

An intelligent content workflow automation system built as a pnpm workspace monorepo. It transforms long‑form content (podcasts, videos, articles) into structured social posts with an advanced pipeline featuring:

- **Hangfire job queues** with PostgreSQL for reliable background processing
- **Real-time SSE updates** for live pipeline monitoring
- **OAuth integrations** for LinkedIn publishing
- **Human-in-the-loop checkpoints** with clear project lifecycle stages

## Project Overview (Current)

This monorepo contains a complete content intelligence pipeline with the following components:

### Components
- **API** (`apps/api-dotnet/`) – ASP.NET Core Web API with integrated Hangfire background jobs, EF Core (PostgreSQL), Swagger at `/swagger`, global prefix `/api`, SSE events at `/api/events`
- **Web** (`apps/web-angular/`) – Angular 20, Tailwind CSS v4, signals, OnPush
- **Desktop** (`apps/desktop-tauri/`) – Tauri v2 desktop app (audio + meeting detection)

### Pipeline Stages
1. Transcript Processing (AI‑assisted)
2. Insight Review (human)
3. Post Generation (AI + human)
4. Post Review (human)
5. Scheduling & Publishing (worker)

## Architecture & Structure

Built as a pnpm workspace with clear boundaries:

```
content-creation/
├── apps/
│   ├── api-dotnet/     # ASP.NET Core Web API with Hangfire background jobs
│   ├── web-angular/    # Angular 20 web app
│   └── desktop-tauri/  # Tauri v2 desktop app (audio, meeting detection)
├── docs/           # Documentation
└── compose.yml          # PostgreSQL + API services
```

### Data Management
- **PostgreSQL 16** via Docker
- **EF Core** models/entities: ContentProject, Transcript, Insight, Post, ScheduledPost, ProjectActivity, OAuthToken

### Integrations & Features  
- **AI**: Google Generative AI (Gemini) for insights/posts, Deepgram for transcription
- **Social**: LinkedIn with OAuth2 authentication and posting APIs
- **Queue System**: Hangfire with PostgreSQL for reliable background job processing
- **Real-time**: Server-Sent Events (SSE) for live pipeline updates
- **Notifications**: In-app notifications and alerts system

### Services
- **API (.NET)**
  - Health: `/api/health`
  - Swagger UI: `/swagger`
  - CORS origins via configuration (`Cors:AllowedOrigins`)
  - SSE events: `/api/events` for real-time updates
  - Hangfire dashboard: `/hangfire`
  - OAuth integrations (LinkedIn)
- **Web (Angular)**
  - Dev server on port 4200 (Angular CLI)
  - Real-time updates via Server-Sent Events
- **Desktop (Tauri v2)**
  - Audio recording, meeting detection, system tray operation
- **Background Jobs** (integrated in API)
  - Hangfire queue processors for background jobs
  - PostgreSQL-based job persistence and retry logic

### Desktop Features
- Audio recording with real-time duration
- Meeting detection (Zoom, Google Meet, etc.)
- System tray/background operation
- Local audio file management and playback
- Transcription integration with the API

## Environment Variables (Essentials)

Define in repo‑root `.env` for Docker compose and shared secrets:

```
# General
ASPNETCORE_ENVIRONMENT=Development

# Database (Docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=content_creation

# API keys
GOOGLE_AI_API_KEY=...
DEEPGRAM_API_KEY=...
LINKEDIN_ACCESS_TOKEN=...
```

## Development Workflow

Commands use pnpm workspace features for JS apps and dotnet CLI for API:

```bash
# Install JS deps
pnpm install

# Start database, API (dotnet watch), and Angular web together
pnpm run dev

# Run individual services
pnpm dev:web-angular   # Angular dev server (4200)
pnpm dev:api           # .NET API via dotnet watch
pnpm dev:desktop       # Tauri desktop app

# Build individual projects
pnpm run build:api      # Build .NET solution (Release)
pnpm run build:web      # Build Angular web app
pnpm run build:desktop  # Build Tauri desktop app

# Tests
pnpm run test:web       # Angular tests
pnpm run test:api       # .NET tests
```

## Docker

Unified `compose.yml` powers the database and API with multi‑stage builds via `TARGET`.

**Services:**
- **PostgreSQL 16**: Database with persistent volume
- **API**: ASP.NET Core Web API with EF Core migrations

```bash
# Development (default)
docker compose up

# Explicit targets
TARGET=development docker compose up
TARGET=production docker compose up
```

**Service Endpoints:**
- API: `http://localhost:5001` (health: `/api/health`, Swagger: `/swagger`)
- Web: `http://localhost:4200` (when run separately)
- Database: `postgresql://postgres:postgres@localhost:5432/content_creation`

## Notes for Contributors (Conventions)

- Prefer functional, pure utilities on the frontend. Use explicit error handling.
- In API, use DTOs and data annotations; avoid throwing for flow control.
- Keep EF Core access in services; avoid raw SQL unless necessary.
- Configure API base URLs and CORS origins via environment/appsettings.
- For desktop, follow Tauri v2 patterns (commands → services → threads); avoid blocking the UI thread.

## Programming Paradigm Guidelines (FP vs OOP)

### When to Use Functional Programming
**Prefer functional programming for:**
- **Stateless operations**: Authentication, validation, data transformation, utilities
- **Pure functions**: Calculations, formatters, parsers, converters
- **Simple modules**: When there's no complex state management or lifecycle
- **MVP/Prototypes**: Start functional, refactor to OOP only when complexity demands it
- **Utilities and helpers**: Logging, crypto, date handling, string manipulation

**Examples:**
```typescript
// Good: Simple, testable, no unnecessary abstraction
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

export function validateEmail(email: string): boolean {
  return emailRegex.test(email)
}
```

### When to Use Object-Oriented Programming
**Use OOP when you have:**
- **Complex state management**: Multiple related properties that change together
- **Lifecycle management**: Resources that need initialization and cleanup
- **Polymorphism needs**: Multiple implementations of the same interface
- **Domain modeling**: Business entities with behavior (e.g., Order, User with methods)
- **Dependency injection**: When you need to swap implementations for testing
- **Long-lived connections**: Database pools, WebSocket connections, message queues

**Examples:**
```typescript
// Good: Complex state and lifecycle justify a class
class DatabaseConnection {
  private pool: Pool
  
  constructor(config: DbConfig) {
    this.pool = new Pool(config)
  }
  
  async query(sql: string): Promise<Result> {
    // Connection management logic
  }
  
  async close(): Promise<void> {
    await this.pool.end()
  }
}
```

### General Guidelines
1. **Start simple**: Begin with functions, refactor to classes only when needed
2. **Avoid premature abstraction**: Don't create classes "just in case"
3. **Consider testability**: Both paradigms can be testable, but functions are often simpler to test
4. **Think about the team**: Use patterns your team understands and can maintain
5. **Performance matters**: Functions have less overhead for simple operations
6. **Consistency within modules**: Don't mix paradigms unnecessarily in the same module

### Red Flags for Overengineering
- Classes with only one method (should be a function)
- Classes with no state (should be a module of functions)
- Deep inheritance hierarchies for simple features
- Factory patterns for objects with no variants
- Singleton patterns for stateless utilities

## Testing Philosophy (Testing Trophy Approach)

### Testing Strategy Overview
**Follow the "Testing Trophy" approach instead of the traditional testing pyramid** for API development. This provides better confidence with less maintenance overhead.

```
        [E2E Tests]           <- Few critical user journeys (5-10%)
       /            \
    [Integration]              <- Main focus: API endpoint tests (60-70%)
   /              \
[Static + Unit]                <- Utilities and pure functions (20-30%)
```

### Test Distribution Guidelines

#### Integration Tests (60-70% - Main Focus)
- **Test through HTTP endpoints** with real database or mocked boundaries
- **Don't mock internal layers** - test the actual flow users experience
- **Use real implementations** of services, middleware, and utilities
- **Mock only external boundaries**: database, third-party APIs, file system
- **Cover user scenarios**: "User can register with valid credentials"

**Example Structure:**
```typescript
// auth.integration.test.ts
describe('Auth Integration Tests', () => {
  it('should handle full registration → login → access protected resource flow', async () => {
    // Test through HTTP endpoints with minimal mocking
  })
})
```

#### Unit Tests (20-30% - Complex Logic Only)
- **Only for complex algorithms** that benefit from isolation
- **Pure functions** with complex business logic
- **Utility functions** with edge cases
- **Skip simple pass-through functions**

**Example Structure:**
```typescript
// auth.utils.test.ts  
describe('Auth Utility Functions', () => {
  it('should validate password strength with all requirements', () => {
    // Test complex password validation algorithm
  })
})
```

#### E2E Tests (5-10% - Critical Journeys)
- **Complete user workflows** across multiple features
- **Happy path scenarios** that users actually follow
- **Business-critical flows** that must never break

### What NOT to Test Separately

- **Don't test DTOs/schemas separately** - Covered by integration tests
- **Don't test simple getters/setters** - No business value
- **Don't test framework features** - Trust that Hono/Express routing works
- **Don't mock what you don't own** - Like bcrypt, JWT libraries, database drivers
- **Don't test implementation details** - Test behavior, not internal structure

### Mocking Guidelines

#### Mock External Boundaries Only
```typescript
// ✅ Good: Mock external services
vi.mock('@/db', () => ({ db: mockDb }))
vi.mock('bcrypt', () => ({ hash: vi.fn(), compare: vi.fn() }))

// ❌ Bad: Mock internal layers
vi.mock('./auth.service', () => ({ registerUser: vi.fn() }))
```

#### Don't Mock Internal Architecture
```typescript
// ❌ Bad: Testing mocks, not real code
it('should call registerUser', () => {
  // This tests that mocks work, not that your code works
})

// ✅ Good: Testing actual behavior
it('should return JWT token after successful registration', async () => {
  // This tests what users actually experience
})
```

### Test Organization

#### File Structure
```
src/modules/auth/
├── __tests__/
│   ├── auth.integration.test.ts  # Main test file (HTTP endpoints)
│   ├── auth.utils.test.ts        # Complex utility functions only
│   └── helpers.ts                # Test utilities and fixtures
├── auth.ts                       # Implementation
├── auth.routes.ts                # Routes
└── auth.middleware.ts            # Middleware
```

#### Test Helpers
- **Create reusable test utilities** for common operations
- **Fixture builders** for test data
- **Helper functions** for authenticated requests
- **Keep helpers simple** and focused

```typescript
// helpers.ts
export function createTestUser(overrides = {}) { /* */ }
export async function makeAuthenticatedRequest(app, path) { /* */ }
```

### Benefits of This Approach

1. **Higher Confidence**: Tests actual user scenarios, not implementation details
2. **Easier Refactoring**: Can change internals without breaking tests
3. **Clearer Failures**: When tests fail, it's obvious what user functionality broke
4. **Less Maintenance**: Fewer tests to maintain, but better coverage
5. **Faster Development**: Less time writing and maintaining redundant tests

### Testing Anti-Patterns to Avoid

- **Testing through multiple layers with heavy mocking**
- **Separate tests for each function in the call chain**
- **Testing that function A calls function B**
- **100% unit test coverage at the expense of integration coverage**
- **Testing framework features or third-party libraries**
- **Complicated test setup that's harder to understand than the code being tested**

### When to Deviate

- **Legacy codebases**: Gradual migration to integration testing
- **Complex algorithms**: More unit tests for mathematical or business logic
- **Performance-critical code**: Focused performance tests
- **Libraries/SDKs**: More unit tests for public APIs

The goal is **confidence over coverage** - tests should give you confidence that your application works correctly for users, not that you've achieved a percentage target.

## Project-Specific Guidelines

Each application in this monorepo has its own CLAUDE.md file with specific conventions:

- **`apps/api/CLAUDE.md`**: Hono API patterns, logging guidelines, Drizzle ORM conventions
- **`apps/web-angular/CLAUDE.md`**: Angular 20 patterns, signals, Tailwind CSS (if exists)
- **`apps/desktop-tauri/CLAUDE.md`**: Tauri v2 patterns, Rust conventions (if exists)

Refer to the appropriate subdirectory's CLAUDE.md for detailed, context-specific guidelines when working in those codebases.