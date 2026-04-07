# Session Log: 2026-03-25T15:50Z — Identity Handoff Bug Fix

**Teams:** Drizzt (Engine Dev), Minsc (Tester), Scribe (Documentation)

## Problem

Player persistence was broken because ShardRoom and RefugeRoom read `options['playerId']` instead of `client.auth.playerId`. In production, clients send `{ token }` (never playerId), causing fallback to `client.sessionId` (nanoid, not UUID). All player_skills FK writes failed silently.

## Solution

- **Drizzt:** Fixed both rooms to read `client.auth.playerId → options['playerId'] → client.sessionId` with 'anonymous' exclusion
- **Minsc:** Created 11-test integration suite verifying the auth-to-join pipeline
- **Result:** 1659 tests pass, identity handoff covered end-to-end

## Decision Filed

`.squad/decisions/decisions.md` now includes canonical pattern for identity resolution in all rooms.

**Branch:** fix/player-identity-handoff (ready to merge)
