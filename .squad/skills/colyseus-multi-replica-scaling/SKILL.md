---
name: "colyseus-multi-replica-scaling"
description: "Production checklist for Colyseus rooms on Azure Container Apps"
domain: "infrastructure"
confidence: "high"
source: "earned: ACA seat-reservation expiry fix (2026-05-19T15:02:22.910+00:00)"
---

## Context
Colyseus multi-replica deployments fail in a specific way when matchmake HTTP traffic and the follow-up WebSocket handshake do not reach the same replica: clients see `seat reservation expired` even though the room exists.

## Pattern: Cluster-Safe Colyseus on ACA

1. Use **RedisPresence** for shared presence state.
2. Use **RedisDriver** for cross-replica matchmaker coordination.
3. Enable ACA ingress **sticky sessions**:

```bicep
ingress: {
  external: true
  targetPort: 2567
  transport: 'http'
  stickySessions: {
    affinity: 'sticky'
  }
}
```

4. Keep a **local fallback** for dev/test when Redis is disabled or unreachable.
5. Log the **actual runtime backend** (Redis vs local), not only the env toggle.

## Character-ID Safety Pattern
When room persistence spans both `players.id` and `characters.id`:
- Key runtime player state to `characters.id`
- Preserve the owning `players.id` separately for account-scoped tables
- If the client omits `characterId`, resolve the active character server-side before loading/saving character-scoped tables like `player_skills`

## Anti-Patterns
- ❌ Redis matchmaker without sticky ingress
- ❌ Keying room runtime state to `players.id` when persistence tables are character-scoped
- ❌ Logging "Redis enabled" when the runtime actually fell back to local presence/driver

## Reference Files
- `packages/server/src/index.ts`
- `packages/server/src/rooms/ZoneRoom.ts`
- `infra/modules/container-apps.bicep`
