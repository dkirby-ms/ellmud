# Admin Token Validation — Findings for Regis

**From:** Minsc (Tester)  
**Issue:** #369 — admin invalid token error  
**Date:** 2026-07-15

## Analysis of the Bug

The original bug: invalid admin tokens were stored to localStorage, then `authenticated` was set to `true` on page load based solely on `!!getAdminToken()` — no server validation on mount. Every admin page broke with 403s.

## What Regis Has Already Fixed (Verified by Tests)

I found that Regis has already landed these changes (all 35 tests pass against them):

1. **`validateAdminToken()` function** in `admin-api.ts` — makes a lightweight API call to verify the token
2. **`ADMIN_AUTH_FAILURE_EVENT`** — `adminFetch` dispatches this custom event on 401/403
3. **Mount-time validation** — `AdminLayout` calls `validateAdminToken()` on mount to catch stale tokens
4. **Auth failure listener** — Resets to login form when any admin API call gets 401/403
5. **`validating` loading state** — Shows spinner while stored token is checked
6. **`handleAdminLogin` uses `validateAdminToken()`** — Validates before setting `authenticated = true`

## Test Coverage Written (35 tests total)

### Client-side (`packages/client/src/__tests__/admin-token-validation.test.tsx` — 17 tests):
- Empty/missing/whitespace token submission → shows error, doesn't store
- Invalid token → rejected immediately, cleared from storage, no admin content shown
- Valid token → admin UI loads, token stored
- Recovery → can re-enter valid token after rejection, error clears on typing
- Stale stored token → detected on mount, cleared, shows "no longer valid" message
- `ADMIN_AUTH_FAILURE_EVENT` → mid-session auth failure resets to login with "expired" message
- Validating state → shows loading while stored token is checked

### Server-side (`packages/server/src/__tests__/admin-token-validation.test.ts` — 18 tests):
- Missing/malformed Authorization header → 401
- Wrong/partial/case-altered/whitespace tokens → 403
- Correct token → 200
- ADMIN_TOKEN not set → 503 (fail-closed)
- Error response format validation
- Anticipated validate-token endpoint contract

## Note for Regis

All tests pass against the current `dev` branch. No additional implementation changes needed from what I can see — your fix is solid. The test suite is ready to merge with the PR.
