## API (.NET) Refactor Plan (Phase 1 Alignment + Simplified Architecture)

This plan aligns the current backend with Phase 1 scope and the Simplified Architecture Proposal. It first de-scopes and consolidates the existing monolith to a single clear path, then prepares for a vertical-slice + MediatR migration.

### Goals
- Ship Phase 1 quickly: LinkedIn-only, simple REST, minimal background jobs, no real-time.
- Remove overlapping/duplicated stacks and premature abstractions.
- Establish a stable base for a later vertical-slice migration.

### Guiding principles
- One way to do each thing (one lifecycle engine, one scheduler model, one publisher, one auth path).
- Phase 1 features only; defer analytics, SSE, multi-platform.
- Prefer delete over “keep for later” to reduce complexity; use feature flags only if removal is risky.

---

## Phase 0 – Safety & Inventory (0.5 day)
- Create a branch: `refactor/phase1-slimdown`.
- Enable CI on PR with build + unit tests (if any).
- Capture a DB snapshot; confirm EF migrations status.

---

## Phase 1 – De-scope to Phase 1 product scope (2–3 days)

### 1) Choose a single lifecycle/pipeline path
- Keep: `Infrastructure/Services/ProjectLifecycleService.cs` (Stateless + minimal Hangfire jobs per action).
- Remove:
  - `Infrastructure/Services/PipelineService.cs`
  - `Infrastructure/Services/ContentPipelineService.cs`
  - `Api/Controllers/PipelineController.cs`
  - DTOs under `Core/DTOs/Pipeline*` that are no longer used.
- Controllers:
  - Keep `ProjectActionsController` actions (process/extract/generate/schedule/publish/approve/reject) backed by `ProjectLifecycleService`.
  - Remove `Pipeline` endpoints.

### 2) Unify scheduled post model
- Canonical entity: `Core/Entities/ScheduledPost.cs`.
- Remove `Core/Entities/ProjectScheduledPost.cs` and related repository (`ProjectScheduledPostRepository`).
- Update `ProjectLifecycleService.SchedulePostsAsync` to create `ScheduledPost` instances (one per post) and update metrics accordingly.
- Update any queries/services/controllers using `ProjectScheduledPost` to use `ScheduledPost`.
- EF: add a migration to drop the `ProjectScheduledPosts` table and ensure `ScheduledPosts` is authoritative.

### 3) Single publisher implementation (LinkedIn-only)
- Keep: `Infrastructure/Services/PublishingService.cs` as the only `ISocialPostPublisher` implementation.
- Remove: `Infrastructure/Services/SocialPostPublisher.cs` and its registration.
- DI: In `Api/Program.cs`, ensure a single registration exists:
  - `builder.Services.AddScoped<ISocialPostPublisher, PublishingService>();`
- Remove non‑LinkedIn code paths:
  - Delete references to other platforms (e.g., "X") in generation/publish paths.
  - Restrict `WorkflowConfiguration`/`ContentProject` to LinkedIn in Phase 1 (retain structure but default to single platform).

### 4) Standardize LinkedIn auth on DB tokens
- Single path: use `LinkedInAuthService` for OAuth token lifecycle stored in DB (`OAuthTokens`).
- Update `LinkedInAdapter` to fetch a valid access token via `ILinkedInAuthService` rather than `IConfiguration`.
- Remove any use of `LinkedIn:AccessToken` config for runtime calls.
- Remove/disable `PlatformAuth` data path in `PublishingService` for Phase 1.

### 5) Remove real-time/SSE and hub (defer)
- Remove (or feature-flag OFF):
  - `Api/Controllers/EventsController.cs`
  - `Api/Infrastructure/Hubs/ProjectProgressHub.cs`
  - `Lib.AspNetCore.ServerSentEvents` registrations in `Program.cs`.
- Client can poll project status or use mock state until real-time is justified.

### 6) Trim analytics/optimal-time and queue dashboards
- In `PublishingService`:
  - Remove `GetOptimalTime(s)Async`, `GetQueueStatusAsync`, retry/cleanup analytics flows for Phase 1.
  - Keep minimal scheduled publish processing (`ProcessScheduledPost(s)Async`) and direct `PublishNowAsync`.
- Remove `AnalyticsEvent` usage unless strictly required for Phase 1.
- `DashboardController`/`DashboardService`:
  - Keep counts, basic activity, and project overview.
  - Remove advanced stats/"workflow pipeline" analytics until needed.

### 7) Reduce repositories and state services
- Remove repository wrappers for embedded entities (`ProjectMetricsRepository`, `WorkflowConfigurationRepository`). Access via `ContentProject` only.
- Remove unused state services (`InsightStateService`, `PostStateService`, `TranscriptStateService`) if controllers no longer call them.

