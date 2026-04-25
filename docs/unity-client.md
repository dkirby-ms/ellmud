<!-- markdownlint-disable-file -->

# Unity Client Architecture

## Overview

The **Ellmud Unity Client** is a standalone, graphics-enabled 3D client for Windows, macOS, and Linux. It connects to the same WebSocket server as the web client and plays the same game — only the presentation layer differs.

**Key Principle:** Both the web (React) and Unity clients are **thin clients**. All game state, logic, and authority lives on the server. Clients are presentation layers only.

## Architecture

### Client-Server Connection

```
[Unity Client] ←→ WebSocket ←→ [Colyseus Server]
                  (Unified Protocol)
```

- **Protocol:** Colyseus RoomState updates over WebSocket
- **Connection:** The Unity client uses a compatible Colyseus C# SDK to connect to the same server
- **Authentication:** Shared OAuth/Entra login, or local username/password (dev)
- **Session State:** The server maintains single session per authenticated player, regardless of which client type connects

### Message Flow

1. **Client → Server:** Player commands (movement, attacks, ability usage, emotes)
   - Sent as discrete messages with validation on server
   - Server-side authority checks all requests before applying state changes

2. **Server → Client:** Room state updates and narration
   - Colyseus broadcasts delta updates (only changed state sent)
   - Narration prose is streamed from LLM or served from cache
   - Position, HP, status effects, ability cooldowns sent in structured state

3. **Real-Time Synchronization:** Colyseus handles clock synchronization and tick alignment
   - Server tick: 1 second (combat mode)
   - Client interpolates/extrapolates between ticks for smooth visuals

### Colyseus C# SDK

