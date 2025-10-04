## Product Requirements: Project‑Centric Content Platform (LinkedIn‑first)

### Problem statement
Coaches and consultants generate valuable insights during client calls, but turning those conversations into consistent, high‑quality LinkedIn content is time‑consuming and fragmented. Existing tools focus on isolated entities (transcripts, posts) rather than the end‑to‑end workflow. This creates context switching, status ambiguity, and inconsistent outcomes.

### Target audience
- Independent coaches and boutique consulting firms
- Small teams and agencies managing multiple client accounts
- Primary goal: convert expertise from calls into thought‑leadership content that drives visibility, trust, and leads on LinkedIn

### Purpose and scope
Build a project‑centric system that takes a single source of truth (a call transcript, uploaded audio/video, URL, or text) and guides it through a clear lifecycle to LinkedIn‑ready content. The product should prioritize clarity, speed, and repeatability, with an opinionated workflow that reduces decision fatigue.

Phase focus: LinkedIn only. The information architecture should remain flexible for future platforms, but the initial experience is optimized for LinkedIn formats and constraints.

### Core outcomes
- Turn one call into multiple LinkedIn‑ready posts
- Provide a single place to see progress, required actions, and outcomes
- Support quick human review/approval at the post stage (insights handled internally)
- Enable light scheduling and publishing workflow for LinkedIn

### Key entities and relationships

#### MVP Entities (Simplified Schema)

- User
  - id, email, password (hashed), name, linkedinToken, createdAt
  - Relationships:
    - ContentProjects: one‑to‑many

- ContentProject
  - id, userId, title, sourceUrl, transcript, currentStage, createdAt, updatedAt
  - Relationships:
    - User: many‑to‑one
    - Insights: one‑to‑many
    - Posts: one‑to‑many

- Insight
  - id, projectId, content, quote, score, isApproved, createdAt
  - Relationships:
    - ContentProject: many‑to‑one
    - Posts: one‑to‑many

- Post
  - id, projectId, insightId, content, platform (LinkedIn), status (`pending` | `approved` | `rejected` | `published`), scheduledAt, scheduleStatus, scheduleAttemptedAt, publishedAt, createdAt, updatedAt
  - Relationships:
    - ContentProject: many‑to‑one
    - Insight: many‑to‑one

#### Deferred Entities (Post-MVP)

- Transcript (separate entity - currently embedded in ContentProject)
- ScheduledPost (for richer scheduling history) — scheduling metadata lives on the Post record in MVP
- PromptTemplate (for custom AI prompts)
- ProjectActivity (for activity timeline)

### Project lifecycle stages

#### MVP Stages (Simplified)
1. Processing — Transcript normalized, insights extracted (internal), and 5–10 posts generated (SSE progress)
2. Posts — Draft posts ready for human review and editing
3. Ready — Approved posts ready for immediate publishing

#### Deferred Stages (Post-MVP)
- Scheduled — Posts queued for publishing
- Publishing — Posts being published via background jobs
- Published — All posts live with tracking
- Archived — Project completed and archived

### Technical Approach (MVP)

- Processing: Asynchronous queued jobs (Laravel queue) with Server-Sent Events (SSE) for real-time progress updates
- Job dispatch: Creating a project immediately enqueues processing (no manual "Process" step). Initial stage is `processing` with `processing_step = 'queued'`.
- Status stream: real-time broadcasts on `private-project.{projectId}` carry `{ step, progress }` updates plus completion/failure notifications.
- Idempotent trigger: `POST /api/projects/{id}/process` remains available; if the project is already processing it returns 409, and the client continues listening to the stream.
- Polling fallback: Simple status polling for browsers that don't support SSE
- Timeouts: Job timeout ~10 minutes; SSE stream heartbeat ~15s with a max stream window ~12 minutes

### Required features (LinkedIn‑first)

- Authentication
  - User registration and login
  - JWT‑based authentication
  - LinkedIn OAuth for publishing

