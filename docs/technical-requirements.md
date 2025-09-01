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
  - `ChangeDetectionStrategy.OnPush`
  - Signals for local and shared state; `computed()` for derivations
  - Native control flow (`@if`, `@for`) where feasible
  - Typed Reactive Forms for multi‑step wizards and editors

- **Routing**
  - `/dashboard` – overview and action items
  - `/projects` – list with filters and views (cards/list/kanban)
  - `/projects/new` – creation wizard
  - `/projects/:id` – project detail
  - `/calendar` – LinkedIn publishing calendar
  - `/settings` – project defaults, timezone

- **Feature areas (folders)**
  - Dashboard: overview cards, action items, recent activity
  - Projects: list, filters, card/list/kanban views, creation wizard
  - Project detail: header, pipeline, actions, content tree, transcript, insights, posts, scheduling, activity timeline
  - Calendar: week/day/month views, event click‑through
  - Settings: defaults (LinkedIn), automation preferences, timezone

- **Shared**
  - UI components: pipeline indicators, filters, breadcrumb, action center, content view, activity timeline
  - Utilities: date/time, stage token mapping (colors/icons), platform rules
  - Stores/Services: project store, pipeline/progress store, UI preferences store

### Data model (Phase 1)
- **ContentProject**
  - id, title, description, tags
  - sourceType (audio|video|text|url), sourceUrl/fileName/filePath
  - currentStage, overallProgress, createdAt, updatedAt, lastActivityAt
  - createdBy
  - targetPlatforms: LinkedIn only
  - autoApprovalSettings, publishingSchedule
  - relationships: Transcript (1), Insights (many), Posts (many), ScheduledPosts (many)
  - summary: insightsTotal, insightsApproved, postsTotal, postsScheduled, postsPublished

- **Transcript**
  - id, projectId, content, cleanedContent, duration, wordCount, speakerLabels, status, createdAt, updatedAt

- **Insight**
  - id, projectId, transcriptId, content, quote, score, category, postTypeSuggestion, isApproved, reviewedBy, reviewedAt, createdAt, updatedAt

- **Post** (LinkedIn)
  - id, projectId, insightId, platform = LinkedIn, content, mediaUrls, hashtags, characterCount, isApproved, reviewedBy, reviewedAt, createdAt, updatedAt

- **ScheduledPost** (LinkedIn)
  - id, projectId, postId, platform = LinkedIn, scheduledFor, status (pending|published|failed), publishedAt, publishUrl, error, createdAt, updatedAt

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
- **ProjectStore**
  - Holds project list, selection, filters, and current project
  - Derived maps: byStage counts, summaries

- **PipelineStore**
  - Holds per‑project progress/jobs and recent activity (UI only in Phase 1)
  - Accepts push events from mock streams; later from SSE

- **UIPreferencesStore**
  - View modes, sidebar/filter visibility, date/timezone preferences
  - Persist minimal settings to URL params and localStorage

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
- Complex role/permission model
- Advanced analytics dashboards

### Suggested implementation sequence (UI‑first)
1) Projects list (filters, views, URL state, bulk actions)
2) Project detail (header, pipeline, actions, content tree)
3) Insight reviewer and post editor (bulk approve, inline edit, character rules)
4) Scheduling panel and publishing calendar (LinkedIn)
5) Dashboard (overview, action items, recent activity)
6) Settings (defaults, timezone)


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
  - `ProjectsController`: CRUD; actions: `process-content`, `extract-insights`, `generate-posts`, `schedule-posts`, `publish-now`
  - `InsightsController` (nested under project): list/update/approve
  - `PostsController` (nested under project): list/update/approve
  - `DashboardController`: `project-overview`, `action-items`
  - `EventsController` (SSE): `/api/projects/{id}/events` (project‑scoped stream)
  - `AuthController` (LinkedIn): initiate/callback, token storage

- **Application services** (single responsibility)
  - `ProjectService`, `TranscriptService`, `InsightService`, `PostService`
  - `PipelineService` (stage transitions + progress updates)
  - `SchedulingService` (create scheduled entries, enqueue jobs)
  - `PublishingService` (LinkedIn publish + status mapping)
  - `LinkedInAuthService` (token lifecycle)

- **Worker jobs (Hangfire)**
  - Each job validates preconditions, updates stage/progress atomically, emits activity, and records failures with reasons.
  - Idempotency keys: projectId + action; short dedup window

### Data model (tables)
- `ContentProjects` (current_stage, overall_progress, config)
- `Transcripts`
- `Insights` (score, category, approved flags)
- `Posts` (platform=LinkedIn, content, hashtags, media, character_count, approved)
- `ScheduledPosts` (scheduled_for, status, published_at, publish_url, error)
- `ProjectActivities` (audit + timeline)
- `OAuthTokens` (LinkedIn, encrypted)

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
- JWT auth for API; per‑user LinkedIn tokens stored encrypted; automatic refresh
- Retriable external calls (Polly) with backoff; map errors to user‑friendly messages
- Serilog + basic metrics (job counts/success rate, publish outcomes); health endpoints

### Non‑goals (Phase 1 back end)
- Multi‑platform adapters (X/Threads/Facebook)
- Complex RBAC/teams; advanced analytics

### Extensibility notes
- Add platforms behind a feature flag with platform adapters; keep controller shapes stable
- Optionally split worker to a separate process without changing contracts


