# Review: PR #113 — Clear messages on room switch
**Reviewer:** Elminster
**Date:** 2025-07-23
**Verdict:** APPROVED

## Summary

`CLEAR_MESSAGES` action + reducer correctly resets the messages array on room transitions. Three dispatch sites cover all transition paths (shard→refuge via death/extraction, reconnection bailout→refuge, refuge→shard). No race conditions — clear runs synchronously before async `switchRoom()`. Tests are behavioral and verify both clearing and state preservation.

## Nits (non-blocking)

1. **Dead `addMessage` before `CLEAR_MESSAGES`** — In `useShardConnection.ts:205` and `Refuge.tsx:156`, "The world shifts around you..." is added then immediately wiped by the subsequent `CLEAR_MESSAGES`. Dead code; clean up in a follow-up.
2. **`soundCues` accumulation** — Same global accumulation pattern as messages. Decision doc correctly flags it. Consider a generalized `CLEAR_TRANSITION_STATE` action if more fields need clearing.
3. **Test improvement** — Add assertion that `soundCues` is NOT cleared by `CLEAR_MESSAGES` to document intentional scope boundary.
