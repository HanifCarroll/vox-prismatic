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
- Support quick human review/approval at insight and post stages
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
  - id, projectId, insightId, content, platform (LinkedIn), isApproved, createdAt
  - Relationships:
    - ContentProject: many‑to‑one
    - Insight: many‑to‑one

#### Deferred Entities (Post-MVP)

- Transcript (separate entity - currently embedded in ContentProject)
- ScheduledPost (for scheduling functionality)
- PromptTemplate (for custom AI prompts)
- ProjectActivity (for activity timeline)

### Project lifecycle stages

#### MVP Stages (Simplified)
1. Processing — Transcript and insights being generated (synchronous with SSE progress)
2. Review — Insights ready for human review
3. Posts — Posts generated and ready for review
4. Ready — Approved posts ready for immediate publishing

#### Deferred Stages (Post-MVP)
- Scheduled — Posts queued for publishing
- Publishing — Posts being published via background jobs
- Published — All posts live with tracking
- Archived — Project completed and archived

### Technical Approach (MVP)

- **Processing Strategy**: Long-running HTTP requests with Server-Sent Events (SSE) for real-time progress updates
- **No Background Jobs**: Synchronous processing to simplify architecture and deployment
- **Polling Fallback**: Simple status polling for browsers that don't support SSE
- **Timeout Handling**: 5-minute timeout for processing requests (sufficient for MVP scale)

### Required features (LinkedIn‑first)

- Authentication
  - User registration and login
  - JWT‑based authentication
  - Password reset flow
  - LinkedIn OAuth for publishing

- Dashboard
  - User‑specific project overview by stage with counts and progress
  - Action items: projects needing insight review, posts ready to approve/schedule
  - Recent activity timeline for user's projects
  - Quick create button

- Projects
  - Projects list with search, filters (stage, tags), and views (cards, list, kanban)
  - Batch processing UI: select multiple projects and move them to the next appropriate stage (no backend assumptions in this doc)
  - Create project: guided wizard (source input → setup → automation preferences → review)

- Project detail
  - Project header: key metadata, stage/status, high‑level metrics
  - Pipeline visualization: current stage and progress
  - Content tree: transcript → insights → posts hierarchy
  - Action panel: context‑aware actions based on stage (process, extract insights, generate posts, approve, schedule, publish)
  - Transcript viewer: cleaned text with quick preview and open‑full‑view
  - Insight reviewer: bulk approve/reject, score‑based filters, categories, verbatim quotes
  - Post editor (LinkedIn): platform‑aware preview, character count, hashtag helpers, media placeholders, inline editing, bulk approve
  - Scheduling panel (LinkedIn): list and calendar views, timezone selector, optimal‑time guidance (can be heuristic in Phase 1)
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

- Creating a new content project (MVP - text/URL only)
  1) User lands on Projects and clicks New Project
  2) Pastes transcript text or URL (no file uploads in MVP)
  3) Enters title and description
  4) Clicks "Process" - sees real-time progress via SSE
  5) Project completes processing with insights ready for review

- Managing a project through the lifecycle
  - Insight review
    1) See "Insights Ready" count; open project
    2) Review insights with scores, categories, and verbatim quotes
    3) Bulk approve/reject; optionally auto‑approve high‑score insights
  - Post generation and review
    1) Generate LinkedIn drafts from approved insights
    2) Edit content with character counter and preview; bulk approve
  - Scheduling and publishing (LinkedIn)
    1) Move approved posts to schedule
    2) Select times (manual or suggested) and confirm
    3) Monitor publishing status and view results in the project timeline

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
- Scheduled posting with calendar view
- Custom AI prompt templates per user
- Timezone-aware scheduling
- Detailed activity timeline
- Batch operations across projects
- Background job queues for async processing

### Notes on future extensibility (informational)
- The entity model and navigation should accommodate additional platforms later without disrupting the project‑centric workflow. Platform‑specific rules (character limits, media, formatting) can be added per platform while keeping the core lifecycle and UI patterns consistent.


