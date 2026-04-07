# 2026-04-05T05:00Z — Volo | Combat Narration Signals (Issue #283)

| Field | Value |
|-------|-------|
| **Agent routed** | Volo (Narrative Developer) |
| **Why chosen** | Owns narration pipeline; expertise in signal taxonomy and async fire-and-forget patterns from PR #292 |
| **Mode** | sync |
| **Why this mode** | Complex narration system with micro-batching optimization; requires comprehensive test coverage before merge |
| **Files authorized to read** | GDD.md §4.5 (narration spec), NarrationService.ts, combat.test.ts, issue #283 |
| **File(s) agent must produce** | CombatSignal types, signal taxonomy, batching controller, 30 tests, branch push, PR #298 |
| **Outcome** | Completed — Signal taxonomy (DAMAGE, HEAL, ABILITY_USE, STATUS_CHANGE), micro-batching controller with 100ms window, 30 tests. PR #298 opened. |

---

## Work Summary

### 1. Signal Taxonomy (IMPLEMENTED)

Defined comprehensive combat event signal types per GDD §4.5:

- **DAMAGE**: Attack resolved, target takes damage (includes crit/dodge flags)
- **HEAL**: Healing ability/potion effect applied
- **ABILITY_USE**: Creature used special ability (Heavy Strike, Block, etc.)
- **STATUS_CHANGE**: Buffs/debuffs applied or expired
- **DEATH**: Creature defeated
- **FLEE**: Creature fled encounter

Each signal carries minimal context (actor, target, amount, type) to enable flexible narration templates.

### 2. Micro-Batching Controller (IMPLEMENTED)

- **File:** `packages/server/src/narrative/combat-signal-batcher.ts`
- **Window:** 100ms rolling window collects signals before narration generation
- **Batching rules:**
  - DAMAGE signals from same source → aggregate into "dealt X damage over Y attacks"
  - ABILITY_USE signals → separate (each ability deserves unique narration)
  - STATUS_CHANGE signals → batch by status type
- **Fire-and-forget:** Narration queued asynchronously; never blocks combat tick
- **Fallback:** If batcher overflow, signals generate immediate narrations (fast path)

### 3. NarrationService Integration (UPDATED)

- **Method:** `generateCombatNarration(signals: CombatSignal[])`
- **Input:** Array of 1-N signals from batch window
- **Output:** Single prose block covering all signals ("You strike for 12 damage. Your Block stance deflects 3 additional damage...")
- **Caching:** Narration results cached by signal type + actor + target combination
- **Performance:** Batch of 5 signals generates 1 LLM call (vs 5 calls without batching)

### 4. Test Coverage (COMPREHENSIVE)

30 tests covering:

- **Signal taxonomy:** Each signal type serializes/deserializes correctly
- **Batching logic:** DAMAGE batching, ABILITY_USE isolation, STATUS_CHANGE grouping
- **Time window:** Signals older than 100ms treated separately
- **Overflow handling:** Queue > 10 signals triggers immediate narration
- **Fire-and-forget:** Narration async, never blocks combat tick
- **Fallback:** LLM unavailable → template text used
- **Cache hits:** Identical signal sets return cached narration
- **Multi-actor scenarios:** Narration correctly attributes actions (player vs creature)

### 5. Combat Integration Points

- **EngineClient.tick()** — After each combat action, signal → batcher
- **CombatSystem.resolveAction()** — Emits signals for damage/heal/ability/status
- **ZoneRoom.broadcast()** — Sends narrative events to all participants (fire-and-forget)

## Architecture

```
CombatSystem.resolveAction() → CombatSignal[] → Batcher → 100ms window
                                                    ↓
                                              [Signal[] ready] 
                                                    ↓
                                          NarrationService.generateCombatNarration()
                                                    ↓
                                          ZoneRoom.broadcast({narrate: text})
```

## Decision Document

Documented signal taxonomy and batching strategy in `.squad/decisions/combat-narration-signals.md`:
- When to batch vs separate narrations
- Cache key design (preventing stale narrations)
- Performance targets (99th percentile LLM latency <500ms for 5-signal batch)

## Status

PR #298 opened, all 30 tests pass, CI green. Ready for review by Elminster.
