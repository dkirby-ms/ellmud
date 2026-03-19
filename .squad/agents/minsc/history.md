# Minsc — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Learnings

- **Colyseus testing port conflicts:** `@colyseus/testing` boots a real server on port 2568. Multiple test files with `bootTestServer()` cause `EADDRINUSE` if files run in parallel. Fixed with `fileParallelism: false` in vitest config.
- **Colyseus simulation clock is imprecise in tests:** 1-second tick intervals don't fire at exactly 1s under load. For tests that depend on timer expiration (collapse lifecycle), use polling (`waitUntil`) instead of fixed `wait()` calls.
- **Room auto-dispose on empty:** Colyseus rooms auto-dispose when the last client leaves. Edge-case tests for rapid join/leave must keep an anchor client connected.
- **`@colyseus/sdk` is a peer dependency of `@colyseus/testing`:** Not declared explicitly — must be added to server devDependencies for tests to run.
- **Test structure:** File-level `beforeAll`/`afterAll` for the Colyseus server, with multiple `describe` blocks sharing one server instance. This avoids port conflicts within a file.
- **Test counts (Issue #19):** 42 server tests (6 files), 19 shared tests (1 file), 0 client tests (skeleton config). 61 total passing tests.
