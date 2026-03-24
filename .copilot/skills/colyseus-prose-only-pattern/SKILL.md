---
name: "colyseus-prose-only-pattern"
description: "How to use Colyseus as a transport/lifecycle layer while suppressing Schema state sync to clients, delivering only narrated prose via messages"
domain: "architecture, networking, game-server"
confidence: "high"
source: "earned — architecture analysis of Colyseus vs GDD prose-only requirement"
---

## Context
When building a text-based game (MUD, IF, narrative RPG) on Colyseus, the default Schema state-sync model conflicts with the design goal of delivering only narrated prose to clients. This pattern resolves that tension.

## Patterns

1. **Dual-channel architecture:** Use Colyseus Schema for internal server-side state management (change tracking, snapshots, admin tools). Use `onMessage`/`client.send()` exclusively for player-facing output.

2. **Message protocol:** Define a small set of message types:
   - Client → Server: `"cmd"` (verb-noun player commands)
   - Server → Client: `"narrate"` (prose text), `"prompt"` (combat tick prompt), `"system"` (meta: timers, errors)

3. **Client SDK discipline:** The client either (a) uses the full Colyseus SDK but never subscribes to `state.onChange` callbacks, or (b) uses a minimal WebSocket wrapper that only handles messages and reconnection tokens.

4. **State leakage prevention:** Add integration tests that assert no Schema-patch-type messages reach the client. Wrap the Colyseus Room in a project-specific base class that enforces the message-only contract.

5. **Schema still valuable:** Keep Schema for server-side benefits — serialisation, change tracking, snapshot/restore, admin dashboards. Just don't expose it to gameplay clients.

## Examples

```typescript
// ShardRoom — message-only client protocol
export class ShardRoom extends Room<ShardState> {
  onCreate(options: any) {
    this.setState(new ShardState());
    this.setSimulationInterval(this.tick.bind(this), 1000);

    this.onMessage("cmd", (client, payload) => {
      const result = this.commandParser.parse(payload.input);
      this.executeAction(client, result);
    });
  }

  // All player output goes through narrate(), never through Schema sync
  private async narrate(client: Client, stateSnapshot: any) {
    const prose = await this.llmService.generate(stateSnapshot);
    client.send("narrate", { text: prose });
  }
}
```

## Anti-Patterns

- **Don't use `@view()` / StateView for gameplay filtering.** It still sends structured data to the client. Reserve it for admin/debug dashboards only.
- **Don't rely on Schema callbacks on the client for gameplay.** If the client subscribes to `onChange`, you've leaked state.
- **Don't broadcast Schema patches as a "summary."** Even filtered Schema data is structured — it violates the prose-only contract.
