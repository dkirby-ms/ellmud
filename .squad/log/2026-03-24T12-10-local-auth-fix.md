# Session: Dev Auto-Login Hook Wired Up

**Agent:** Drizzt  
**Timestamp:** 2026-03-24T12:10:00Z  
**Status:** Complete  

## What

Wired `useDevAutoLogin` hook into Login.tsx to auto-authenticate local dev users.

## Files Changed

- **packages/client/src/pages/Login.tsx** — Added hook import and invocation

## Outcome

Dev users now auto-login with `dev/devdev` credentials when running locally. Hook checks `import.meta.env.DEV` so it never runs in production.

## Commit

da93ab7

## Notes

- Requested by dkirby-ms
- Hook already existed — just needed wiring
- Zero production risk via Vite stripping