The Unity client uses **Colyseus-Unity3D** (or compatible C# binding):

```csharp
// Pseudo-code
using Colyseus;

var client = new Client("ws://localhost:2567");
var room = await client.JoinOrCreate<GameRoomState>("zone", roomOptions);

room.OnStateChange += (state) => {
    // Update UI with state changes
    UpdatePlayerHP(state.player.hp);
    UpdateCreatures(state.creatures);
};

room.Send("attack", new { targetId = "mob-42" });
```

### State Schema

The room state is serialized using Colyseus' `Schema` system, ensuring type safety and minimal bandwidth:

```typescript
// Server-side (TypeScript)
class GameRoomState extends Schema {
  @type.ref(Player)
  player: Player;
  
  @type.map(Creature)
  creatures = new MapSchema<Creature>();
  
  @type.map(Item)
  items = new MapSchema<Item>();
  
  @type.map(RoomFeature)
  features = new MapSchema<RoomFeature>();
  
  narration: string;
  isInCombat: boolean;
  // ... more state
}
```

The C# client automatically deserializes this schema into C# data structures.

## Graphics & Presentation

### Perspective

The Unity client supports **isometric or third-person** perspective:
- **Isometric:** Classic top-down tilted view (similar to Diablo/Torchlight)
- **Third-Person:** Camera follows the player from behind/above

Both perspectives render the same server state; only the camera and rendering change.

### Visual Features

- **Room Layout:** 3D models of room geometry based on room type (crypt, corridor, chamber, etc.)
- **Creatures:** Animated creature models with state-driven visuals (idle, alert, attacking, dead)
- **Players:** Character models representing other players, updated in real-time
- **Particles & VFX:** Combat effects (hit sparks, ability effects, status icons)
- **UI Overlay:** Minimap, inventory, ability bar, health/mana bars, target frame, group frames

### Environment

- **Lighting:** Dynamic lighting based on room light level and carried light sources
- **Atmosphere:** Weather, hazards, particle effects (rain, fog, collapsing stone, etc.)
- **Audio:** Ambient sounds, creature audio, combat SFX, UI feedback (optional)

## Feature Parity

### Full Parity with Web Client

The Unity client supports all gameplay features of the web client:

| Feature | Web Client | Unity Client | Notes |
|---------|-----------|-------------|-------|
| Character creation/selection | ✅ | ✅ | Same auth flow |
| Zone navigation | ✅ | ✅ | Directional movement |
| Real-time combat | ✅ | ✅ | Same tick loop |
| Abilities & hotkeys | ✅ | ✅ | Numpad (1-5) or configurable binds |
| Inventory & stash | ✅ | ✅ | 3D item preview (Unity only) |
| Social (say, emote, group) | ✅ | ✅ | Chat UI differs, protocol same |
| Hall of Fame | ✅ | ✅ | Leaderboard view |
| Admin (if authorized) | ✅ | ✅ | Web dashboard vs. in-game admin panel |

### Platform-Specific Features

| Feature | Web | Unity | Reason |
|---------|-----|-------|--------|
| 3D Graphics | — | ✅ | Native graphics rendering |
| Hotkey customization | Limited | ✅ | Input handling |
| Minimap | ✅ | ✅ (Enhanced) | 3D minimap vs 2D |
| VFX & Ambient Effects | Minimal | ✅ | CPU/GPU capability |
| Offline playback | — | — | Server-required (not planned) |
| Mods/Plugins | — | Planned | Community content loading |

## Development Roadmap

### Phase 1: Foundation (In Progress)
- [ ] Colyseus C# client integration
- [ ] Basic 3D scene setup (Unity engine)
- [ ] Room navigation (WASD movement)
- [ ] Real-time creature/player rendering
- [ ] Ability bar UI
- [ ] Combat HUD (HP, cooldowns, target)

### Phase 2: Polish
- [ ] Isometric/third-person camera system
- [ ] Creature animations (idle, alert, attack, death)
- [ ] Particle effects (combat, abilities)
- [ ] Audio system
- [ ] Minimap
- [ ] Full inventory/stash UI

### Phase 3: Advanced Features
- [ ] Customizable hotkeys & input binding
- [ ] Settings (graphics quality, sound volume, etc.)
- [ ] Streaming narration UI (LLM prose display)
- [ ] Group frames with enhanced visuals
- [ ] Admin panel (in-game tools for dev team)

### Phase 4: Community & Expansion
- [ ] Cross-platform build (Windows, macOS, Linux)
- [ ] Mod/plugin system (optional)
- [ ] Community content integration

## Deployment

### Build Targets

- **Windows:** x86-64 (Direct3D/Vulkan)
- **macOS:** Intel & Apple Silicon (Metal)
- **Linux:** x86-64 (Vulkan)

### Distribution

- **Standalone executable:** Download from official site or launcher
- **Steam:** Planned future integration
- **Web fallback:** Browser-based React client always available

### Version Alignment

- Unity client version must match server protocol version
- Semantic versioning: Major.Minor.Patch
  - **Major:** Protocol-breaking changes (backward incompatible)
  - **Minor:** New features (backward compatible)
  - **Patch:** Bug fixes
- Server enforces minimum client version on connection

## Networking & Performance

### Bandwidth Optimization

- **Delta updates:** Only changed state sent (Colyseus optimizes)
- **Interpolation:** Client interpolates creature position between ticks for smooth motion
- **Narration caching:** LLM prose cached on server; clients retrieve by hash
- **Compression:** WebSocket compression enabled (reduces bandwidth by ~60%)

### Latency Tolerance

- **Acceptable latency:** <200ms for responsive gameplay
- **Combat resilience:** Server tick loop is authoritative; client displays best-guess until server update arrives
- **Rollback/catchup:** Client state is corrected when server updates arrive (no visual pop, smooth correction)

## Security

### Client-Side Safety

- **No authority:** Client cannot modify game state, stats, inventory, or progression
- **Input validation:** All commands validated server-side before execution
- **Cheat prevention:** Ability cooldowns, stamina costs, movement speed all enforced on server
- **Telemetry:** Client sends position & ability uses; server validates against allowed values

### Authentication

- **OAuth/Entra:** Production authentication via Microsoft Entra External ID
- **Session tokens:** Secure session management (JWT or similar)
- **TLS/WSS:** WebSocket Secure (TLS) in production

## Glossary

| Term | Definition |
|------|------------|
| **Room** | Colyseus Room (zone instance) |
| **State** | Colyseus RoomState (authoritative game state) |
| **Schema** | Data structure definition for automatic serialization |
| **Delta Update** | Partial state update (only changed fields) |
| **Tick** | Server clock cycle (1 second during combat) |
| **Interpolation** | Client smoothing between server updates |

## See Also

- **[GDD.md](../../GDD.md)** — Full game design including combat, zones, economy
- **[docs/architecture.md](../architecture.md)** — Server architecture and systems
- **[docs/api-reference.md](../api-reference.md)** — Colyseus protocol and WebSocket API

