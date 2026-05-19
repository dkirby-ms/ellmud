# Admin Guide

The admin dashboard is a comprehensive React application for managing game content, monitoring live state, and deploying updates. It runs alongside the game server.

## Quick Access

- **Admin Dashboard:** http://localhost:3000/admin (after running `npm run dev:client`)
- **Admin API:** http://localhost:2567/admin/api/* (protected by `ADMIN_TOKEN`)
- **Server Monitor:** http://localhost:2567/colyseus (built-in Colyseus dashboard)

## Authentication

### Admin Login

Admin accounts are managed in the `admin_users` table (PostgreSQL). To create an admin account:

1. Use the **User Management** section in the admin dashboard (admin-only)
2. Or insert directly into the database:
   ```sql
   INSERT INTO admin_users (username, password_hash, roles) 
   VALUES ('admin', bcrypt_hash('password'), '["content", "audit", "deploy"]');
   ```

Admin roles:
- **content:** Create, read, update, delete game entities (creatures, items, biomes, etc.)
- **audit:** View audit log and admin action history
- **deploy:** Promote changes to staging/production environments
- **users:** Manage admin users and permissions

### Protected Endpoints

All `/admin/api/*` endpoints require the `ADMIN_TOKEN` header:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:2567/admin/api/creatures
```

The token defaults to a random UUID at startup (logged to console). Override via `ADMIN_TOKEN` env var.

### Dashboard Features

- **Active Rooms** — View all ZoneRoom and StrongholdRoom instances
- **Room State** — Inspect Colyseus Schema state (player positions, creatures, loot, combat encounters)
- **Connected Clients** — See which clients are connected to which rooms
- **Server Metrics** — Uptime, memory usage, room count, active players

## Admin Dashboard Features

### Content Management (Phase 2+)

The admin dashboard provides full CRUD operations for 11 entity types:

| Entity | Management |
|--------|------------|
| **Creatures** | List, create, edit stats/behaviors/drops |
| **Items** | List, create, edit rarity tiers/weights/attributes |
| **Biomes** | List, create, edit zones/atmosphere/creature spawns |
| **Loot Tables** | List, create, edit drop rates and tier progression |
| **Zones** | List, create, edit zone definitions, room graphs, lifecycle |
| **Rooms** | List, create, edit room properties and exit connections |
| **Creatures (Spawning)** | Configure creature respawn rates and encounter balance |
| **Narrative Templates** | List, create, edit prose for game events and narration |
| **Factions** | List, create, edit faction definitions and progression |
| **Admin Users** | Manage admin accounts, roles, and permissions |
| **Audit Log** | View all administrative actions and content changes |

All changes are tracked in the **Audit Log** with full admin attribution.

### Audit Log (Phase 2.5)

Real-time log of all admin actions:
- **What:** Entity type, action (create/update/delete), changes
- **Who:** Admin username
- **When:** Timestamp
- **Why:** Change reason (optional note)

Filter by:
- Entity type
- Action (create, update, delete)
- Admin user
- Date range

Exports to CSV for compliance/record-keeping.

### Simulators (Phase 2.5)

#### Loot Drop Simulator
Test loot distribution logic:
1. Select a creature type
2. Simulate N drops (default 1000)
3. View distribution: item name, tier, drop percentage
4. Verify balance against design targets

#### Creature Stat Re-roll Simulator
Verify creature stat rolls:
1. Select a creature type
2. Simulate N rolls
3. View min/max/average for health, armor, damage
4. Adjust roll formulas and re-test

### Deploy Page (Phase 2.5)

Promote content changes to different environments:

1. **Preview Diff** — Show all pending changes (creatures, items, etc.) vs. production
2. **Deploy to Staging** — Push changes to staging environment for testing
3. **Promote to Production** — Live deploy to all players

Requires **deploy** role. Audit log records all deployments.

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
| `MAX_PLAYERS_PER_ZONE` | `100` | Maximum concurrent players in a single zone |
| `ZONE_RESPAWN_INTERVAL` | `300` | Creature respawn interval in ticks (5 minutes default) |
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

Access via `/admin/api/metrics` (SSE stream for real-time updates).

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
| Player stuck in zone | Creature encounter ongoing, cannot exit | Wait for combat to end or respawn |
| Loot not appearing | Creature not spawned or container respawn timer pending | Check creature spawn logs, verify loot table |
| Zone appears empty | Creatures not configured or respawn timer too long | Add creature spawns, check ZONE_RESPAWN_INTERVAL |

### Database Migrations (Phase 2+)

Migrations run automatically on server start when `DATABASE_URL` is set. Track applied migrations in the `_migrations` table:

```sql
SELECT * FROM _migrations ORDER BY applied_at;
```

Migration files in `packages/server/src/db/migrations/`:
- `001_create_players.sql` — Player accounts, identities, authentication
- `002_create_zones.sql` — Zone definitions, room graphs, encounter data
- `003_create_items.sql` — Item definitions, loot tables, gear progression
- `004_create_creatures.sql` — Creature types, spawning rules, AI behavior
- `005_create_player_stash.sql` — Player stash entries, inventory, gear tracking
- `006_create_audit_log.sql` — Admin action audit trail, content changes
- `007_create_admin_users.sql` — Admin accounts, roles, sessions

## Phase 3+ Planned Features

- Player analytics dashboard (session duration, favorite biomes, combat stats)
- Leaderboard and achievements
- Social features (friend lists, guilds, trading)
- PvP arena matchmaking
- Advanced loot table analysis