- Projects
  - Projects list with search, filters (stage), and views (cards, list, kanban)
  - Batch processing UI: select multiple projects and move them to the next appropriate stage (no backend assumptions in this doc)
  - Create project: guided wizard (source input → setup → review)

- Project detail
  - Project header: key metadata, stage/status, high‑level metrics
  - Pipeline visualization: current stage and progress
  - Content tree: transcript → posts hierarchy (insights used internally)
  - Action panel: context‑aware actions based on stage (process, generate posts, approve, schedule, publish)
  - Transcript viewer: cleaned text with quick preview and open‑full‑view
  - Post editor (LinkedIn): platform‑aware preview, character count, hashtag helpers, media placeholders, inline editing, bulk approve
  - Show “source highlights” from internal insights inline (no separate approval step)
  - Scheduling panel (LinkedIn): list and calendar views, timezone selector, optimal‑time guidance (can be heuristic in Phase 1). Option to auto‑schedule into pre‑approved time windows.
  - Activity timeline: processing and user actions at the project level

- Publishing calendar (LinkedIn)
  - Calendar views (week/day/month) showing scheduled/published posts
  - Click‑through from calendar item to project/post
  - Filters by status and (future‑proof) by platform, defaulting to LinkedIn

- Settings (MVP)
  - User profile: name, email, password change
  - LinkedIn OAuth connection status
  - Basic project defaults

- Settings (Deferred)
  - Timezone preferences
  - Custom prompt templates
  - Advanced automation preferences
  - Scheduling preferences

- UX principles
  - Project‑centric navigation (Dashboard → Projects → Project Detail)
  - Clear empty states and skeleton loading for each major surface
  - Accessible controls for bulk actions, approvals, and navigation
  - Consistent stage colors/icons and terminology across views

### Important user flows

- Creating a new content project (MVP - transcript only)
  1) User lands on Projects and clicks New Project
  2) Pastes transcript text (no URLs or file uploads in MVP)
  3) (Optional) Enters a title; if left blank, a title is auto-generated by AI during processing
  4) Submits the form; the backend immediately enqueues processing and redirects to the project detail
  5) User sees real-time progress via SSE on the project detail page
  6) Project completes processing with post drafts ready for review

- Managing a project through the lifecycle
  - Post generation and review
    1) Posts are auto‑generated (5–10) from internal insights
    2) Edit content with character counter and preview; bulk approve
  - Scheduling and publishing (LinkedIn)
    1) Move approved posts to schedule
    2) Select times (manual or suggested) and confirm
    3) Monitor publishing status (posts advance to `published` and scheduling metadata clears once live) and view results in the project timeline

- Cross‑project management
  1) Use Dashboard to identify action items across all projects
  2) Filter Projects by stage to work in batches
  3) Perform batch stage advancement where appropriate (e.g., approve sets of posts for scheduling)

### Non‑goals (MVP)
- Support for non‑LinkedIn platforms (X, Threads, Facebook)
- Audio/video file uploads (text and URLs only)
- Scheduling and queued publishing (direct publish only)
- Custom prompt templates
- Timezone handling and preferences
- Activity timeline and audit logs
- Advanced analytics
- Team features and shared projects
- Background job processing (using synchronous SSE instead)

### Deferred Features (Post-MVP)
- Audio/video transcription from uploaded files
- Scheduled posting with calendar view and duplicate/content safety checks
- Password reset flow
- Custom AI prompt templates per user
- Timezone-aware scheduling
- Detailed activity timeline
- Batch operations across projects
- Background job queues for async processing

### Content generation defaults (MVP)
- Posts per transcript: 5–10 drafts (default target ~7)
- Insights: persisted internally for traceability and future improvements, not exposed for approval

### Notes on future extensibility (informational)
- The entity model and navigation should accommodate additional platforms later without disrupting the project‑centric workflow. Platform‑specific rules (character limits, media, formatting) can be added per platform while keeping the core lifecycle and UI patterns consistent.
