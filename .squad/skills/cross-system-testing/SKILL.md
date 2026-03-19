---
name: "cross-system-testing"
description: "How to test interactions between Ellmud game systems (combat, extraction, movement, narration) without booting a full Colyseus server"
domain: "testing"
confidence: "high"
source: "earned: Phase 1 QA pass (Issue #19)"
---

## Context
Ellmud's game loop (ShardRoom.update()) orchestrates combat, extraction, movement, and narration on every tick. Testing cross-system interactions through Colyseus integration is slow (~48s for 8 lifecycle tests). Unit-level cross-system tests run in <1s.

## Patterns

### 1. Instantiate systems directly
```typescript
const combat = new CombatSystem(exitResolver);
const extraction = new ExtractionSystem(5);
```
No need for a Colyseus server — these are pure classes.

### 2. Simulate the tick loop
Replicate what `ShardRoom.update()` does:
```typescript
const tickResult = combat.resolveTick();
for (const event of tickResult.events) {
  if (event.type === 'strike' && event.targetId) {
    if (extraction.isExtracting(event.targetId)) {
      extraction.interruptExtraction(event.targetId, 'struck');
    }
  }
}
```

### 3. Use handleCommand() for command-level integration
```typescript
const ctx = buildContext(player, room, args, {
  combatSystem: combat,
  extractionSystem: extraction,
});
const result = handleCommand('strike', ctx);
```

### 4. Test helpers pattern
```typescript
function buildContext(player, room, args, overrides = {}) {
  const graph = createTestRoomGraph();
  return { player, room, args, resolveRoom: ..., stability: 0.8, ...overrides };
}
```

## Examples
- `packages/server/src/__tests__/cross-system-integration.test.ts` — 38 tests, <1s
- Combat+extraction interrupt: register combatants, start extraction, resolve tick, check interruption
- Command lock: start extraction, try combat commands, verify blocked

## Anti-Patterns
- **Don't boot Colyseus for unit-testable logic.** Save integration tests for protocol-level behavior.
- **Don't mock the systems you're testing.** Use real CombatSystem/ExtractionSystem instances.
- **Don't rely on timing.** Cross-system tests should be deterministic — no `wait()` calls needed.
