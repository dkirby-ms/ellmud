# Skill: Tick-Based Game System Pattern

## Pattern
Game systems in Ellmud follow this pattern:
1. Create a class with internal state (Map-based storage)
2. Expose `tick(deltaMs)` for per-tick updates
3. ShardRoom instantiates the system in `onCreate()`
4. ShardRoom calls `system.tick()` in its `update()` method
5. Event-driven trace generation happens in command handlers and combat result delivery

## Key Files
- System implementation: `packages/server/src/systems/{Name}.ts`
- Barrel export: `packages/server/src/systems/index.ts`
- Integration: `packages/server/src/rooms/ShardRoom.ts` (update loop)
- Types: `packages/shared/src/index.ts`

## Example
```typescript
// In ShardRoom.onCreate():
this.traceSystem = new TraceSystem();

// In ShardRoom.update():
this.traceSystem.tick(TICK_INTERVAL_MS);

// In command handling / combat delivery:
this.traceSystem.addTrace(roomId, 'footprint', metadata, direction);
```

## Testing
- Use `vi.useFakeTimers()` + `vi.advanceTimersByTime()` for TTL testing
- Direct system instantiation (no mocks needed)
- Factory helpers for clean setup
