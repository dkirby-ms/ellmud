# Agent Orchestration: Jarlaxle (Systems Dev)

**Date:** 2026-03-19T16:32:56Z  
**Task:** Issue #6 — Basic Combat System (Strike, Dodge, Flee on 1s Tick)  
**Agent:** Jarlaxle (Systems Dev)  
**Mode:** background  
**Model:** claude-sonnet-4.5  

## Outcome

✅ **SUCCESS**

### Metrics

- **Test Coverage:** 32 new tests added (139 total server tests passing)
- **Commit:** `57e7bda`
- **Duration:** ~2.5 hours

### Files Produced

**Combat system core:**
- `packages/server/src/combat/CombatSystem.ts` — Pure logic class for combat resolution (no framework deps)
- `packages/server/src/combat/strike.ts` — Damage calculation using GDD formula (base dmg + dex modifier)
- `packages/server/src/combat/dodge.ts` — Dodge skill check (contested dex vs attacker dex)
- `packages/server/src/combat/flee.ts` — Flee resolver (movement validation, exit callback)
- `packages/server/src/combat/types.ts` — TypeScript interfaces (CombatAction, CombatResult, ExitResolver)

**Command handlers:**
- `packages/server/src/commands/handlers/strike.ts` — Strike command → CombatSystem.strike()
- `packages/server/src/commands/handlers/dodge.ts` — Dodge command → CombatSystem.dodge()
- `packages/server/src/commands/handlers/flee.ts` — Flee command → CombatSystem.flee()

**Tick integration:**
- `packages/server/src/state/ShardRoom.ts` — Updated with `combatSystem` instance, 1s tick loop calls `resolveTick()`
- `packages/shared/src/messages/COMBAT_RESULT.ts` — Structured message type for client consumption

**Tests (32 total):**
- `packages/server/src/combat/__tests__/strike.test.ts` — 8 tests (damage calc, accuracy, crits)
- `packages/server/src/combat/__tests__/dodge.test.ts` — 8 tests (skill check, contested roll, dodge chance)
- `packages/server/src/combat/__tests__/flee.test.ts` — 8 tests (exit validation, movement, blocked exits)
- `packages/server/src/combat/__tests__/CombatSystem.integration.test.ts` — 8 tests (tick loop, state transitions)

### Key Decisions

1. **Pure logic + callback injection:** CombatSystem has zero Colyseus dependencies.
   - Takes `ExitResolver` function for flee mechanics instead of room reference
   - All 32 tests run without framework setup — fast, deterministic, reusable elsewhere
   - Portable to Refuge duels, simulation, offline tools

2. **GDD damage formula:** Base damage = 5 + weapon bonus + (dex modifier × 2)
   - Critical hits: 1d20 roll ≥ 18 → 1.5× damage
   - Armor reduces incoming damage (Phase 2 feature)

3. **Dodge system:** Contested skill check (defender dex vs attacker dex + d20)
   - Dodge success negates 100% of damage
   - Dodge failure → full damage (no partial mitigation yet)

4. **Tick-based resolution:** Combat actions queued in 1s intervals.
   - Prevents spam, allows async narration enrichment per tick
   - Ready for Volo's LLM pipeline to narrativize tick results

### Cross-Team Impact

- **Drizzt (Issue #12):** Auth is orthogonal to combat. `playerId` flows unchanged. Authenticated players can still fight.

- **Volo (Issue #9):** Combat narration enters via `COMBAT_RESULT` message type. LLM pipeline can subscribe to tick-end events and enrich descriptions on-demand.

- **Minsc (Issue #13):** Web Terminal Client displays combat UI (HP bars, action buttons). Client sends strike/dodge/flee commands via existing command parser (no protocol change).

## Decision Record

See: `.squad/decisions/inbox/jarlaxle-combat-pure-logic.md`  
→ Merged to decisions.md per scribe protocol.

---

**Status:** Combat mechanics production-ready. 1s tick loop stable. Ready for Drowned Revenant AI (Issue #7) which will drive combat behaviors autonomously.