### 8) DTO cleanup
- Remove DTOs no longer used after the above deletions (pipeline, queue, analytics-heavy shapes).
- Consolidate nested project endpoints to simple shapes used by the Angular app.

### 9) Background jobs minimal set
- Keep jobs: `ProcessContentJob`, `InsightExtractionJob`, `PostGenerationJob`, `PublishNowJob`.
- Remove jobs: `SchedulePostsJob` (if scheduling is handled inline), `ProjectCleanupJob` (defer).
- Hangfire: keep DB storage; expose Dashboard only in Development.

---

## Phase 2 – Prep for Vertical Slice (1–2 days)
- Introduce MediatR and create a `Features` folder (Projects, Insights, Posts, Publishing).
- Add 1–2 exemplar handlers (e.g., `CreateProject`, `ApproveInsight`) and route minimal endpoints through them.
- Keep existing services functioning; migrate feature-by-feature behind controllers.

## Phase 3 – Vertical Slice Migration (1–2 weeks, incremental)
- Move business logic from services to per-feature handlers.
- Consolidate domain into a Project aggregate (stage transitions, approvals) as proposed.
- Replace remaining service calls with MediatR requests/responses.
- Remove unused services/repositories after each feature migration.
- Replace Worker/Hangfire with a simple hosted background job queue (optional, post-Phase 1).

---

## File-by-file action checklist (Phase 1)

### Remove
- `apps/api-dotnet/src/ContentCreation.Infrastructure/Services/PipelineService.cs`
- `apps/api-dotnet/src/ContentCreation.Infrastructure/Services/ContentPipelineService.cs`
- `apps/api-dotnet/src/ContentCreation.Api/Controllers/PipelineController.cs`
- `apps/api-dotnet/src/ContentCreation.Core/Entities/ProjectScheduledPost.cs`
- `apps/api-dotnet/src/ContentCreation.Infrastructure/Services/SocialPostPublisher.cs`
- `apps/api-dotnet/src/ContentCreation.Api/Controllers/EventsController.cs`
- `apps/api-dotnet/src/ContentCreation.Api/Infrastructure/Hubs/ProjectProgressHub.cs` (if present)
- Stub repo files for embedded objects in `Infrastructure/Repositories/StubRepositories.cs` that are unused post-changes
- Unused DTOs under `Core/DTOs/Pipeline*`, `Core/DTOs/Queue*`, and analytics-heavy DTOs not referenced anymore

### Edit
- `apps/api-dotnet/src/ContentCreation.Api/Program.cs`:
  - Remove duplicate `ISocialPostPublisher` registration; keep only `PublishingService`.
  - Remove SSE service registrations and map endpoints when disabled.
  - Ensure CORS, Auth, Swagger remain unchanged.
- `apps/api-dotnet/src/ContentCreation.Infrastructure/Services/ProjectLifecycleService.cs`:
  - Replace creation of `ProjectScheduledPost` with `ScheduledPost` and update metrics accordingly.
- `apps/api-dotnet/src/ContentCreation.Infrastructure/Services/Publishing/LinkedInAdapter.cs`:
  - Fetch tokens via `ILinkedInAuthService` (DB) instead of configuration.
- `apps/api-dotnet/src/ContentCreation.Infrastructure/Services/PublishingService.cs`:
  - Restrict to LinkedIn; remove multi-platform branches and analytics/optimal-time functions.
  - Use `ScheduledPost` consistently; remove queue/cleanup features for Phase 1.
- `apps/api-dotnet/src/ContentCreation.Api/Controllers/*`:
  - Remove `Pipeline` routes.
  - Validate remaining controllers compile against the simplified services and DTOs.

### EF Migrations (if using code-first)
- Generate migration to drop `ProjectScheduledPosts` and any tables exclusively used by removed services.
- Verify `ScheduledPosts` schema fits Phase 1 use (status, scheduled time, post relation).

---

## Validation checklist
- Build succeeds; all controllers compile.
- Minimal e2e flow works:
  - Create Project → Process Content → Extract Insights → Approve Insights → Generate Posts → Approve Posts → Schedule/Publish Now
- LinkedIn-only publishing path works with DB-backed token.
- Dashboard counts and recent activity endpoints return.

---

## Rollout plan
- Land Phase 1 slim-down on a feature branch; QA with the Angular app against a dev DB.
- Cut a release tagged `phase1-alignment`.
- Begin Phase 2 MediatR/vertical slice migration behind controllers in small PRs.


