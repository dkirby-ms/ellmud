# Orchestration: Dev Auto-Login Hook Wired Up

**Agent:** Drizzt (Engine Dev)  
**Task:** Investigate and fix local dev login issue  
**Timestamp:** 2026-03-24T12:10:00Z  
**Outcome:** SUCCESS  
**Commit:** da93ab7  

## Summary

Drizzt identified and fixed a local dev experience issue where developers were forced to manually log in each time they started the app locally.

## Investigation

The `useDevAutoLogin` hook was already implemented with correct logic in the codebase but was never wired into `Login.tsx`. The hook checks `import.meta.env.DEV` to ensure it only runs during development.

## Resolution

**File Modified:** packages/client/src/pages/Login.tsx

- Added import for `useDevAutoLogin` hook
- Called the hook on component mount
- Gated with `import.meta.env.DEV` flag for zero production impact

## Verification

- Hook silently auto-authenticates with `dev/devdev` credentials
- On success: redirects to `/refuge`
- On failure: manual login form remains available
- Production: Vite strips all dev-only code from production builds

## Impact

- **Dev:** No more manual login on local startup
- **Prod:** Zero risk — development code is eliminated at build time
- **Related Teams:**
  - Jarlaxle: Reviewed Login.tsx changes (no visual changes)
  - Minsc: Integration tests may observe auto-login in dev mode

## References

- Decision: .squad/decisions/inbox/drizzt-local-auth.md
- Session log: .squad/log/2026-03-24T12-10-local-auth-fix.md
