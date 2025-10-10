# chrome-devtools Agent Testing Guide

Use this guide when driving the app with the Chrome DevTools MCP. Each task includes the target route, scripted steps (expressed as MCP method calls), success criteria, and failure notes. Run tasks in order; record evidence (console output, DOM text) for each.

## 0. Environment Prep
- Ensure local stack is running (`pnpm dev-start`) with queue worker + Reverb.
- Confirm base URL (e.g. `http://localhost:3001`). Substitute the origin in navigation commands.
- Launch a new DevTools page per task: `chrome-devtools__new_page { "url": "<origin>/login" }`.
- Prefer `chrome-devtools__wait_for` before interacting with late-loading UI.

## 1. Authentication

### 1A. Login Flow
- **Route**: `/login`
- **Steps**
  1. `chrome-devtools__fill` email + password inputs (ids: `login-email`, `login-password`).
  2. Click submit button (`type="submit"`).
  3. `chrome-devtools__wait_for` text `"Projects"`.
- **Success**: Redirect to `/projects`; header contains “Projects”; flash toast absent.
- **Failure Handling**: Capture validation text under form, ensure incorrect passwords surface “These credentials do not match”.

### 1B. Registration (Invite Mode)
- **Route**: `/register?code=<valid>`
- **Steps**
  1. Fill `register-name`, `register-email`, `register-code`, `register-password`.
  2. Submit and wait for `/projects`.
- **Success**: session persisted, nav shows authenticated layout.
- **Failure Notes**: If invite invalid, UI shows inline error; capture screenshot or `innerText` for review.

### 1C. Logout
- **Route**: `/projects`
- **Steps**: Click profile menu button → logout form submit (`method="post"`).
- **Success**: Redirect to `/login`; session cookie cleared (verify by reloading `/projects` -> redirected).

## 2. Projects List

### 2A. Listing & Filters
- **Route**: `/projects`
- **Steps**
  1. Verify presence of project cards (`data-test="project-card"` if available; fallback to list items).
  2. Use `chrome-devtools__fill` to set search field `project-search`, wait for debounce, assert filtered titles.
  3. Toggle a stage filter button (text “Processing”) and validate query string `?stage=processing`.
- **Success**: DOM reflects filtered projects; pagination still accessible.

### 2B. Project Deletion
- **Steps**
  1. For a specific card, click menu / delete button (`data-test="project-delete"`).
  2. Confirm modal via button text “Delete project”.
  3. Wait for toast “Project deleted” and verify card removed.
- **Failure**: If request fails, capture flash text (class `.text-red-600`).

## 3. Project Creation & Processing

### 3A. Create Project
- **Route**: `/projects/new`
- **Steps**
  1. Fill title (`project-title`) + transcript (`project-transcript`).
  2. Submit (button text “Create project”).
  3. Wait for redirect to `/projects/{id}/posts?` (observe via `chrome-devtools__wait_for` heading “Posts”).
- **Success**: Project detail shows `stage=processing`, progress indicator visible (~0%).

### 3B. Realtime Progress
- **While on detail page**
  1. Use `chrome-devtools__wait_for` to observe progress text updates from WebSocket events (`project.progress` → step/progress updates like “Cleaning transcript”, “Generating insights”).
  2. Confirm final state: `stage` chip text “Posts” and progress 100%. If an error occurs, the UI shows an error banner (event `project.failed`).
- **Failure**: If error banner appears (“Processing failed”), note message and ensure Post list absent.

## 4. Post Management

### 4A. Edit Post Content
- **Route**: `/projects/{id}/posts`
- **Steps**
  1. Select first post card (data attribute `data-test="post-card"`).
  2. Modify textarea `data-test="post-content"`; blur.
  3. Wait for toast “Post updated.” and confirm content persisted after `chrome-devtools__reload`.
- **Success**: Updated text matches DOM; network request returns 302/200.

### 4B. Status Changes
- **Steps**: Use status dropdown to set to “Approved”; wait for toast + badge change.
- **Failure**: If server rejects, capture inline error.

### 4C. Bulk Actions
- **Steps**
  1. Use selection checkboxes (`data-test="post-select"`).
  2. Trigger bulk menu (text “Bulk actions”) → choose “Approve selected”.
  3. Verify all selected posts show approved badge.

### 4D. Hook Workbench
- **Steps**
  1. Open hook drawer button (text “Open hook workbench”).
  2. Wait for frameworks to load; select presets, click “Generate hooks”.
  3. On success, preview hook list; apply a hook, ensure editor updates with inserted opening line.
- **Failure**: If frameworks fetch fails, expect inline error text; document.

