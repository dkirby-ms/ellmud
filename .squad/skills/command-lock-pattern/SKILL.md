# Skill: Command Lock Pattern

## Pattern
When a game state should prevent certain commands, add a pre-dispatch check in `handleCommand()` (commands/index.ts). Checks run **before** the handler registry lookup, returning early with a narration message.

## Order of Checks
1. Extraction lock (channeling blocks movement + combat)
2. Combat lock (active combat blocks `go` — must use `flee`)
3. Handler dispatch

## Implementation
```typescript
// In handleCommand():
if (verb === 'go' && ctx.combatSystem?.isInCombat(ctx.player.sessionId)) {
  return {
    narrations: [{ text: "You're in combat! Use 'flee' to escape first.", type: 'system' }],
  };
}
```

## Rules
- Each lock is a simple condition → message pair
- Use optional chaining (`ctx.system?.method()`) for contexts where the system may not be present
- Free actions (look, inventory) should never be blocked
- Combat actions (strike, dodge, flee) must remain available during combat
- The extraction lock pattern (ExtractionSystem.checkCommandLock) is the canonical reference

## Key Files
- `packages/server/src/commands/index.ts` — handleCommand() dispatch
- `packages/server/src/extraction/ExtractionSystem.ts` — checkCommandLock() reference
- `packages/server/src/__tests__/combat-movement-lock.test.ts` — test pattern

## Testing
Build a CommandContext with the relevant system injected, call handleCommand(), and assert on narration text + type. Test both blocked and allowed commands.
