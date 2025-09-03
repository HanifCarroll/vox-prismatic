## Technical Requirements: Project‑Centric Content Platform (LinkedIn‑first)

This document guides implementation at a practical, high level. It complements the product requirements and is intentionally simple and non‑prescriptive. Optimize for fast iteration on UI and clear separation of concerns. Defer complex choices until necessary.

### Scope and principles
- **Phase focus**: LinkedIn only for creation, review, scheduling, and publishing UX.
- **Simplicity first**: Prefer straightforward flows and data models; avoid premature abstractions.
- **Project‑centric**: All work happens in the context of a `ContentProject` and its lifecycle.
- **UI‑first**: Build the front end with mock/local state first; API integration later.
- **Consistency**: Single source of truth for entities and lifecycle stages across views.

### System overview (high‑level)
- **Client**: Angular app (`apps/web`) using standalone components, signals, and OnPush change detection.
- **Backend**: ASP.NET Core Web API (monolith) + background jobs (Hangfire) sharing the same domain model; PostgreSQL for persistence; optional S3‑compatible storage for files; SSE for real‑time project events; LinkedIn OAuth 2.0 for publishing.
- **State**: Lightweight signal‑based stores in the client for projects, pipeline/progress, and UI preferences.

## Front end

### Frontend architecture (Angular)
- **Standards**
  - Standalone components (no NgModules)
  - **Change Detection Strategy**:
    - Use `ChangeDetectionStrategy.OnPush` for:
      - All presentational/dumb components receiving data via `@Input()`
      - List item components (project cards, insight items, post previews)
      - Display-only components (pipeline visualizations, activity timeline items)
      - Dashboard metric cards and status indicators
    - Keep default strategy for:
      - Container components orchestrating complex state during initial development
      - Components managing SSE/WebSocket connections until stable
      - Form containers during prototyping (convert to OnPush once stable)
  - **State Management**:
    - Signals for all component state and shared stores
    - `computed()` for derived state (counts, filters, summaries)
    - `effect()` sparingly, only for side effects (logging, localStorage sync)
    - Async pipe or `toSignal()` for Observable integration
  - **Template Syntax**:
    - Native control flow (`@if`, `@for`, `@switch`) exclusively
    - `track` function required for all `@for` loops (use entity IDs)
    - `@defer` for below-the-fold content in long project details
  - **Forms**:
    - Typed Reactive Forms for complex inputs (wizards, post editor)
    - Signal-based form state for simple filters and toggles
    - Custom form validators for LinkedIn constraints (character limits, hashtag rules)
  - **Component Design**:
    - Input transforms for type coercion where needed
    - Output emitters as readonly signals where appropriate
    - Required inputs using `input.required<T>()` for type safety
    - Avoid two-way binding; prefer explicit input/output contracts
  - **Service State Management**:
    - Use signals exclusively for synchronous state in stores
    - Private writable signals with public readonly accessors
    - Computed signals for all derived state
    - RxJS only at async boundaries (HTTP, SSE, WebSocket)
    - Convert Observables to signals with `toSignal()` when storing
    - No BehaviorSubjects or Subjects for UI state

- **Routing**
  - `/login` – user authentication
  - `/register` – new user registration
  - `/dashboard` – overview and action items
  - `/projects` – list with filters and views (cards/list/kanban)
  - `/projects/new` – creation wizard
  - `/projects/:id` – project detail
  - `/calendar` – LinkedIn publishing calendar
  - `/settings` – user profile, project defaults, timezone
  - `/settings/prompts` – prompt template management

- **Feature areas (folders)**
  - Auth: login, registration, password reset
  - Dashboard: overview cards, action items, recent activity
  - Projects: list, filters, card/list/kanban views, creation wizard
  - Project detail: header, pipeline, actions, content tree, transcript, insights, posts, scheduling, activity timeline
  - Calendar: week/day/month views, event click‑through
  - Settings: user profile, defaults (LinkedIn), automation preferences, timezone, prompt templates

- **Shared**
  - UI components: pipeline indicators, filters, breadcrumb, action center, content view, activity timeline
  - Utilities: date/time, stage token mapping (colors/icons), platform rules
  - Stores/Services: auth store, project store, pipeline/progress store, UI preferences store, prompt template store

### Data model (Phase 1)
- **User**
  - id, email, name, timezone, createdAt, lastLoginAt
  - relationships: ContentProjects (many), PromptTemplates (many)