### 4E. Regenerate Dialog
- **Steps**
  1. Open post’s “Regenerate” button.
  2. Select post type preset + add instructions.
  3. Submit; after toast, wait for `post.regenerated` update (content changed, status reset to “Pending”).

## 5. Scheduling & Publishing

### 5A. Manual Schedule
- **Pre-req**: Post with `status=approved`.
- **Steps**
  1. Open scheduling dialog (“Schedule” button).
  2. Fill datetime input (selector `input[type="datetime-local"]`).
  3. Submit; expect toast “Post scheduled.” and schedule badge.
- **Failure**: Without LinkedIn token expect toast “LinkedIn is not connected”; verify dialog remains open.

### 5B. Auto-schedule
- **Pre-req**: User preferences + slots configured.
- **Steps**: Click “Auto-schedule” on post; confirm toast states “Post auto-scheduled.”; check scheduled timestamp inserted.

### 5C. Publish Now
- **Steps**
  1. For approved post with LinkedIn token: click “Publish now”.
  2. On success, badge switches to Published; toast appears.
  3. If API failure, capture flash with status details (especially in local mode).

## 6. Settings

### 6A. LinkedIn Integration
- **Route**: `/settings?section=integrations`
- **Steps**
  1. Click “Connect LinkedIn” (triggers hard redirect; verify new page).
  2. Simulate callback by navigating to `/linkedin/callback?code=<fake>&state=<valid>`; expect error flash if credentials missing.
  3. Disconnect button posts to `/settings/linked-in/disconnect`; confirm status toggles.

### 6B. Writing Style
- **Steps**: Modify tone/perspective selects; submit form; wait for toast “Writing style saved.”; verify values persist after reload.

### 6C. Scheduling Preferences & Slots
- **Steps**
  1. Change timezone select, lead time input; submit.
  2. Add slot (weekday select + time input), submit “Save slots”.
  3. Confirm new slot row renders.

### 6D. Account Deletion (Danger Zone)
- **Steps**
  1. Open Danger tab; fill password + type `DELETE`.
  2. Submit; expect JSON success, browser redirected to `/login`.
  3. Attempt `/projects` to confirm 302 to `/login`.

## 7. Calendar & Analytics

### 7A. Calendar
- **Route**: `/calendar`
- **Steps**: Verify scheduled posts list, pagination controls (“Next”, “Previous”), and deep links to project detail (`href="/projects/{id}/posts?post=..."`).

### 7B. Analytics Dashboard
- **Route**: `/analytics`
- **Steps**
  1. Confirm summary cards show numeric values.
  2. Adjust days via query `?days=7`; ensure counts update.
  3. Validate publishing cadence table rows <= 14 days.

## 8. Admin Console (admin user only)

### 8A. Dashboard Overview
- **Route**: `/admin`
- **Steps**: Verify range selector buttons change request payload (observe via console/XHR), statistics render, and error banners on failure.

### 8B. Trial Management
- **Steps**
  1. Open trial dialog for a user row.
  2. Edit end date + notes, submit.
  3. Confirm table reflects new trial end date and badge state (Trialing/Inactive).

### 8C. Delete User
- **Steps**: Open delete dialog, type `DELETE`, submit; expect row removed + toast.
- **Guard**: attempt to delete self → expect inline error “Admins cannot delete their own account…”.

### 8D. Invites
- **Route**: `/admin/invites`
- **Steps**: Create invite (fill form), verify new row appended; use copy button (`data-test="copy-invite"`) and ensure “Copied!” feedback; delete row and confirm removal.

## 9. Failure & Resilience Checks

### 9A. Unauthorized Access
- **Steps**
  1. Log out.
  2. Navigate to `/projects` – confirm redirect to `/login`.
  3. Login as non-owner; try accessing another user’s project via direct URL; expect 403 page.

### 9B. Stage Guard
- **Steps**: From project detail with stage `posts`, attempt manual `fetch('/projects/{id}/stage', {method:'PUT', body:{nextStage:'processing'}})` via console and show JSON error `Invalid stage transition`.

### 9C. Realtime Disconnect
- **Steps**: In console, call `window.Echo.disconnect()`; verify UI surfaces “Realtime unavailable” and auto-reloads on reconnect (`window.Echo.connect()`).

## 10. Background Jobs (manual verification)
- Run `php artisan posts:publish-due --limit=1` in terminal and note log entries.
- Refresh calendar/analytics to ensure published post data updates accordingly.

---
For each task, log the MCP commands used and resulting DOM excerpts. Flag regressions immediately so they can be reproduced outside the automation environment.
