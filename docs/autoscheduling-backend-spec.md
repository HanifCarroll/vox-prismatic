Autoscheduling Backend Spec (MVP)

Scope
- Adds autoscheduling for LinkedIn posts using per‑user preferred timeslots.
- Applies across all projects owned by the user (per‑user scope).
- Uses ISO weekday convention (Monday=1 … Sunday=7).
- Blocks autoschedule actions if preferences/slots are missing.

Principles
- Keep MVP minimal: no preview endpoint, no blackout dates, no per‑day caps.
- Minute precision for timeslots (seconds/millis = 0).
- Simple conflict handling (check‑then‑update; retry next slot on conflict).
- Reuse existing scheduler to publish due posts.

Data Model (DB)
- Table: user_schedule_preferences
  - user_id INT NOT NULL FK → users.id (UNIQUE)
  - timezone VARCHAR(100) NOT NULL (IANA, e.g., "America/New_York")
  - lead_time_minutes INT NOT NULL DEFAULT 30 (0 allowed)
  - created_at TIMESTAMP NOT NULL DEFAULT now()
  - updated_at TIMESTAMP NOT NULL DEFAULT now()
  - Unique index: (user_id)

- Table: user_preferred_timeslots
  - id SERIAL PRIMARY KEY
  - user_id INT NOT NULL FK → users.id
  - iso_day_of_week SMALLINT NOT NULL CHECK (iso_day_of_week BETWEEN 1 AND 7)
  - minutes_from_midnight INT NOT NULL CHECK (minutes_from_midnight BETWEEN 0 AND 1439)
  - active BOOLEAN NOT NULL DEFAULT TRUE
  - created_at TIMESTAMP NOT NULL DEFAULT now()
  - updated_at TIMESTAMP NOT NULL DEFAULT now()
  - Unique index: (user_id, iso_day_of_week, minutes_from_midnight)

- Optional indexes (add only if profiling indicates need)
  - posts(scheduled_at)
  - posts(schedule_status, scheduled_at)

Shared Types (Zod) — apps/shared-types/src/scheduling.ts
- PreferredTimeslotSchema
  - isoDayOfWeek: number (1–7, ISO Monday=1)
  - time: string ('HH:mm')
  - active: boolean (default true)

- SchedulingPreferencesSchema
  - timezone: string (IANA)
  - leadTimeMinutes: number (int, 0–1440, default 30)

- GetSchedulingPreferencesResponseSchema
  - { preferences: SchedulingPreferences }

- UpdateSchedulingPreferencesRequestSchema
  - SchedulingPreferences

- ListTimeslotsResponseSchema
  - { items: PreferredTimeslot[] }

- UpdateTimeslotsRequestSchema
  - { items: PreferredTimeslot[] }  // replace‑all semantics; min length 1

- AutoScheduleSingleResponseSchema
  - { post: Post }

- AutoScheduleProjectRequestSchema
  - { limit?: number (1–200) }

- AutoScheduleProjectResponseSchema
  - { scheduled: Post[], meta: { requested: number, scheduledCount: number } }

Endpoints
- Scheduling (new module: /api/scheduling)
  - GET /api/scheduling/preferences
    - Auth: required
    - 200 { preferences }
    - 404 if none configured

  - PUT /api/scheduling/preferences
    - Auth: required
    - Body: UpdateSchedulingPreferencesRequestSchema
    - 200 { preferences }

  - GET /api/scheduling/slots
    - Auth: required
    - 200 { items: PreferredTimeslot[] } (active only by default)

  - PUT /api/scheduling/slots
    - Auth: required
    - Body: UpdateTimeslotsRequestSchema (replace‑all)
    - 200 { items: PreferredTimeslot[] }
    - 422 if empty, duplicates, or out‑of‑bounds entries

- Posts (extend existing module)
  - POST /api/posts/:id/auto-schedule
    - Auth: required; rate‑limited
    - Preconditions: post.status='approved', LinkedIn token present, preferences + at least one active slot
    - Result: 200 { post }
    - Errors: 422 if no preferences/slots or no slot within horizon; 400 if no LinkedIn token; 403/404 as applicable

  - POST /api/projects/:id/posts/auto-schedule?limit=N
    - Auth: required; rate‑limited
    - Schedules approved, unscheduled posts in project up to N (default: all)
    - Result: 200 { scheduled: Post[], meta: { requested, scheduledCount } }
    - Errors: 422 if no preferences/slots; 403/404 as applicable

Autoscheduling Logic
- Inputs: userId, preferences (timezone, leadTimeMinutes), active timeslots.
- Start time: now + leadTimeMinutes, interpreted in user's timezone.
- Horizon: search forward up to 60 days.
- For each day in horizon:
  - If day ISO matches any active slot's isoDayOfWeek:
    - For each matching slot: map 'HH:mm' → local datetime (seconds/millis=0) → convert to UTC.
    - Skip candidates earlier than now + leadTime (in local time).
- Conflict check (per candidate):
  - Slot is free if no existing post for this user at exact UTC minute with schedule_status IN ('scheduled','publishing').
  - SQL pattern: join posts→content_projects by project owner (user).
- Assignment:
  - Single: pick first free candidate; set scheduledAt, scheduleStatus='scheduled'.
  - Bulk: order posts deterministically (createdAt asc, id asc), assign sequential free candidates until limit or no more slots.
- Concurrency: check‑then‑update; if update fails due to race, try next candidate. Keep simple for MVP.

Business Rules
- Only schedule approved posts; publishing reuses existing job.
- LinkedIn token must be connected to schedule.
- Block autoschedule if preferences or active slots are missing (422).
- Minute accuracy; normalize seconds/milliseconds to zero.

Validation & Errors
- Validate timezone (IANA); reject invalid values.
- isoDayOfWeek in 1..7; time in 'HH:mm'; server computes minutes_from_midnight.
- leadTimeMinutes ≥ 0; default 30 (0 allowed to disable buffer).
- Use existing AppException types for consistent error shape.

Testing (high‑level)
- Preferences & slots: PUT/GET roundtrip; replace‑all with dedupe and bounds checks.
- Single autoschedule: assigns expected next slot and sets scheduleStatus.
- Project autoschedule: multiple posts assigned sequential slots; partial when insufficient slots.
- Conflicts: two contenders for same minute → one advances to next slot.
- Timezone/DST: unit tests around transitions using fixed IANA zones.

Migration Plan
- Create user_schedule_preferences and user_preferred_timeslots with constraints and unique indexes.
- Optionally add posts(scheduled_at) index; add composite (schedule_status, scheduled_at) only if needed.
- Add date-fns-tz dependency to API for timezone/DST handling.

Notes / Decisions (resolved)
- Scope: per user across all projects.
- ISO weekday convention (Mon=1 … Sun=7).
- Lead time: default 30 minutes, configurable; prevents scheduling too close to now.
- Block autoschedule when no preferences/slots.

