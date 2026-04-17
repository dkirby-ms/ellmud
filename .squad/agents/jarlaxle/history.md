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

**Status:** Ready for implementation
