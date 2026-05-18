## 2026-07-22T00:00:00Z: Synchronous state mutations before awaits in fire-and-forget async handlers

**By:** Drizzt (Engine Dev)  
**Date:** 2026-07-22  
**Status:** Implemented  
**Commit:** 131f6a5

### Context

CI flake in death-penalty test caused by `handlePlayerDeath()` setting `player.deathPenalty` after two `await` calls, but being called fire-and-forget from tick handlers.

### Decision

When an async method is called fire-and-forget (no `await` at call site), any synchronous state mutations that callers might observe must happen BEFORE the first `await`. This applies to `handlePlayerDeath()` and any similar pattern in tick handlers.

### Rationale

The tick system and tests observe state synchronously. If a fire-and-forget async function defers state writes behind awaits, the state appears stale until the microtask queue drains — which is non-deterministic under load.

### Applied To

`player.deathPenalty` assignment moved before `incrementDeathCount`/`setLastDeathTime` awaits in `ZoneRoom.handlePlayerDeath()`.

### Team Impact

Any future fire-and-forget async handlers in tick code should follow this pattern.

---

## 2026-01-01T00:00:00Z: Expand CI/CD paths-ignore

**By:** Khelben (CI/CD Dev)  
**Date:** 2025-01-01  
**Status:** Implemented  
**Scope:** CI/CD configuration

### Context

The CI/CD workflow was only ignoring `docs/`, `.squad/`, and `*.md` files. Changes to workflow files, infrastructure, Copilot config, and repo metadata were still triggering full CI runs unnecessarily.

### Decision

Added these paths to `paths-ignore` in both `pull_request` and `push` triggers:

- `.github/**` — workflow/agent config changes
- `.copilot/**` — Copilot session state
- `infra/**` — infrastructure-as-code (Bicep/Terraform)
- `LICENSE`
- `.gitattributes`
- `.gitignore`

`workflow_dispatch` left untouched (manual trigger, no paths concept).

### Rationale

These paths contain no application code. Skipping CI for them saves runner minutes and reduces noise. If a workflow change itself needs validation, `workflow_dispatch` can be used manually.

---

## 2026-05-18T09:42:59Z: Load Simulator Module (Drizzt)

**By:** Drizzt (Engine Dev)
**Date:** 2026-05-18
**Status:** ✅ Implemented

### Decision

Use a server-side load simulator that opens real loopback WebSocket clients with the `ws` library against `ws://127.0.0.1:${PORT}` and manage it through `SIMULATE_LOAD` plus admin endpoints.

### Rationale

The demo goal is observable autoscaling pressure, so fake counters are weaker than actual socket handshakes and keepalive traffic. Keeping the simulator inside the server process makes startup, shutdown, and admin control straightforward.

### Implementation

- Auto-start via `SIMULATE_LOAD` environment variable
- Default demo target: 50 connections
- Runtime controls: `GET /admin/api/load-simulator/status`, `POST /admin/api/load-simulator/start`, `POST /admin/api/load-simulator/stop`
- Graceful ramp: 5 connections per second with periodic ping frames

---

## 2026-05-18T09:42:59Z: SIMULATE_LOAD Infrastructure (Khelben)

**By:** Khelben (CI/CD Dev)
**Date:** 2026-05-18
**Status:** ✅ Implemented

### Decision

- Add `simulateLoad` as an optional deploy-time Bicep parameter in `infra/main.bicep` and `infra/modules/container-apps.bicep`
- Pass it into the Azure Container App as the `SIMULATE_LOAD` environment variable with a default empty string (demos off by default)
- Mirror the setting in `infra/main.bicepparam`, `.env.example`, and `infra/keda-scaledobject.yaml` documentation

### PR #491 Compatibility

No direct conflict found with PR #491 in `infra/modules/container-apps.bicep`. Edits touch different concerns and non-overlapping lines. Merge order is safe.

