# Jarlaxle — Server Developer History

## Learnings & Assignments

### 2026-04-17: Issue #467 — Combat HUD Phase A (Server)

**Assignment:** Implement COMBAT_STATE server message type and broadcast logic

**Context:**
- Elminster completed architecture analysis for Combat HUD feature (#467)
- CombatHUD component on client is 90% built but lacks server support
- Server has all required data (Combatant list, HP, targets) in memory but only sends per-event narratives to clients
- Blocking issue: No structured snapshot of combatant state is broadcast to clients

**Your Role (Phase A — Server Stream):**
1. Add COMBAT_STATE message type to shared/index.ts with interface:
   - encounterId, tick, combatants[], hostileIds[], playerTargetId
   - Each combatant includes: id, name, hp, maxHp, hpTier, isPlayer, currentTarget, telegraphedAction
2. Implement ZoneRoom.deliverCombatResults() broadcast after narration events
   - Send unicast per player (not broadcast) to prevent enemy scouting
   - Derive combatant data from CombatSystem each tick
   - Include telegraph data from Combatant.windUp if present

**Dependencies:** None — Regis (client stream) can work in parallel once message type is defined

**Timeline:** ~5 minutes for message type definition, then proceed with implementation

**Related Files:**
- packages/server/src/rooms/ZoneRoom.ts (add broadcast logic)
- packages/shared/index.ts (message types)
- packages/server/src/combat/CombatSystem.ts (data source)

**Full Specification:** See `.squad/decisions/decisions.md` (merged from inbox)

**Status:** ✅ Implemented — PR #469

## Learnings

### COMBAT_STATE Implementation (2026-04-17)

- **Unicast pattern**: COMBAT_STATE is sent per-player (not broadcast) so `hostileIds` and `playerTargetId` are perspective-correct. Same pattern used for EFFECTIVE_STATS.
- **Broadcast timing**: `broadcastCombatState()` runs in `update()` right after `deliverCombatResults()`, inside the `hasActiveEncounters()` guard — no broadcast when combat is idle.
- **CombatSystem accessors added**: `getActiveEncounters()` and `getEncounterCombatants(encounterId)` — these iterate the private maps without exposing internals.
- **Status derivation**: Combatant status (`fighting`/`downed`/`dead`) is derived from `hp <= 0` + `downingSystem.isPlayerDowned()`. Downed players and pending-death-teleport players are excluded from receiving the message.
- **Shared types location**: `packages/shared/src/index.ts` — all message interfaces and `MessageTypes` constant live here. Build with `npm run build` in `packages/shared` before server compilation.
- **Key files**: `ZoneRoom.ts:broadcastCombatState()`, `CombatSystem.ts:getActiveEncounters/getEncounterCombatants`, `shared/index.ts:CombatStateMessage`
- **Tests**: 156 server test files (3280 tests) all pass. E2e tests require a running server and fail independently.