- **ContentProject**
  - id, title, description, tags
  - sourceType (audio|video|text|url), sourceUrl/fileName/filePath
  - currentStage, overallProgress, createdAt, updatedAt, lastActivityAt
  - userId, createdBy
  - targetPlatforms: LinkedIn only
  - autoApprovalSettings, publishingSchedule
  - relationships: User (1), Transcript (1), Insights (many), Posts (many), ScheduledPosts (many)
  - summary: insightsTotal, insightsApproved, postsTotal, postsScheduled, postsPublished

- **Transcript**
  - id, projectId, content, cleanedContent, duration, wordCount, speakerLabels, status, createdAt, updatedAt

- **Insight**
  - id, projectId, transcriptId, content, quote, score, category, postTypeSuggestion, isApproved, reviewedBy, reviewedAt, createdAt, updatedAt

- **Post** (LinkedIn)
  - id, projectId, insightId, platform = LinkedIn, content, mediaUrls, hashtags, characterCount, isApproved, reviewedBy, reviewedAt, createdAt, updatedAt

- **ScheduledPost** (LinkedIn)
  - id, projectId, postId, platform = LinkedIn, scheduledFor, status (pending|published|failed), publishedAt, publishUrl, error, createdAt, updatedAt

- **PromptTemplate**
  - id, userId, name, description, type (insight|post), template, variables, isDefault, isActive, createdAt, updatedAt

- **Lifecycle stages**
  - Raw Content → Processing Content → Insights Ready → Insights Approved → Posts Generated → Posts Approved → Scheduled → Publishing → Published → Archived

### UX behaviors (key expectations)
- **Dashboard**: stage counts, action items (review insights, approve posts, schedule), recent activity.
- **Projects**: URL‑driven filters and view mode; bulk selection and stage advancement with confirmation dialogs.
- **Project detail**: context‑aware actions enabled by stage; inline editing for posts; bulk approve for insights and posts; content tree drives active view.
- **Scheduling**: simple list + calendar, timezone selector; drag‑and‑drop rescheduling at UI layer only; show optimal‑time tips (heuristic allowed).
- **Navigation**: clicks from dashboard/action items and calendar navigate to filtered project lists or directly to project detail.
- **Feedback**: skeletons and empty states for all key surfaces; toasts/dialogs for actions.

### State management (client)
- **AuthStore**
  - Current user, authentication state, JWT token
  - Handle login/logout flows

- **ProjectStore**
  - Holds user's project list, selection, filters, and current project
  - Derived maps: byStage counts, summaries

- **PipelineStore**
  - Holds per‑project progress/jobs and recent activity (UI only in Phase 1)
  - Accepts push events from mock streams; later from SSE

- **UIPreferencesStore**
  - View modes, sidebar/filter visibility, date/timezone preferences
  - Persist minimal settings to URL params and localStorage

- **PromptTemplateStore**
  - User's custom prompt templates
  - Active template selection for insights/posts

### Platform rules (LinkedIn‑first)
- Platform enum: LinkedIn only in Phase 1
- Character limits: enforce via UI counter and severity states
- Previews: LinkedIn rendering hints (line breaks, document/carousel placeholders)
- Hashtags and media fields are optional but supported in UI

### Mocking and test data
- Local mock data service that returns stable, realistic shapes for projects, insights, and posts aligned to the data model
- Deterministic IDs and timestamps for UI testing

### API boundary (informational; not required in Phase 1)
- Align future endpoints with the entities and lifecycle actions (projects list/detail, insights/posts nested routes, project actions for processing/extraction/generation/scheduling/publishing)
- Prefer simple REST with predictable shapes; avoid over‑nesting
- Real‑time: project‑scoped event stream for progress and activity (SSE or WebSocket) once needed

### Error handling and loading
- Always show skeletons while loading lists/cards/kanban/pipelines
- Consistent empty states with guidance for next actions
- Non‑blocking toasts for success/error; dialogs for destructive actions

### Performance & accessibility
- OnPush everywhere; avoid unnecessary bindings; compute once via signals
- Virtualize long lists if needed (not required for MVP)
- Keyboard navigation for bulk actions; ARIA labels for key controls; sufficient color contrast

### Testing
- Component tests for: project list (filters/selection), insight reviewer (bulk ops), post editor (character limits/approval), scheduling panel (event mapping)
- Shallow integration tests for routing and URL‑driven filters

### Non‑goals (Phase 1)
- Multi‑platform publishing (X/Threads/Facebook)
- Complex role/permission model (basic user separation only)
- Advanced analytics dashboards
- Team collaboration features

