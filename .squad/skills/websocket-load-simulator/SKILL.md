# Skill: WebSocket Load Simulator Pattern

## Context
Use this pattern when a Node.js service needs demo or autoscaling pressure without external tooling.

## Pattern
1. Parse a single env var into disabled/default/exact-target modes.
2. Start only after the HTTP/WebSocket server is listening.
3. Open real loopback WebSocket clients with `ws` instead of spoofing counters.
4. Ramp gradually (Ellmud uses 5 connections per second).
5. Send periodic ping frames so synthetic sockets stay alive.
6. Expose authenticated admin endpoints for start/stop/status.
7. Register shutdown handlers so fake clients are always cleaned up.

## Key Files
- `packages/server/src/load-simulator/index.ts`
- `packages/server/src/index.ts`
- `packages/server/src/config.ts`

## Testing
- Inject a mock socket factory.
- Use fake timers for ramp and ping assertions.
- Cover env parsing, admin auth, retry behavior, and shutdown cleanup.
