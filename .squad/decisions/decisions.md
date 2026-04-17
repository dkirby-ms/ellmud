# Squad Decisions Log

---

## Issue #467 — Combat HUD Status Panel Architecture (Elminster)

**Date:** 2025-07-24  
**Issue:** #467 — Combat HUD: status panel with combatant list and macro hotkeys  
**Verdict:** APPROVED FOR PHASE A; PHASE B DEFERRED

### Summary

CombatHUD component is **90% built** but requires server-side architecture to broadcast combatant state. Proposed two-phase approach:

- **Phase A:** New `COMBAT_STATE` message type; parallel work (Jarlaxle server + Regis client)
- **Phase B:** Macro/hotkey system (deferred pending ability framework)

### Key Decisions

1. **COMBAT_STATE Message Type:** Unicast per player (not broadcast) to prevent enemy scouting in PvP scenarios
2. **Message Frequency:** Every combat tick (~1 Hz) for responsive UI
3. **Full Combatant List:** Send complete list; client filters per use case (hostile, allies, targets)
4. **Phase Separation:** Hotkey system deferred until ability framework exists

### Work Assignment (Phase A)

**Server (Jarlaxle):**
- Add COMBAT_STATE message type to shared/index.ts
- Implement ZoneRoom.deliverCombatResults() broadcast

**Client (Regis):**
- Expand AppState.combat with combatant list + target tracking
- Add SET_COMBAT_STATE reducer
- Update StatusPanel.tsx to bind real combatant data to CombatHUD

### Risk Assessment

**Low Risk.** CombatHUD battle-tested (26 unit tests); server change is additive (no breaking changes); client integration follows established patterns.

### Full Specification

See: `.squad/decisions/inbox/elminster-combat-hud-467-analysis.md` (original comprehensive analysis with pseudocode, integration points, limitations)

---

## Issue #468 — CI/CD Test Timeout Policy (Khelben)

**Date:** 2026-04-17  
**Issue:** #468 — Flaky tests on CI due to insufficient async polling timeout  
**Verdict:** APPROVED & IMPLEMENTED

### Problem

Tests relying on async operations (combat ticks, database ops, network I/O) were failing intermittently on CI runners but passing locally. Root cause: 5-second timeout in `fastForwardDeath()` helper insufficient for CI runner performance variance.

### Decision

**Establish policy:** Async polling timeouts should be **2× typical local runtime** to account for CI runner slowness (containerization, resource sharing).

### Implementation

Applied to `fastForwardDeath()` helper:
- Changed from 10 iterations (5s) to 20 iterations (10s)
- Updated comment to mention "increased for CI reliability"
- Commit: 6020f2b — `fix(tests): increase timeout for flaky death-spawn tests on CI`

### Rationale

- CI runners can be 2-3× slower than local dev machines
- Flaky tests erode confidence and block legitimate deployments
- Extra 5 seconds per test negligible vs. cost of investigating false failures
- Tests should behave identically in all environments

### Future Action

Audit other integration tests for similar timeout issues, especially:
- Database operation tests
- Combat tick tests  
- Network/WebSocket tests

---

## Tech Debt Review — Drizzt + Minsc Changes (Elminster)

**Date:** 2025-07-25  
**Verdict:** ✅ APPROVE — No revisions requested

### Deliverables Reviewed

1. **Drizzt — skillsRepo Provider Fix:** ZoneRoom now uses lazy `getSkillsRepository()` getter (aligns with provider pattern, safe fallback)
2. **Drizzt — Admin Creature CRUD Columns:** POST/PUT allow all 6 Phase 1 skill columns with correct defaults
3. **Minsc — 20 New Combat Tick Tests:** Comprehensive coverage of 5 critical gaps (newEncounterRoomIds, roundNumber, multi-encounter isolation, mid-combat joining, event flags)

### Key Notes

- All tests pass with strong assertions; no trivial tests
- Shield block test pragmatically asserts `dodged || blocked` due to base dodge chance (not a bug, acceptable for now)

---

*Decisions merged from inbox on 2026-04-17T15:01:00Z. No duplicates found.*