### Suggested implementation sequence (UI‑first)
1) Authentication (login, register, JWT integration)
2) Projects list (filters, views, URL state, bulk actions)
3) Project detail (header, pipeline, actions, content tree)
4) Insight reviewer and post editor (bulk approve, inline edit, character rules)
5) Scheduling panel and publishing calendar (LinkedIn)
6) Dashboard (overview, action items, recent activity)
7) Settings (user profile, defaults, timezone, prompt templates)


## Back end

### Architecture overview
- **Runtime**: ASP.NET Core Web API monolith with a co‑located background worker (Hangfire)
- **Persistence**: PostgreSQL (EF Core, code‑first)
- **Storage**: S3‑compatible (e.g., MinIO) for media/files, or local disk in development
- **Real‑time**: Server‑Sent Events (SSE) for project‑scoped progress/activity
- **Scheduling/Jobs**: Hangfire for `process-content`, `extract-insights`, `generate-posts`, `schedule-posts`, `publish-now`
- **Integrations**: LinkedIn OAuth 2.0 (authorization code + refresh), Marketing API for publishing

### Service boundaries (keep thin and explicit)
- **Controllers**
  - `AuthController`: register, login, logout, refresh, password reset
  - `ProjectsController`: CRUD (user‑scoped); actions: `process-content`, `extract-insights`, `generate-posts`, `schedule-posts`, `publish-now`
  - `InsightsController` (nested under project): list/update/approve
  - `PostsController` (nested under project): list/update/approve
  - `DashboardController`: `project-overview`, `action-items` (user‑scoped)
  - `EventsController` (SSE): `/api/projects/{id}/events` (project‑scoped stream)
  - `LinkedInAuthController`: OAuth initiate/callback, token storage
  - `PromptsController`: CRUD for user's prompt templates

- **Application services** (single responsibility)
  - `AuthService` (user authentication, JWT management)
  - `ProjectService` (user‑scoped projects), `TranscriptService`, `InsightService`, `PostService`
  - `PipelineService` (stage transitions + progress updates)
  - `SchedulingService` (create scheduled entries, enqueue jobs)
  - `PublishingService` (LinkedIn publish + status mapping)
  - `LinkedInAuthService` (OAuth token lifecycle)
  - `PromptService` (template management, variable substitution)

- **Worker jobs (Hangfire)**
  - Each job validates preconditions, updates stage/progress atomically, emits activity, and records failures with reasons.
  - Idempotency keys: projectId + action; short dedup window

### Data model (tables)
- `Users` (email, name, timezone, password_hash)
- `ContentProjects` (user_id, current_stage, overall_progress, config)
- `Transcripts`
- `Insights` (score, category, approved flags)
- `Posts` (platform=LinkedIn, content, hashtags, media, character_count, approved)
- `ScheduledPosts` (scheduled_for, status, published_at, publish_url, error)
- `ProjectActivities` (audit + timeline)
- `OAuthTokens` (user_id, LinkedIn, encrypted)
- `PromptTemplates` (user_id, type, template, variables)

### Lifecycle and events
- Stage coordinator enforces allowed transitions; writes `ProjectActivities` on state changes
- SSE stream emits: stage_started, stage_completed, stage_failed, job progress, publish outcomes

### API shape (to mirror FE needs)
- `GET /api/projects`, `GET /api/projects/{id}`, `POST /api/projects`, `PATCH /api/projects/{id}`, `DELETE /api/projects/{id}`
- `POST /api/projects/{id}/process-content|extract-insights|generate-posts|schedule-posts|publish-now`
- `GET /api/projects/{id}/insights`, `PATCH /api/projects/{id}/insights/{insightId}`
- `GET /api/projects/{id}/posts`, `PATCH /api/projects/{id}/posts/{postId}`
- `GET /api/dashboard/project-overview`, `GET /api/dashboard/action-items`
- `GET /api/projects/{id}/events` (SSE)

### Security and reliability
- JWT auth for API with user context; per‑user LinkedIn tokens stored encrypted; automatic refresh
- User data isolation: all queries filtered by authenticated user
- Retriable external calls (Polly) with backoff; map errors to user‑friendly messages
- Serilog + basic metrics (job counts/success rate, publish outcomes); health endpoints

### Non‑goals (Phase 1 back end)
- Multi‑platform adapters (X/Threads/Facebook)
- Complex RBAC/teams (basic user separation only)
- Advanced analytics
- Project sharing between users

### Extensibility notes
- Add platforms behind a feature flag with platform adapters; keep controller shapes stable
- Optionally split worker to a separate process without changing contracts


