# Session Log — Sandbox Combat Arena Design

**Date:** 2026-04-07T1443Z  
**Duration:** Single session  
**Team:** Elminster (Lead), Jarlaxle (Systems Dev), Drizzt (Engine Dev), Laeral (Content Designer)

## Overview

Four-agent design sprint to establish architecture, mechanics, infrastructure, and content for a consequence-free combat testing facility in The Refuge zone.

## Key Outcomes

### Architecture (Elminster)
- Combat sandbox implemented as three feature rooms (not new zone or Colyseus type)
- Three RoomTypes: `feature_sandbox`, `feature_sandbox_arena`, `feature_sandbox_stats`
- Mandatory state isolation via `sandboxMode` flag on CommandContext
- Real CombatSystem instance with sandbox-controlled lifecycle and side-effects
- All commands dev-gated behind `getConfig().devModeEnabled`
- New SandboxService for creature spawning and stat overrides
- Phased delivery: Phase 1 (spawn/fight/reset/log), Phase 2 (stat tuning), Phase 3 (save/load/replay)

### Mechanics (Jarlaxle)
- Per-player CombatSystem instances for isolation (not flags on zone system)
- Sandbox creatures tagged with `sandbox: true` flag
- Player state snapshotted on entry, restored on reset/exit
- Independent sandbox tick timer (enables speed/pause/step)
- Sandbox creatures excluded from loot, XP, repop, corpse systems
- Real damage formula ensures sandbox reflects actual combat behavior

### Infrastructure (Drizzt)
- Feature room type (`feature_sandbox`) following existing patterns (stash, board, inn)
- Selective combat ticking in non-combat zones via `ZoneRoom.update()` guard
- On-demand creature spawning: new `CreatureManager.spawnCreatureInRoom()` method
- Double access gate: feature room + `devModeEnabled`
- No death penalty in sandbox via `sandboxRoomIds` bypass
- No new Colyseus room type; no new creature format

### Content (Laeral)
- 4-room facility: Proving Hall (entry), Test Arena (combat), Armory (equipment), Control Sanctum (planning)
- 15 test creatures across 5 archetypes (Tank, Ranged, Dodger, AoE, Swarm) and 4 tiers (T0-T3)
- All creatures prefixed `training_` with `sandbox: true` flag
- Test Arena marked `safe_container = true`; deaths consequence-free, respawn in-arena
- No preset encounters; designers improvise from roster
- Migration path: insert creature definitions and room/exit definitions in seed migrations

## Decisions Committed

All four agents created decision records now staged in `.squad/decisions/inbox/`:
- `elminster-sandbox.md` — Architecture decision
- `jarlaxle-sandbox.md` — Mechanics decision
- `drizzt-sandbox.md` — Infrastructure decision
- `laeral-sandbox-arena.md` — Content decision (marked READY FOR IMPLEMENTATION)

## Design Documentation

Four detailed design documents created:
- `docs/design/sandbox-combat-arena.md` (Elminster)
- `docs/design/sandbox-combat-mechanics.md` (Jarlaxle)
- `docs/design/sandbox-server-infrastructure.md` (Drizzt)
- `docs/design/sandbox-arena-content.md` (Laeral)

## Next Phase

Implementation requires:
1. Backend server changes (RoomType union sync, SandboxService, selective ticking, creature spawning)
2. Database migrations (15 creature definitions, 4 rooms, exits)
3. Test coverage (command dispatch, tick behavior, spawn/despawn)
4. Phase 2 design (stat tuning UI)
5. Phase 3 design (scenario save/load/replay)

## Interdependencies Noted

- Jarlaxle awaits Elminster's architecture review on per-player CombatSystem memory footprint
- Laeral awaits Drizzt confirmation on UI interaction details
- Regis (Frontend) to review verbose sandbox combat log styling needs
- Minsc (QA) to plan test coverage strategy
