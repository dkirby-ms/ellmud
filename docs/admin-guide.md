# Admin Guide

## Colyseus Monitor Dashboard

The admin dashboard is available at:

```
http://localhost:2567/colyseus
```

This is the built-in [Colyseus Monitor](https://docs.colyseus.io/tools/monitor/) providing real-time visibility into server state.

### Dashboard Features

- **Active Rooms** — View all ShardRoom and RefugeRoom instances
- **Room State** — Inspect Colyseus Schema state (player positions, shard lifecycle, combat encounters)
- **Connected Clients** — See which clients are connected to which rooms
- **Server Metrics** — Uptime, memory usage, room count

> **Note:** The monitor uses Colyseus Schema state sync internally. This is the *only* consumer of Schema sync — game clients receive narrated prose only.

### Room Types Visible

| Room | Identifier | Schema State Includes |
|------|-----------|----------------------|
| `ShardRoom` | `shard` | Shard lifecycle, collapse timer, stability, player count, room graph |
| `RefugeRoom` | `refuge` | Connected players, stash metadata |

## Health Check

```bash
curl http://localhost:2567/health
```

```json
{
  "status": "ok",
  "uptime": 1234.56,
  "timestamp": 1710000000000
}
```

Use this endpoint for load balancer liveness probes and monitoring.

## Server Configuration

All configuration is via environment variables. See [Setup Guide](setup.md) for the full list.

Key admin-relevant settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_REQUIRED` | `false` | Set to `true` to require authentication |
| `MAX_PLAYERS_PER_SHARD` | `1` | Increase for multiplayer (Phase 2) |
| `REDIS_PRESENCE_ENABLED` | `false` | Enable for multi-replica scaling |
| `LOG_LEVEL` | `info` | Set to `debug` for verbose logging |

## Debugging Tools

### Server Logs

The server logs key events to stdout:

```
[Ellmud] Colyseus server listening on ws://localhost:2567
[Ellmud] Admin monitor at http://localhost:2567/colyseus
[Ellmud] Auth required: false
[Ellmud] Max players/shard: 1, Matchmaker: in-process, Redis: disabled
```

Set `LOG_LEVEL=debug` for verbose output including command parsing, combat ticks, and narration pipeline decisions.

### Narration Telemetry

The narration service tracks performance counters in-memory:

- **Cache hit ratio** — Percentage of narrations served from cache
- **LLM latency** — Average response time from Azure AI Foundry
- **Timeout rate** — How often the LLM exceeds its budget
- **Fallback rate** — How often templates fire instead of LLM prose

Access via code or future admin API (Phase 2).

### Combat Debugging

Combat encounters are deterministic. Given the same initial state and actions, the same outcome will always occur. To debug:

1. Check encounter ID in combat_result messages
2. Trace combatant actions per tick
3. Verify damage formula: `max(1, floor(rawDamage × stanceMultiplier - armour))`
4. Default action is `dodge` if no input received

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Unknown command" errors | Unrecognized verb | Check `parser.ts` for known verbs |
| Narration returns template text | No Azure credentials or LLM timeout | Set `AZURE_*` env vars, check connectivity |
| Auth token rejected | Token expired (24h TTL) or server restarted | Re-login; in-memory tokens don't survive restarts |
| Player can't join shard | `MAX_PLAYERS_PER_SHARD=1` and shard occupied | Increase limit or wait for shard to collapse |
| Extraction fails | Player not in extraction-type room | Check room type via monitor dashboard |

### Database Migrations (Phase 2)

Migrations run automatically on server start when `DATABASE_URL` is set. Track applied migrations in the `_migrations` table:

```sql
SELECT * FROM _migrations ORDER BY applied_at;
```

Migration files in `packages/server/src/db/migrations/`:
- `001_create_players.sql`
- `002_create_items.sql`
- `003_create_skills.sql`
- `004_create_factions.sql`
- `005_create_run_history.sql`

## Phase 2 Admin Features (Planned)

- `GET /admin/stashes` — Dump all player stashes
- `GET /admin/players` — List all registered players
- `GET /admin/shards/:id` — Inspect active shard state
- `POST /admin/spawn-creature` — Manually spawn creatures
- Narration telemetry dashboard
- Player ban/mute controls
