# 2026-04-05T05:30Z — Drizzt | Flee Skill Check System (Issue #285)

| Field | Value |
|-------|-------|
| **Agent routed** | Drizzt (Engine Developer) |
| **Why chosen** | Combat encounter specialist; owns creature AI and escape mechanics; threat system integration required |
| **Mode** | sync |
| **Why this mode** | Complex skill check system with probability validation; multiple edge cases require testing before merge |
| **Files authorized to read** | GDD.md §6.4 (flee spec), creature.ts, threat table, combat tests, issue #285 |
| **File(s) agent must produce** | FleeAction handler, skill check resolver, 3-tick cooldown logic, 14 tests, branch push, PR #299 |
| **Outcome** | Completed — Flee probability (threat-based), success logic, 3-tick cooldown preventing spam, 14 tests. PR #299 opened. |

---

## Work Summary

### 1. Flee Probability Model (IMPLEMENTED)

Per GDD §6.4, flee success scales inversely with threat:

- **Formula:** `fleeChance = 100 - (threatLevel * threatPenalty)`
- **Threat levels:** 0-5 (low to severe; scales per encounter size)
- **ThreatPenalty:** 15% per threat level (low threat = high escape chance)
- **Examples:**
  - Threat 0 (combat initiation): 100% flee success
  - Threat 2 (mid-encounter, moderate damage taken): ~70% success
  - Threat 5 (critical danger): ~25% success
- **RNG:** `Math.random() < fleeChance / 100` determines success

### 2. Flee Action Handler (IMPLEMENTED)

- **File:** `packages/server/src/game/CombatSystem.ts`
- **Method:** `CombatSystem.handleFleeAction(actor: Combatant): FleeResult`
- **Input:** Creature initiating flee (checks cooldown first)
- **Process:**
  1. Check flee cooldown (cannot flee within 3 ticks of last attempt)
  2. Calculate threat level from ThreatTable
  3. Roll flee probability
  4. On success: Remove creature from encounter, broadcast "X flees"
  5. On failure: Cost 1 action turn, broadcast "X attempts to flee but fails"
- **Cooldown tracking:** Map<creatureId, ticksUntilFleeReady> in CombatState
- **Cost:** Failed flee attempt burns action slot for that tick

### 3. Skill Check Integration (UPDATED)

- **Stat bonus:** Creature dexterity modifier +5% per point (stacks with threat reduction)
- **Status effects:** Rooted/paralyzed status forces flee to fail (GDD §5.3)
- **Group flee:** Only one creature per encounter can successfully flee per tick (prevents mass exodus)

### 4. Test Coverage (COMPREHENSIVE)

14 tests covering:

- **Probability calculation:** Threat-based formula produces correct range
- **Cooldown enforcement:** Cannot flee twice within 3-tick window
- **RNG validation:** Success/failure outcomes match probability bands
- **Multiple creatures:** Threat tracking per creature, individual flee outcomes
- **Status interactions:** Rooted creature cannot flee (fails immediately)
- **Group scenarios:** One creature flees, others remain in combat
- **Threat dynamics:** Fleeing creature removed from threat table (no counter-damage)
- **Border cases:** Threat 0 (instant success), threat 5+ (very low success rate)

### 5. Integration Points

- **EngineClient.tick()** — Process pending flee actions before damage resolution
- **ThreatTable** — Query active threats to calculate flee probability
- **ZoneRoom.broadcast()** — "X attempts to flee" / "X flees successfully" messages
- **CombatState.cooldowns** — Track per-creature flee cooldown remaining

## Architecture

```
Creature action: FleeAction → validateFleeAction()
                     ↓
          Check cooldown (3-tick window)
                     ↓
      Calculate threat from ThreatTable
                     ↓
        Roll probability (random < fleeChance%)
                     ↓
         [Success] → Remove from encounter, broadcast
         [Failure] → Burn action slot, broadcast "fails"
```

## Branch Collision Note

Initial attempt lost to working tree conflict with Volo/Jarlaxle concurrent development. Retry used strict branch isolation (`git worktree add`) to prevent checkout conflicts. All tests passing after retry.

## Status

PR #299 opened, all 14 tests pass, CI green. Ready for review by Elminster.
