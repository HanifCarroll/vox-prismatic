Title: Consolidate to a Single HTTP Client Abstraction
Status: ✅ Implemented

Current State
- Two parallel client layers exist:
  - Orval-generated client using Axios with a custom mutator handling CSRF, credentials, and error normalization.
  - A custom `fetchJson` helper with its own CSRF and error handling.
- Both implement cookie/CSRF flows, increasing divergence risk.

Desired State
- One canonical client abstraction used across the frontend for all API calls.
- Centralized CSRF handling, credentials, and error shape translation.

Motivation
- Avoid duplicated logic that can drift (headers, CSRF prefetch, error envelopes).
- Simplify debugging and improve consistency across queries and mutations.

High-Level Plan
1) ✅ Choose Orval (Axios) as the single abstraction because codegen already provides typed hooks and mutators.
2) ✅ Replace usages of `fetchJson` with generated Orval endpoints; delete or deprecate `fetchJson`.
3) ✅ Ensure the Axios mutator remains the only place for CSRF and error normalization.
4) ✅ Update AGENTS.md and README.md

Implementation Summary
- Removed 122 lines of duplicate CSRF/fetch logic from `apps/web/src/lib/client/base.ts`
- Verified no active usages of `fetchJson` existed in the codebase
- Confirmed `orval-fetcher.ts` has complete feature parity:
  - CSRF token handling with deduplication
  - SSR cookie forwarding via server-context
  - Error normalization to `ApiError` shape
  - 401/419 automatic redirect to login
  - All default headers (Accept, X-Requested-With)
- Updated AGENTS.md with clear directive to use Orval-generated hooks exclusively
- Updated README.md to document HTTP client architecture

