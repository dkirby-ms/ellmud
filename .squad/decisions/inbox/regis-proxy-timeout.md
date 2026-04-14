# Decision: API and proxy timeout strategy

**Author:** Regis (Frontend)  
**Date:** 2025-07-14  
**Status:** Implemented

## Context
When the game server (`localhost:2567`) is down and the user refreshes the browser, `fetch()` calls through the Vite proxy hang indefinitely — the proxy waits forever for a backend that isn't there. The browser tab becomes unresponsive and must be force-closed.

## Decision
Added timeouts at two layers:

1. **Client-side fetch timeouts** — `validateToken()` uses a 5s AbortController timeout; the generic `request()` helper uses a 10s default. These ensure the browser never blocks indefinitely on any API call.

2. **Vite proxy timeouts** — Added both `timeout` (incoming socket) and `proxyTimeout` (outgoing proxy request) at 5s to every proxy entry. Confirmed that Vite's bundled `http-proxy` supports `proxyTimeout` for aborting the outgoing request when the backend is unreachable.

## Alternatives considered
- **`proxyTimeout` only**: Would only abort the outgoing connection but not the incoming socket. Using both covers edge cases where the proxy connects but the backend stalls.
- **Vite `configureServer` error hook**: Considered adding a custom error handler via `server.middlewares`, but the combination of client-side AbortController + proxy timeouts is sufficient and simpler.

## Impact
- No breaking changes — all existing tests pass (469/469).
- Users will see a fast error instead of an infinite hang when the server is restarting.
