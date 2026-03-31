# Decision: Keep `shardboard` as command alias for `board`

**Author:** Regis  
**Date:** 2025-07-14  
**Context:** Issue #231 renamed the Shardboard to Expedition Board.

## Decision

The primary command verb is now `board`. The old `shardboard` verb is kept as a legacy alias in both the parser (KNOWN_VERBS) and the feature handler registry. This means players who type `shardboard` will still get the expedition board behavior.

## Rationale

- Zero-friction migration: existing muscle memory and any docs referencing `shardboard` still work
- The alias points to `handleBoard` with `feature_expedition_board` room gating — identical behavior
- Can be removed in a future cleanup pass if desired
