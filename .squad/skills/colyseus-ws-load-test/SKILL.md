---
name: "colyseus-ws-load-test"
description: "Build high-fanout load tests by swapping browser automation for raw HTTP auth plus direct Colyseus room joins."
domain: "testing"
confidence: "high"
source: "earned"
---

## Context
Use this when the goal is to measure connection scale, room join behavior, or sustained command traffic without spending memory on full browser instances.

## Patterns
- Bootstrap each synthetic user with the real HTTP APIs first: register/login, list/create/select character, then resolve `/api/spawn-zone`.
- Join the returned `zone:<slug>` room with the Colyseus JS SDK using `{ token, characterId }` so the harness follows the same authoritative path as the client.
- Recreate gameplay pressure with protocol-native `MessageTypes.COMMAND` payloads instead of DOM input events.
- Preserve one CLI `--url` by trying same-origin websocket resolution first for deployed stacks and `:2567` as a dev fallback for local browser/server split setups.
- Ramp new users asynchronously; do not block the next spawn batch on previous join completion, or the harness will visually stall on slow joins.

## Examples
- `packages/e2e/src/load-test-ws.ts`
- `packages/server/src/api/spawn-zone.ts`
- `packages/client/src/services/connection.ts`

## Anti-Patterns
- Using Playwright or Chromium when the test only needs authenticated websocket sessions.
- Hard-coding a zone room name instead of resolving the selected character's spawn target.
- Sending freeform websocket payloads that bypass the shared message schema.
