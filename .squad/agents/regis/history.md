# Regis — Client Developer History

## Learnings & Assignments

### 2026-04-17: Issue #467 — Combat HUD Phase A (Client)

**Assignment:** Wire combatant state to CombatHUD component via store + message handler

**Context:**
- Elminster completed architecture analysis for Combat HUD feature (#467)
- CombatHUD component is 90% built with proper props structure
- Server will broadcast new COMBAT_STATE message each combat tick
- Client needs to: receive message → expand state reducer → bind to CombatHUD

**Your Role (Phase A — Client Stream):**
1. Expand AppState.combat in store.ts:
   - Add combatants: Array<{id, name, hp, maxHp, hpTier, isPlayer, currentTarget, telegraphedAction}>
   - Add hostileIds: string[]
   - Add playerTargetId: string
2. Add SET_COMBAT_STATE reducer case to update combat state from message payload
3. Wire message handler in ZoneExploration.tsx:
   - Listen for MessageTypes.COMBAT_STATE
   - Dispatch SET_COMBAT_STATE action with message payload
4. Update StatusPanel.tsx to pass real data to CombatHUD:
   - availableTargets from combat.combatants filtered by combat.hostileIds
   - groupMembers from combat.combatants filtered by isPlayer flag
   - enemyStatus derived from combatants where id === playerTargetId

**Dependencies:** None — Jarlaxle (server stream) can work in parallel once message type is defined

**Timeline:** ~3 hours including testing

**Related Files:**
- packages/client/src/store.ts (state + reducers)
- packages/client/src/components/ZoneExploration.tsx (message handler)
- packages/client/src/components/StatusPanel.tsx (UI binding)
- packages/client/src/components/CombatHUD.tsx (component definition)

**Full Specification:** See `.squad/decisions/decisions.md` (merged from inbox)

**Status:** Ready for implementation
