# Design Proposal: OpenTelemetry-Style Gameplay Metrics — Issue #360

**Author:** Elminster (Lead/Architect)  
**Date:** 2026-04-09  
**Issue:** #360 — "we should keep otel style metrics of game events"  
**Status:** Proposal (awaiting team feedback)

---

## Executive Summary

Ellmud needs OpenTelemetry-style metrics tracking for game events to support:
1. **Designer balance tuning** — Creature difficulty, loot drop rates, zone progression curves
2. **Player-facing scoreboards** — Leaderboards (kills, deaths, extraction rate, survival time)
3. **Game balance analytics** — Event trends, PvP vs PvE patterns, encounter difficulty distribution
4. **Debugging & validation** — Verify server behavior, detect anomalies

This proposal recommends a **PostgreSQL events table with optional Prometheus export**, starting with v1 tracking combat, survival, and loot events. It is designed for a MUD (~100–1000 concurrent players) not a hyper-scale SaaS, keeping the implementation pragmatic.

---

## Architecture Recommendation

### Storage: PostgreSQL Events Table

**Rationale:** Ellmud already uses PostgreSQL, eliminating new infrastructure. Event rows are small (200–500 bytes), insertions are fast, and OLAP queries are straightforward.

**Table structure:**
```sql
CREATE TABLE gameplay_metrics (
  id              BIGSERIAL PRIMARY KEY,
  event_type      TEXT NOT NULL,              -- 'player_death', 'creature_kill', etc.
  player_id       UUID REFERENCES players(id), -- nullable for NPC events
  creature_type   TEXT,                        -- creature slug for kill/loot events
  zone_id         UUID REFERENCES zones(id),   -- nullable for non-zone events
  value           INTEGER DEFAULT 1,           -- event magnitude (damage, items, etc.)
  metadata        JSONB DEFAULT '{}',          -- flexible event data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT positive_value CHECK (value > 0)
);

CREATE INDEX idx_metrics_event_type ON gameplay_metrics(event_type);
CREATE INDEX idx_metrics_player_id ON gameplay_metrics(player_id, created_at DESC);
CREATE INDEX idx_metrics_zone_id ON gameplay_metrics(zone_id, created_at DESC);
CREATE INDEX idx_metrics_timestamp ON gameplay_metrics(created_at DESC);
```

**Why JSONB for metadata:**
- Event types vary widely (damage dealt has attacker/defender/damage type; loot has item_id/rarity; death has killer_ids)
- JSONB is GINdexable for ad-hoc analysis ("which events involved fire damage?")
- Follows established precedent in schema (loot_containers, creature_definitions use JSONB)

### Emission Pattern: EventCollector Service

Create a lightweight **EventCollector** service (`packages/server/src/metrics/EventCollector.ts`):

```typescript
class EventCollector {
  private queue: GameplayEvent[] = [];
  private batchSize: number = 50;
  private flushInterval: NodeJS.Timeout;

  emit(event: GameplayEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    try {
      await insertMetrics(batch);
    } catch (err) {
      console.error('[metrics] batch insert failed:', err);
      // Emit failed metrics to dead-letter queue (optional Phase 2)
    }
  }

  start(): void {
    this.flushInterval = setInterval(() => this.flush(), 5000); // Flush every 5s
  }

  async stop(): Promise<void> {
    clearInterval(this.flushInterval);
    await this.flush(); // Final flush on shutdown
  }
}
```

**Why this design:**
- **Batching** reduces database overhead (one INSERT per 50 events instead of one per event)
- **Async/non-blocking** prevents gameplay lag from metric collection
- **Optional Prometheus export** (Phase 2) can wrap the same in-memory queue

### Metrics Collection Approach

**Do NOT use OpenTelemetry SDK v1.0 directly** (yet). Reasons:
1. OTEL SDK is designed for microservices & high-volume instrumentation
2. Ellmud is a monolithic real-time game server, not a distributed system
3. OTEL exporter overhead (Jaeger, Honeycomb, Datadog) adds complexity we don't need yet
4. PostgreSQL directly satisfies our query needs today

