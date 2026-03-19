# Architecture Overview

Ellmud is a PvPvE extraction RPG built as a real-time MUD. This document describes the system architecture, component boundaries, and data flow.

## Design Principle

> **The LLM describes; the server decides.**

All game state is server-authoritative and deterministic. The LLM is a narrative lens — it receives structured state snapshots and returns prose. It never modifies game state, spawns items, or resolves mechanics.

## High-Level Architecture

```
┌─────────────────┐
│  Web Terminal    │  @colyseus/sdk (message-only, no Schema sync)
│  (Browser)       │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────────────────────────────────────────┐
│  Azure Container Apps                                │
│  ┌───────────────────────────────────────────────┐  │
│  │  Colyseus 0.17.x  (Express + WebSocket)       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  │  │
│  │  │ShardRoom │  │RefugeRoom│  │ Matchmaker │  │  │
│  │  │(per shard│  │(persistent│  │ (built-in) │  │  │
│  │  │ 20-40min)│  │  hub)    │  │            │  │  │
│  │  └──────────┘  └──────────┘  └────────────┘  │  │
│  │       │              │                        │  │
│  │  ┌────┴──────────────┴────────────────────┐   │  │
│  │  │  Game Systems                           │   │  │
│  │  │  Combat · Extraction · Creatures · Items│   │  │
│  │  │  Stash · Commands · Auth · Narrative    │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
│         │              │              │              │
│    ┌────┴───┐    ┌─────┴────┐   ┌────┴──────┐      │
│    │ Redis  │    │PostgreSQL│   │Azure AI   │      │
│    │(cache +│    │(player   │   │Foundry    │      │
│    │presence│    │ persist) │   │(GPT-4o-   │      │
│    │)       │    │          │   │ mini)     │      │
│    └────────┘    └──────────┘   └───────────┘      │
└─────────────────────────────────────────────────────┘
         │
    ┌────┴──────────┐
    │ Application   │
    │ Insights      │
    └───────────────┘
```

## Component Map

### Rooms (Colyseus)

| Room | Purpose | Lifetime | Tick |
|------|---------|----------|------|
| `ShardRoom` | Exploration, combat, extraction | 20-40 min (shard lifecycle) | 1s |
| `RefugeRoom` | Persistent hub, stash, loadout | Permanent | 1s |

**ShardRoom lifecycle:** `seeding` → `open` → `active` → `destabilising` → `collapse`

- Seeding: generates room graph, spawns creatures, places loot
- Open: entry points activate, players may join
- Active: full exploration, combat, extraction
- Destabilising: final 25% — hazards intensify
- Collapse: shard destroyed, remaining items lost

**RefugeRoom:** Safe zone. Stash management, shardboard access, no combat.

### Game Systems

| System | Location | Responsibility |
|--------|----------|---------------|
| Commands | `commands/parser.ts` | Parse text input into `{verb, args}` |
| Combat | `combat/` | Tick-based simultaneous resolution |
| Extraction | `extraction/` | Multi-tick channeled escape |
| Creatures | `creatures/` | AI behavior trees, spawning, loot |
| Items | `items/registry.ts` | Item definitions, stats, durability |
| Stash | `stash/` | Persistent inventory (per player) |
| Narrative | `narrative/` | LLM → cache → template pipeline |
| Auth | `auth/` | Username/password, JWT-like tokens |

### External Services

| Service | Purpose | Phase 1 Implementation |
|---------|---------|----------------------|
| PostgreSQL | Player persistence, stash | Schema defined, in-memory repos for Phase 1 |
| Redis | Narration cache + Colyseus presence | Wired but disabled in Phase 1; in-memory cache |
| Azure AI Foundry | GPT-4o-mini narration | Optional; template fallback when unavailable |
| Application Insights | Observability | Free tier, 5 GB/month |

## Data Flow

### Command Processing

```
Client                    Server
  │                         │
  │  cmd: {verb, args}      │
  ├────────────────────────►│
  │                         ├── parseCommand(raw)
  │                         ├── validate + build CommandContext
  │                         ├── execute handler
  │                         ├── (optional) narrate via NarrationService
  │                         │
  │  narrate: {text, type}  │
  │◄────────────────────────┤
  │  room_header: {name,    │
  │    exits, stability}    │
  │◄────────────────────────┤
```

### Combat Tick

```
Every 1s during combat:
  1. Collect queued actions (default: dodge)
  2. Calculate damage (simultaneous, from start-of-tick HP)
  3. Apply damage atomically
  4. Resolve flee attempts
  5. Check defeat / timeout conditions
  6. Generate narration events
  7. Broadcast combat_result to participants
```

### Narration Pipeline

```
CommandResult
    │
    ▼
NarrationService.narrate(context)
    │
    ├─ 1. Hash state (SHA-256 of canonical context)
    ├─ 2. Cache lookup
    │     ├─ HIT → return cached prose
    │     └─ MISS ↓
    ├─ 3. Race: LLM call vs timeout
    │     ├─ LLM wins + valid → cache + return
    │     ├─ Timeout → return template, fire background LLM
    │     └─ LLM rejected → return template
    └─ 4. Background enrichment (cache warm for next request)
```

## Client Protocol

The client is a prose-only terminal. **No Colyseus Schema state is ever synced to clients.** This is a critical architectural constraint (GDD §14).

| Direction | Message Key | Payload |
|-----------|------------|---------|
| Client → Server | `cmd` | `{ verb: string, args: string[] }` |
| Server → Client | `narrate` | `{ text: string, type: NarrationType, timestamp: number }` |
| Server → Client | `room_header` | `{ roomName: string, exits: string[], stability: number }` |
| Server → Client | `shard_state` | `{ state: ShardState, collapseTimer?: number }` |
| Server → Client | `combat_result` | `{ tick, encounterId, results[], combatEnded }` |
| Server → Client | `extraction_state` | `{ playerId, state, ticksRemaining?, narration, timestamp }` |
| Server → Client | `stash_update` | Stash contents update |

## Security Model

- **Server-authoritative:** Client never decides outcomes
- **Input validation:** Commands parsed to fixed verb set; unknown verbs rejected
- **Prompt injection defence:** Player input never concatenated into LLM prompts as raw text. Free-text (`say`, `emote`) placed in delimited untrusted fields
- **No state leakage:** Client receives narrated prose only, not structured game state
- **Seeded PRNG:** All outcomes deterministic and replayable

## Scaling (Phase 2+)

- Redis presence tracks which Colyseus process owns which room
- KEDA auto-scaling on Container Apps with WebSocket sticky sessions
- Separate matchmaker via `isStandaloneMatchMaker` for horizontal scale
- Scale-to-zero when no players are online ($0 compute)
