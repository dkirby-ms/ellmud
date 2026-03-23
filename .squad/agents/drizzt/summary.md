# Drizzt — Engine Dev Summary

**Period:** 2026-03-19 to 2026-03-23  
**Role:** Engine subsystems, game logic implementation  
**Status:** Wave 2 complete

---

## Major Features Shipped

### 1. Sound Propagation System (PR #115–#118)
- Per-room BFS sound spread algorithm
- Noise constants + room modifiers
- Audibility formula: `baseNoise + modifiers - distance`
- 33 unit tests passing
- **Files:** SoundSystem.ts, ShardRoom wiring, room properties

### 2. Trace System Integration (PR #115–#118)
- Ephemeral traces (footprints, blood, corpses)
- TTL decay + eviction strategy (expired first, then oldest active)
- Per-room trace cap (50 max)
- 34 unit tests passing
- **Files:** TraceSystem.ts, ShardRoom.tick() integration

### 3. Awareness & Stealth Detection (PR #119)
- Detection formula: `awareness - stealth` → tiers (none/vague/full)
- Equipment-based narration (never player names)
- 75 unit tests passing
- Anticipated 208 additional tests pending skill system
- **Files:** AwarenessSystem.ts, ShardRoom.runAwarenessChecks()

---

## Bug Fixes

### 1. WebSocket Reconnection Tuning (PR #108)
- 30–60s disconnect grace period
- Disconnected players auto-dodge in combat
- `disconnected` flag on PlayerState

### 2. Player Death Handler (PR #109)
- Fixed stuck-player bug (defeat events not processed)
- Inventory drops to room floor
- EXTRACTION_STATE → death screen → room switch to refuge

### 3. Message Overflow on Death Return (PR #113)
- Messages now cleared on ROOM_SWITCH
- Prevents shard history from bleeding into refuge

---

## Patterns Established

| Pattern | Description | Applies To |
|---------|-------------|-----------|
| Pure Logic Classes | AwarenessSystem, SoundSystem, TraceSystem have no Colyseus coupling | All Phase 2 systems |
| ShardRoom Wiring | Systems read PlayerState, pass data as params | Future systems |
| Skill System Ready | Systems use skill lookups (currently 0, ready for skill_table integration) | Combat, Tracking, etc. |

---

## Test Coverage

- **Wave 2 Tests:** 142 total (Sound 33 + Trace 34 + Awareness 75)
- **Anticipatory Scaffolds:** 208 additional tests defined, 53 passing (formulas)
- **Total Passing:** 1084+
- **Regressions:** Zero

---

## Phase 2 Readiness

Multi-Player Shards (#21) and PvP Combat (#24) backlog ready. Same architecture pattern (pure logic + ShardRoom wiring) will apply to all Phase 2 systems.

---

**→ See [full history](./history.md) for detailed session logs and implementation notes.**