**Phase 2 consideration:** If we later need Prometheus metrics (grafana dashboards), we can:
- Keep the EventCollector as-is
- Add a Prometheus exporter that reads the database and emits counters/histograms
- No code changes to event emission sites required

---

## V1 Metrics to Track

Proposed v1 scope: **12 core metrics** across combat, survival, and loot domains.

### Combat Events

| Event | Emitted By | Metadata | Use Case |
|-------|------------|----------|----------|
| `player_strike_dealt` | CombatSystem | `{damage, targetId, abilityId?, critical}` | Ability balance, DPS metrics |
| `player_damage_taken` | CombatSystem | `{damage, sourceName, sourceType}` | Difficulty tuning |
| `creature_kill` | CombatSystem | `{killerIds[], creatureType, loot}` | Creature balance, kill rates |
| `player_death` | CombatSystem | `{killerIds[], reason, equipmentLost}` | Death distribution, PvP vs PvE |
| `combat_encounter_started` | CombatSystem | `{encounterId, playerCount, creatureCount}` | Encounter frequency, group size |
| `combat_encounter_ended` | CombatSystem | `{duration, playerVictory, loot}` | Combat duration stats |

### Survival Events

| Event | Emitted By | Metadata | Use Case |
|-------|------------|----------|----------|
| `zone_entry` | ZoneRoom | `{zoneId, zoneName, playerId}` | Zone popularity, traffic |
| `zone_extraction_success` | ZoneRoom | `{zoneId, itemsExtracted, survivalTime}` | Extraction rate, success distribution |
| `zone_extraction_failure` | ZoneRoom | `{zoneId, reason, survivalTime}` | Death location heatmap |
| `room_visited` | ZoneRoom | `{zoneId, roomSlug, playerId}` | Room heat map, navigation patterns |

### Loot Events

| Event | Emitted By | Metadata | Use Case |
|-------|------------|----------|----------|
| `item_looted` | ZoneRoom | `{itemId, rarity, creatureType}` | Loot drop rates, item popularity |
| `item_lost_on_death` | ZoneRoom | `{itemId, recoveredBy?}` | Loot recovery rate, PvP looting |

**Total insertion rate (rough estimate):**
- 100 players × 5 kills/hour × 24 hours = **12K creature_kill events/day**
- 100 players × 1 death/hour × 24 hours = **2.4K player_death events/day**
- Total: ~20–30K events/day (easily within PostgreSQL capacity)

---

## Query & Display Strategy

### v1: Admin Dashboard (Prototype)

Add a new **Metrics** page to the admin UI (`/admin/metrics`):

1. **Event Feed** — Last 100 events, filterable by type & player
2. **KPI Summary** — Last 24h counters:
   - Total kills, deaths, extractions
   - Average combat duration
   - Most-farmed creature types
3. **Leaderboards** — 7-day and all-time:
   - Top 10 by kills
   - Top 10 by extraction count
   - Highest survival rate (min 5 runs)

**SQL queries (examples):**
```sql
-- Top killers (last 7 days)
SELECT player_id, COUNT(*) as kill_count
FROM gameplay_metrics
WHERE event_type = 'creature_kill' AND created_at > now() - interval '7 days'
GROUP BY player_id
ORDER BY kill_count DESC
LIMIT 10;

-- Average combat duration
SELECT AVG((metadata->>'duration')::int) as avg_duration_ticks
FROM gameplay_metrics
WHERE event_type = 'combat_encounter_ended' AND created_at > now() - interval '7 days';

-- Most-looted creatures
SELECT metadata->>'creatureType' as creature, COUNT(*) as loot_count
FROM gameplay_metrics
WHERE event_type = 'item_looted' AND created_at > now() - interval '7 days'
GROUP BY creature
ORDER BY loot_count DESC;
```

