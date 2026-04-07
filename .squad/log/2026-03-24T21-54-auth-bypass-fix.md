# Session: Auth Bypass Fix

**Timestamp:** 2026-03-24T21:54:00Z  
**Agent:** Drizzt (Engine Dev)  
**Requested by:** dkirby-ms  

## Summary

Fixed local dev auth bypass: `AUTH_REQUIRED` now defaults to true; `useDevAutoLogin` is opt-in via `VITE_DEV_AUTO_LOGIN`. All 1,677 tests pass.

## Changes

- `packages/server/src/config.ts`: AUTH_REQUIRED default false → true
- `packages/client/src/hooks/useDevAutoLogin.ts`: Opt-in guard added
- `.env.example`: New env vars documented

## Impact

All team members now see login form in local dev by default. Can opt back in with `VITE_DEV_AUTO_LOGIN=true`.

## Decision

**auth-required-default**: AUTH_REQUIRED defaults to true in local dev.
