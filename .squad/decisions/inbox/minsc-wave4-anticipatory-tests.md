# Decision: Wave 4 Anticipatory Test Architecture

**By:** Minsc (Tester)
**Date:** 2026-03-20
**Context:** Wave 4 — Stash Persistence (#11) + Room Graph Generation (#5)

## What

Wrote 47 anticipatory tests across two files:
- `wave4-stash-wiring.test.ts` (21 tests): Covers the extraction→stash transfer pipeline, weight enforcement edge cases, capacity upgrades, server restart durability, and refuge entry stash-load flow.
- `wave4-room-graph.test.ts` (26 tests): Covers multi-tier generation (T2/T3), biome-specific naming verification, hazard placement, graph adapter conversion, and multi-tier serialization/determinism.

## Why

Tests written proactively while Drizzt builds stash wiring and Jarlaxle completes room graph. This gives implementers a ready-made acceptance gate — when their code lands, these tests either pass or expose exact contract violations. The stash-transfer tests specifically validate the `transferInventoryToStash()` function that bridges shard gameplay and persistent storage — a critical integration seam.

## Impact

- Drizzt: Stash wiring PR should pass all 21 stash tests without modification. If `transferInventoryToStash` signature or `StashService` behavior changes, tests need updating.
- Jarlaxle: Room graph tests validate multi-tier generation and biome naming. If tier room count ranges change or new biomes are added, tests need updating.
- All: Total test count is now 949 server + 80 shared = 1029.
