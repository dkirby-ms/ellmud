# Skill: BFS Room Graph Propagation

**Author:** Jarlaxle  
**Created:** 2025-07-26  
**Used in:** Sound System (#22)

## Pattern

When a game effect needs to propagate through the room graph (sound, gas, light, tremors), use BFS from a source room with per-hop attenuation.

## Implementation

```typescript
// 1. Accept a RoomResolver callback — don't couple to Colyseus
type RoomResolver = (roomId: string) => { id: string; exits: Map<Direction, string>; properties?: string[] } | undefined;

// 2. BFS with visited map tracking best noise per room
const visited = new Map<string, number>();  // roomId → best noise
const parent = new Map<string, string>();   // roomId → BFS parent (for direction)

// 3. Per-hop: calculate attenuation, apply room modifiers, check > 0
let attenuation = BASE_ATTENUATION;
if (room.properties?.includes('cavern')) attenuation -= 1;
let noise = currentNoise - attenuation;
if (room.properties?.includes('heavy_door')) noise *= 0.5;

// 4. Direction: listener's exit that leads to BFS parent = sound direction
```

## Key Decisions

- **Room-level properties, not exit-level.** Simpler to model and test. A `heavy_door` room halves all incoming sound regardless of entry direction.
- **Separate distance BFS** for actual hop count. The propagation BFS tracks noise (which may differ from hop count due to modifiers), so distance requires a clean second BFS.
- **Round to 1 decimal** to avoid floating-point display issues after modifiers.

## Reuse Cases

- **Gas/poison propagation:** Same BFS, different attenuation rate. Add `sealed_door` modifier.
- **Light propagation:** Darkness shard modifier could reduce light range. Same graph traversal.
- **Tremor/earthquake effects:** Propagate from boss room outward with distance-based intensity.
