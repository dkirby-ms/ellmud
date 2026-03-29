# Decision: Peaceful Dev Mode — Per-Player Creature Aggro Bypass

**By:** Jarlaxle (Systems Dev)
**Date:** 2025-07-25
**Requested by:** dkirby-ms

## What

Added a per-player `peaceful` flag that suppresses hostile creature aggro. Activated via `/peaceful` chat command, gated by `DEV_MODE_ENABLED` env var.

## Why

Developer needs to explore shards from a player's perspective without getting killed by hostile mobs. This is a dev tool, not a player feature.

## Impact

- **Config:** New `devModeEnabled` field in `ServerConfig` (env: `DEV_MODE_ENABLED`, default: false). Must be explicitly enabled on dev servers.
- **PlayerState:** New `peaceful: boolean` property. Does not affect serialization or DB schema — runtime-only flag.
- **ShardRoom:** Peaceful players filtered from `buildCreatureWorldState()` and guarded in `processCreatureAction()`.
- **Commands:** New `/peaceful` verb registered in parser and command index.
- **No production impact:** Feature is fully inert when `DEV_MODE_ENABLED` is not set.

## For Other Agents

- **Drizzt:** Parser now includes `peaceful` in `KNOWN_VERBS`. Command follows standard handler pattern.
- **Elminster:** New env var `DEV_MODE_ENABLED` — should be set to `true` in dev/UAT Docker Compose, omitted from production.
- **Minsc:** No UI changes needed. The `/peaceful` command works through the existing text input.