### v1+: Player-Facing Stats

**In the Refuge (future stronghold HUB):**
- Session summary: "You survived 28 minutes, looted 3 items, killed 5 creatures"
- Personal stats: "Lifetime: 47 kills, 8 deaths, 34% extraction rate"
- Weekly leaderboard: Fetchable via `/api/leaderboards?type=kills&period=7d`

### Phase 2: Game Balance Analysis

Once v1 is stable, create a **Designer Dashboard**:
- Creature kill rate heatmap by zone
- Loot distribution curves
- Player progression funnels (entry → progression → extraction)
- PvP kill rate vs creature kill rate

---

## Integration Points

### Where Events Are Emitted

1. **CombatSystem** (`packages/server/src/combat/CombatSystem.ts`)
   - On strike resolved: `emit('player_strike_dealt', { damage, targetId, critical })`
   - On damage taken: `emit('player_damage_taken', { damage, sourceName })`
   - On creature defeated: `emit('creature_kill', { killerIds, creatureType, loot })`
   - On player defeated: `emit('player_death', { killerIds, reason, equipmentLost })`
   - On encounter init: `emit('combat_encounter_started', { ... })`
   - On encounter end: `emit('combat_encounter_ended', { duration, playerVictory })`

2. **ZoneRoom** (`packages/server/src/rooms/ZoneRoom.ts`)
   - On player entry: `emit('zone_entry', { zoneId, playerId })`
   - On successful exit: `emit('zone_extraction_success', { zoneId, itemsExtracted, survivalTime })`
   - On death in zone: `emit('zone_extraction_failure', { zoneId, reason, survivalTime })`
   - On item pickup: `emit('item_looted', { itemId, creatureType })`
   - On room entry: `emit('room_visited', { roomSlug, playerId })`

3. **CreatureManager** (`packages/server/src/creatures/CreatureManager.ts`)
   - On loot drop: `emit('item_looted', { itemId, rarity })`

### Implementation Pattern

Pass `eventCollector` to system constructors via dependency injection:

```typescript
// CombatSystem constructor
constructor(
  resolveExits: ExitResolver,
  roll?: RollFn,
  eventCollector?: EventCollector
) {
  this.eventCollector = eventCollector;
}

// In combat resolution
if (this.eventCollector) {
  this.eventCollector.emit({
    event_type: 'creature_kill',
    player_id: killerIds[0],
    creature_type: creature.type,
    zone_id: encounter.zoneId,
    metadata: {
      killerIds,
      loot: droppedItems.map(i => i.id)
    }
  });
}
```

**Why optional injection:**
- Tests continue to work (no EventCollector required)
- Graceful no-op if EventCollector is null (safe for existing code)

---

## Team Split & Effort Estimate

### Phase 1: Core Infrastructure (3–4 days)

**Lead (Elminster):**
- Final design review & approval
- Stakeholder communication

**Systems Engineer (Jarlaxle):**
- Create EventCollector service & batching logic
- Add gameplay_metrics table migration
- Implement event emission in CombatSystem (main combat events)
- Create admin metrics page scaffold
- **Effort:** 2–3 days

**Engine (Drizzt):**
- Integrate EventCollector into CombatSystem class
- Add zone entry/extraction events to ZoneRoom
- Ensure no performance regression (benchmarking)
- **Effort:** 1–2 days

**Frontend (Regis):**
- Build admin Metrics page with event feed + KPI cards
- Add leaderboard UI component
- **Effort:** 1–2 days

**Tester (Minsc):**
- Validate metrics inserted correctly (spot-check DB)
- Test admin UI leaderboard rendering
- Verify no gameplay lag from metric collection
- **Effort:** 0.5–1 day

### Phase 2: Prometheus & Game Balance Tools (2–3 weeks, future)

- Prometheus exporter sidecar
- Grafana dashboard for balance team
- Historical trend analysis
- Player session analytics

---

