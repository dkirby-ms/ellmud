# Session Log: Matchmaking 404 Fix

**Timestamp:** 2026-03-20T12:03:00Z  
**Agent:** Drizzt  
**Duration:** ~45 minutes  

## Summary

Fixed POST `/matchmake/joinOrCreate/refuge` 404 by ensuring `Server.listen()` is called to register Colyseus routes. Changed `packages/server/src/index.ts` to use `http.createServer(app)` + `new Server({ transport })` + `server.listen()` pattern instead of pre-listening the app.

## Outcome

✅ Tests: 628 pass  
✅ Docker: builds  
✅ UAT: merged  

## Pattern Established

**For all server initialization:** Never call `app.listen()` and pass the result to Colyseus transport. Always use `Server.listen()` to trigger route registration.

