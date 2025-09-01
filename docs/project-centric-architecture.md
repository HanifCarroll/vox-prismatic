## Product Requirements: Project‑Centric Content Platform (LinkedIn‑first)

### Problem statement
Coaches and consultants generate valuable insights during client calls, but turning those conversations into consistent, high‑quality LinkedIn content is time‑consuming and fragmented. Existing tools focus on isolated entities (transcripts, posts) rather than the end‑to‑end workflow. This creates context switching, status ambiguity, and inconsistent outcomes.

### Target audience
- Independent coaches and boutique consulting firms
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

- ContentProject (aggregate)
  - Identity: id, title, description, tags
  - Source: sourceType (audio|video|text|url), sourceUrl, fileName, filePath
  - Lifecycle: currentStage, overallProgress, createdAt, updatedAt, lastActivityAt
  - User context: createdBy
  - Configuration: targetPlatforms (LinkedIn only in Phase 1), autoApprovalSettings, publishingSchedule
  - Relationships:
    - Transcript: one‑to‑one
    - Insights: one‑to‑many
    - Posts: one‑to‑many (derived from Insights)
    - ScheduledPosts: one‑to‑many (LinkedIn scheduling)
    - ProjectSummary (computed): insightsTotal, insightsApproved, postsTotal, postsScheduled, postsPublished

- Transcript (child of ContentProject)
  - id, projectId, content, cleanedContent, duration, wordCount, speakerLabels, status, createdAt, updatedAt

- Insight (child of ContentProject)
  - id, projectId, transcriptId, content, quote, score, category, postTypeSuggestion, isApproved, reviewedBy, reviewedAt, createdAt, updatedAt

- Post (child of ContentProject)
  - id, projectId, insightId, platform (LinkedIn), content, mediaUrls, hashtags, characterCount, isApproved, reviewedBy, reviewedAt, createdAt, updatedAt
  - Note: optimize for LinkedIn character limits, formatting, and document/carousel considerations

- ScheduledPost (child of ContentProject)
  - id, projectId, postId, platform (LinkedIn), scheduledFor, status (pending|published|failed), publishedAt, publishUrl, error, createdAt, updatedAt

### Project lifecycle stages
1. Raw Content — Just uploaded; needs processing
2. Processing Content — System cleaning/analyzing the source
3. Insights Ready — Insights generated; awaiting review
4. Insights Approved — Ready for post generation
5. Posts Generated — Draft posts created; awaiting review
6. Posts Approved — Ready for scheduling
7. Scheduled — Posts queued for publishing
8. Publishing — Posts being published
9. Published — All posts live
10. Archived — Project completed and archived

### Required features (LinkedIn‑first)

- Dashboard
  - Project overview by stage with counts and progress
  - Action items: projects needing insight review, posts ready to approve/schedule
  - Recent activity timeline at the project level
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

- Settings
  - Project defaults: target platform (LinkedIn), automation preferences, tagging
  - Personalization: timezone and scheduling preferences

- UX principles
  - Project‑centric navigation (Dashboard → Projects → Project Detail)
  - Clear empty states and skeleton loading for each major surface
  - Accessible controls for bulk actions, approvals, and navigation
  - Consistent stage colors/icons and terminology across views

### Important user flows

- Creating a new content project (from a call)
  1) User lands on Projects and clicks New Project
  2) Selects source (upload audio/video, paste URL, or paste text) and basic details
  3) Confirms setup (title, description, tags, target platform = LinkedIn)
  4) Sets optional automation preferences (e.g., auto‑generate posts after approval)
  5) Project is created and enters Processing Content

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

### Non‑goals (Phase 1)
- Support for non‑LinkedIn platforms (X, Threads, Facebook) — considered for later phases
- Advanced analytics beyond basic scheduling/published status
- Team use — single user only at first

### Notes on future extensibility (informational)
- The entity model and navigation should accommodate additional platforms later without disrupting the project‑centric workflow. Platform‑specific rules (character limits, media, formatting) can be added per platform while keeping the core lifecycle and UI patterns consistent.