## Risk Assessment & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Metric collection lag affects gameplay | High | Async batching, rate-limit inserts, benchmark before merge |
| Database disk bloat from metrics | Medium | Retention policy (rotate events > 90 days to archive), partition by week |
| Metrics are wrong/inconsistent | Medium | Unit tests for EventCollector, spot-check queries in admin UI |
| Privacy concerns (tracking player events) | Medium | Document in SECURITY.md that metrics don't include PII, only gameplay actions |
| Leaderboard data stale/inaccurate | Low | Cache leaderboards for 1h, accept 1h lag, invalidate on new top-10 entry |

**Retention Strategy:**
- Keep all events for 7 days (live analysis)
- Archive events > 7 days to `gameplay_metrics_archive` table
- Run VACUUM/ANALYZE on metrics table weekly to maintain index health

---

## Open Questions for the Team

1. **Player Privacy:** Should metrics include kill/death/loot data tied to player_id in a queryable table? Or anonymize after 7 days? Current proposal: tied to player_id (needed for leaderboards), but not exposed outside admin tools.

2. **Scoreboard Granularity:** Do we want:
   - Global leaderboards (all-time, 7-day, 24-hour)?
   - Faction leaderboards (separate per faction)?
   - Zone-specific leaderboards ("most creatures killed in Midgaard")?
   
   Current proposal: Global for v1, faction-based in Phase 2.

3. **Loot Tracking Detail:** Should we track:
   - Only rare loot (rarity >= 'uncommon')?
   - All loot?
   - Both, with separate metrics?
   
   Current proposal: All loot (helps identify drop rate bugs), filter in UI if needed.

4. **Combat Event Granularity:** Do we want per-strike metrics (volume) or summary metrics (1 event = encounter summary)?
   - Per-strike: High volume (~100 strikes per encounter), but captures DPS patterns
   - Summary: Low volume, but loses fine-grained balance data
   
   Current proposal: Per-strike for v1 (full visibility), summarization in Phase 2 if volume becomes a concern.

---

## Success Criteria

✅ **v1 Done when:**
- [ ] gameplay_metrics table migrated & indexed
- [ ] EventCollector service created with batching
- [ ] 6+ combat events emitted (strike, damage, kill, death, encounter start/end)
- [ ] 4+ survival events emitted (zone entry, extraction, room visit, item loot)
- [ ] Admin Metrics page displays event feed + KPI summary
- [ ] Leaderboard queries verified correct
- [ ] No measurable performance regression in combat ticks
- [ ] Tests pass; metrics data validated with spot-check

---

## Key Decisions

1. **PostgreSQL, not OpenTelemetry SDK** — Simpler, proven, no new infrastructure
2. **JSONB metadata** — Flexible for varied event shapes, GINdexable
3. **Async batching** — Non-blocking, prevents gameplay lag
4. **Optional dependency injection** — Backward compatible, testable
5. **Leaderboards in admin first** — Reduce scope, player-facing scoreboards in Phase 2
6. **Per-strike combat events** — Fine-grained data for balance tuning

---

## Implementation Checklist

- [ ] **Migration:** Add gameplay_metrics table (Jarlaxle)
- [ ] **Service:** EventCollector batching + flush logic (Jarlaxle)
- [ ] **CombatSystem:** Hook event emissions into strike/kill/death resolution (Drizzt + Jarlaxle)
- [ ] **ZoneRoom:** Hook zone entry/exit/loot events (Drizzt)
- [ ] **Admin UI:** Metrics page with feed, KPIs, leaderboards (Regis)
- [ ] **Testing:** Query validation, performance benchmarking (Minsc)
- [ ] **Docs:** Update CONTRIBUTING.md with metrics emission patterns (Elminster)

---

## References

- GDD.md §6 (Combat System) — event shapes
- issue #360 — "otel style metrics of game events"
- Established patterns: JSONB metadata (loot_containers, creature_definitions)
- Precedent: PostgreSQL as single source of truth for game state
