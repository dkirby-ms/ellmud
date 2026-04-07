# Orchestration Log: Drizzt (Versioning)

**Agent:** Drizzt (Engine Dev)  
**Task:** Set up Vite version injection, /api/version endpoint, version sync scripts  
**Status:** Completed  
**Timestamp:** 2026-04-01T01:33:13Z  

## Deliverable

Established semver versioning infrastructure:

- **Single source of truth:** Root `package.json` version (currently `0.1.0`)
- **Client injection:** Vite `define` injects `__APP_VERSION__` and `__BUILD_TIME__` at build time
- **Server endpoint:** `GET /api/version` returns `{ version, buildTime, nodeEnv }` — reads version from root package.json at startup
- **Sync script:** `npm run version:sync` propagates root version → all workspace package.json files
- **Bump workflow:** `npm run version:bump patch|minor|major` → then `npm run version:sync`

## Integration Points

- Admin UI can verify server ↔ client version match
- Release workflow (`squad-release.yml`) already reads root package.json for git tags — version flow consistent
- Build-time injection means zero runtime overhead for version checks

## Decision Files

- `.squad/decisions/inbox/drizzt-versioning.md` — Full specification
- User directive in `.squad/decisions/inbox/copilot-directive-2026-04-01T011200.md`

## Client Usage

- Code can access `__APP_VERSION__` / `__BUILD_TIME__` globals directly
- Recommended: Use `useVersion()` hook for safe fallbacks
