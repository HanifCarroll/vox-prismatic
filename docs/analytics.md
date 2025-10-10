Analytics setup (Umami, Clarity, PostHog)

Overview
- Marketing pages (Blade): Umami + Microsoft Clarity, production-only.
- App (Inertia/Vue): PostHog, production-only.
- All scripts are gated via env and only render when keys/IDs are present.

Environment variables (apps/web/.env)
- Umami
  - UMAMI_ENABLED=true
  - UMAMI_SCRIPT_URL=https://analytics.your-domain.com/script.js
  - UMAMI_WEBSITE_ID=YOUR_UMAMI_WEBSITE_ID
- Microsoft Clarity
  - CLARITY_ENABLED=true
  - CLARITY_PROJECT_ID=YOUR_CLARITY_PROJECT_ID
- PostHog (app only)
  - POSTHOG_ENABLED=true
  - POSTHOG_HOST=https://us.posthog.com
  - POSTHOG_KEY=YOUR_POSTHOG_PROJECT_API_KEY

Where scripts are injected
- Marketing pages layout: apps/web/resources/views/marketing/layout.blade.php
  - Umami: defer script tag with website ID
  - Clarity: standard snippet loader
- App layout (Inertia): apps/web/resources/views/app.blade.php
  - PostHog: snippet with api_host + key, plus SPA pageview hook in apps/web/resources/js/app.js

Important events
- Waitlist success (marketing): fired when the signup completes
  - Implemented in apps/web/resources/views/marketing/home.blade.php via `umami.track('waitlist_success')` when the server flashes success.

In‑app PostHog events (browser)
- app.project_created
- app.processing_started / app.processing_completed / app.posts_generated
- app.post_approved / app.post_rejected / app.post_pending
- app.publish_now_requested / app.publish_now_succeeded / app.publish_now_failed
- app.post_scheduled / app.post_schedule_failed / app.post_unscheduled
- app.post_auto_scheduled / app.posts_auto_scheduled / app.posts_bulk_unscheduled
- app.posts_regeneration_queued / app.posts_regeneration_queue_failed / (plus realtime post.regenerated handled by UI)
- app.linkedin_connect_clicked / app.linkedin_connected / app.linkedin_connect_failed / app.linkedin_disconnected

Privacy & scope
- Clarity is included only on marketing pages.
- Do not send PII to analytics. Content/transcripts are never sent.
- PostHog captures pageviews on app route changes; custom events can be added via `window.posthog.capture(name, props)`.

Deploy notes
- Production containers must be restarted for Blade/layout changes to take effect.
- For Docker compose: rebuild/restart web-app service after updating env.

Creating an Umami goal
1) Open your Umami dashboard → select your website → Goals tab → “Create goal”.
2) Choose type:
   - “Custom event” and set Event name to `waitlist_success` (matches our marketing page event).
   - Alternatively, “Pageview” for URL‑based goals.
3) Save. Optional: mark as primary to show it in the overview.
4) Verify: Submit the waitlist form on the homepage; you should see conversions in near‑real‑time under Goals and in the Realtime view.
