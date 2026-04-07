# 2026-04-05T06:00Z — Jarlaxle | Enemy Telegraph System (Issue #280)

| Field | Value |
|-------|-------|
| **Agent routed** | Jarlaxle (Systems Developer) |
| **Why chosen** | Combat systems owner; responsibility for creature abilities and encounter flow; ability system integration required |
| **Mode** | sync |
| **Why this mode** | Core mechanic system with multiple animation/telegraphing edge cases; requires comprehensive testing before merge |
| **Files authorized to read** | GDD.md §6.5 (telegraph spec), creature abilities, combat timing, action queue, issue #280 |
| **File(s) agent must produce** | Telegraph system, wind-up mechanics, broadcast logic, 11 tests, branch push, PR #300 |
| **Outcome** | Completed — Telegraph types (ABILITY, ENVIRONMENTAL), wind-up phase, broadcast to players, 11 tests. PR #300 opened. |

---

## Work Summary

### 1. Telegraph Type System (IMPLEMENTED)

Defined creature ability telegraphs per GDD §6.5:

**Telegraph types:**
- **ABILITY**: Creature will use special ability (Heavy Strike, Block, etc.)
  - Duration: 1-2 ticks (wind-up animation)
  - Broadcast: "X winds up a Heavy Strike..." → "X attacks with a Heavy Strike!"
- **ENVIRONMENTAL**: Area hazard telegraph (AOE spell, trap spring, etc.)
  - Duration: 1-3 ticks (environmental state change)
  - Broadcast: "The ground trembles..." → "Lava erupts in 3x3 area!"

Each telegraph includes:
- `telegraphType`: ABILITY | ENVIRONMENTAL
- `originCreature`: Who triggered the telegraph
- `targetZone`: Affected creature IDs or area coordinates
- `startTick`: When wind-up began
- `durationTicks`: Total wind-up duration
- `abilityName`: (for ABILITY only) "Heavy Strike", "Block", etc.

### 2. Wind-Up Mechanics (IMPLEMENTED)

- **File:** `packages/server/src/game/TelegraphSystem.ts`
- **Wind-up tracking:** List<Telegraph> on CombatState
- **Tick lifecycle:**
  1. `TelegraphSystem.updateTelegraphs()` called at tick start
  2. Each telegraph countdown decrements
  3. When duration reaches 0: Action resolves, broadcast final effect
- **Player visibility:** Players see telegraph notifications before ability resolves (enables reactions)
- **Stacking:** Multiple telegraphs can be active; displayed in order

### 3. Broadcast Integration (IMPLEMENTED)

Telegraph broadcasts sent to all room participants via ZoneRoom.broadcast():

- **Wind-up start:** "X winds up a Heavy Strike! (resolves in 2 ticks)"
- **Countdown tick:** "X's Heavy Strike is almost ready..."
- **Resolution:** "X attacks with a Heavy Strike, dealing 15 damage to Y!"

Uses fire-and-forget pattern (async narration, never blocks combat tick).

### 4. Creature Ability Integration (UPDATED)

- **CreatureAbility.ts** gains `telegraphDurationTicks` field
- **Default abilities:**
  - Heavy Strike: 1-tick wind-up (fast attack)
  - Block: 0-tick wind-up (instant defensive stance)
  - Observe: 1-tick wind-up (scanning for weakness)
- **Custom abilities:** Can define longer wind-ups for dramatic effects

### 5. Test Coverage (COMPREHENSIVE)

11 tests covering:

- **Telegraph lifecycle:** Create, countdown, resolve, cleanup
- **Wind-up duration:** 1-tick and 2-tick wind-ups countdown correctly
- **Multiple telegraphs:** Stack without interference
- **Broadcast messages:** Correct notifications at start/countdown/resolution
- **Creature integration:** Heavy Strike/Block/Observe wind-ups work as expected
- **Tick processing:** Telegraphs decrement each tick, resolve at duration 0
- **Player notifications:** All participants receive broadcast messages
- **Cleanup:** Resolved telegraphs removed from active list

### 6. Integration Points

- **EngineClient.tick()** — Call `TelegraphSystem.updateTelegraphs()` at tick start
- **CombatSystem.resolveAction()** — Create telegraph before ability executes
- **CreatureAbility** — Define wind-up duration per ability
- **ZoneRoom.broadcast()** — Send telegraph notifications to all combatants

## Architecture

```
Creature action: Heavy Strike → CombatSystem.resolveAction()
                                         ↓
                        Create Telegraph(ABILITY, 1 tick)
                                         ↓
                        Broadcast: "winds up Heavy Strike"
                                         ↓
    Next tick: TelegraphSystem.updateTelegraphs()
                                         ↓
                            Duration = 0 → Resolve
                                         ↓
                      Deal damage, broadcast resolution
```

## Branch Collision Note

Initial attempt lost to working tree conflict with Volo/Drizzt concurrent development (same file edits on CombatState). Retry used strict branch isolation (`git checkout` on separate task agent to prevent checkout conflicts). All 11 tests passing after retry.

## Status

PR #300 opened, all 11 tests pass, CI green. Ready for review by Elminster.
