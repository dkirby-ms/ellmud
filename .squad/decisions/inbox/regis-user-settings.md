# Decision: Settings API client is self-contained (not reusing api.ts request())

**Author:** Regis  
**Date:** 2026-04-21  
**Issue:** #359  

## Decision

`settings-api.ts` has its own fetch logic instead of importing the shared `request()` from `api.ts`.

## Rationale

The shared `request()` fires the global 401 handler (`_on401`) which dispatches `LOGOUT`, clearing all auth state. For settings, a 401 should degrade gracefully (fall back to localStorage) — not force the user out of the app. Keeping the settings API self-contained means auth errors in settings don't cascade.

## Impact

If the team changes the base URL pattern or adds request interceptors to `api.ts`, `settings-api.ts` needs to be updated separately. If this becomes a maintenance burden, we can extract a shared `fetchWithAuth()` helper that takes an error strategy parameter.
