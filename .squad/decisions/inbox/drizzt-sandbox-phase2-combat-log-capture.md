# Decision: Sandbox Combat Log Captures via ZoneRoom Tick Interception

**Author:** Drizzt  
**Date:** 2026-01-19  
**Status:** Implemented

## Context

Phase 2 sandbox `log` command needs to capture combat events as they happen in the arena. Three approaches were considered:
1. Add callback/hook to CombatSystem itself
2. Intercept TickResult in ZoneRoom's update loop
3. Tap into narration/broadcast path

## Decision

**Option (b) — Intercept in ZoneRoom's sandbox tick path.** After `resolveTick()` returns, we call `recordSandboxCombatEvents(tickResult, tick)` only when `hasSandboxCombat` is true. This:
- Requires zero changes to CombatSystem's core resolution logic
- Scopes logging to sandbox rooms only (no overhead in production combat)
- Uses a module-level ring buffer (max 100 entries, FIFO) in sandbox.ts

## Implications

- Stat override tracking uses module-level Maps — works because sandbox is single-instance per zone server
- `_resetSandboxState()` exported for test cleanup between test cases
- If CombatSystem ever changes its TickResult shape, the log capture will need updating (but it only reads `events[].type/actorName/targetName/damage/dodged` — stable fields)
