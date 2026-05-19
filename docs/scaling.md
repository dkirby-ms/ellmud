# Scaling Configuration

## Phase 1 — Solo Play

Ellmud Phase 1 is a solo extraction experience. All scaling controls are locked
to single-player values to simplify development and deployment.

### Key Parameters

| Parameter | Env Var | Default | Phase 1 | Phase 2+ |
|---|---|---|---|---|
| Players per shard | `MAX_PLAYERS_PER_SHARD` | `1` | 1 (solo) | 2–4 (multiplayer) |
| Matchmaker mode | — | `in-process` | Colyseus built-in | Colyseus built-in |
| Redis presence | `REDIS_PRESENCE_ENABLED` | `false` | Wired, disabled | Enabled |
| Redis connection | `REDIS_CONNECTION_STRING` | `redis://localhost:6379` | Unused | Required |

### Architecture Notes

- **Matchmaker:** Colyseus runs matchmaking in-process by default. No separate
  matchmaker service is needed. The built-in `Server.define()` + `filterBy()`
  handles room creation and lookup.

- **Redis Presence:** The server config wires Redis presence settings but keeps
  them disabled by default. When Phase 2 enables multi-replica deployment,
  flip `REDIS_PRESENCE_ENABLED=true` and provide `REDIS_CONNECTION_STRING` to
  enable Colyseus `RedisPresence` for cross-replica room discovery.

- **Player Limit Enforcement:** `ShardRoom.onJoin()` checks the current player
  count against `maxPlayersPerShard`. If the shard is full, the join is rejected
  with a descriptive error. This guarantees no PvP encounters in Phase 1.

- **Shardboard:** With `maxPlayersPerShard=1`, the Shardboard shows only
  solo-entry shards (1 player slot each). No shared shards are possible.

### Transitioning to Phase 2

1. Set `MAX_PLAYERS_PER_SHARD=4` (or desired multiplayer cap)
2. Set `REDIS_PRESENCE_ENABLED=true` and provide `REDIS_CONNECTION_STRING`
3. Update Container Apps Bicep to `maxReplicas: N`
4. Deploy — Colyseus handles the rest via Redis-backed presence
