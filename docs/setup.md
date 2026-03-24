# Local Development Setup

## Prerequisites

- **Node.js** ≥ 20.0.0 (see `.nvmrc` — currently pinned to 20)
- **npm** (comes with Node.js)
- **Docker** and **Docker Compose** (for PostgreSQL, Redis)
- **PostgreSQL** (via Docker, or local installation)
- **Redis** (via Docker, or local installation)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/dkirby-ms/ellmud.git
cd ellmud

# Use the correct Node.js version
nvm use  # reads .nvmrc

# Install all dependencies (workspaces)
npm install

# Start PostgreSQL and Redis services (Phase 2+; skip for in-memory Phase 1)
docker compose up -d

# Build all packages (shared must build first)
npm run build

# Start the server (watch mode)
npm run dev:server

# In another terminal, start the client (watch mode)
npm run dev:client
```

**Access Points:**
- **Game Client & Admin Dashboard:** http://localhost:3000
- **Server:** ws://localhost:2567
- **Colyseus Monitor (internal):** http://localhost:2567/colyseus
- **PostgreSQL:** localhost:5434 (user: `ellmud`, password: `ellmud_dev`, db: `ellmud`)
- **Redis:** localhost:6379

For Phase 1 (solo, in-memory mode), you can skip the `docker compose up -d` step and run with defaults.

## Project Structure

```
ellmud/
├── packages/
│   ├── shared/       # @ellmud/shared — types, message protocol, item system
│   ├── server/       # @ellmud/server — Colyseus game server
│   └── client/       # @ellmud/client — web terminal (Phase 2)
├── docs/             # Documentation
├── GDD.md            # Game Design Document (authoritative)
├── KNOWN_ISSUES.md   # Known bugs and limitations
├── vitest.workspace.ts
├── tsconfig.json     # Root TypeScript config
└── package.json      # Workspace root
```

## Workspace Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages (shared → server → client) |
| `npm run test` | Run tests across all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run dev:server` | Start server in watch mode (tsx) |
| `npm run dev:client` | Start client in watch mode |

### Per-Package Commands

```bash
# Server only
npm run dev -w @ellmud/server     # Watch mode
npm run build -w @ellmud/server   # Build
npm run test -w @ellmud/server    # Tests
npm run lint -w @ellmud/server    # Lint

# Shared only
npm run build -w @ellmud/shared
npm run test -w @ellmud/shared
```

## Environment Variables

All environment variables have sensible defaults for local development. No `.env` file is required for Phase 1.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `2567` | Server listen port |
| `CLIENT_URL` | `http://localhost:3000` | React client URL (for OAuth redirects) |
| `AUTH_REQUIRED` | `false` | Require auth tokens to join rooms |
| `MAX_PLAYERS_PER_SHARD` | `1` | Max concurrent players per shard (Phase 1: solo, Phase 2+: scale) |
| `MAX_REPLICAS` | `1` | Max Container Apps replicas |
| `ENTRA_CLIENT_ID` | *(none)* | Microsoft Entra External ID client ID |
| `ENTRA_CLIENT_SECRET` | *(none)* | Microsoft Entra External ID client secret |
| `ENTRA_TENANT_ID` | *(none)* | Microsoft Entra tenant ID |
| `ALLOW_LOCAL_AUTH` | `true` | Allow local username/password auth (Phase 2.5+) |
| `REDIS_PRESENCE_ENABLED` | `false` | Enable Redis-backed Colyseus presence |
| `REDIS_CONNECTION_STRING` | `redis://localhost:6379` | Redis connection string |
| `DATABASE_URL` | *(none)* | PostgreSQL connection string (Phase 2+) |
| `USE_PG_REPOS` | `false` | Use PostgreSQL repos instead of in-memory |
| `AZURE_ENDPOINT` | *(none)* | Azure AI Foundry endpoint URL |
| `AZURE_API_KEY` | *(none)* | Azure AI Foundry API key |
| `AZURE_DEPLOYMENT_NAME` | `gpt-4o-mini` | Azure AI Foundry model deployment |
| `AZURE_API_VERSION` | `2024-10-01` | Azure AI Foundry API version |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `ADMIN_TOKEN` | *(random UUID)* | Admin API secret token for protected endpoints |

### Phase 1 & 2 Defaults

Phase 1 and early Phase 2 can run entirely in-memory:

- **Auth:** Optional. Anonymous join allowed when `AUTH_REQUIRED=false`.
- **Database:** In-memory repositories (players, stash, skills, etc.).
- **Cache:** In-memory LRU narration cache (1000 entries).
- **LLM:** Template fallback fires when no Azure credentials are configured.
- **Colyseus Presence:** In-process matchmaker; single replica.

For full Phase 2+ multiplayer and persistence, enable PostgreSQL and Redis via `.env`.

## Running Tests

```bash
# All tests
npm run test

# Server tests only
npm run test -w @ellmud/server

# Shared tests only
npm run test -w @ellmud/shared

# With coverage
npx vitest run --coverage -w @ellmud/server
```

Tests use Vitest and are co-located in `__tests__/` directories alongside source code.

## Docker Development Services

The `docker-compose.yml` starts PostgreSQL (port 5434) and Redis (port 6379) with sensible defaults for local development.

```bash
# Start services
docker compose up -d

# Check status
docker compose ps

# Stop services
docker compose down
```

### PostgreSQL

- **Container:** ellmud-postgres
- **Host:** localhost:5434 (external port)
- **Port:** 5432 (internal)
- **User:** ellmud
- **Password:** ellmud_dev
- **Database:** ellmud

Migrations run automatically on server start when `DATABASE_URL` is set. See the "Database Setup" section below.

### Redis

- **Container:** ellmud-redis
- **Host:** localhost:6379
- **Memory limit:** 128MB with LRU eviction
- **Persistence:** Disabled (ephemeral for local dev)

## Database Setup (Phase 2+)

When `DATABASE_URL` is set, migrations run automatically on server start.

**Option 1: Docker Compose (Recommended)**
```bash
docker compose up -d  # starts ellmud-postgres
export DATABASE_URL=postgresql://ellmud:ellmud_dev@localhost:5434/ellmud
npm run dev:server
```

**Option 2: Manual PostgreSQL**
```bash
# If you have PostgreSQL installed locally
export DATABASE_URL=postgresql://user:password@localhost:5432/ellmud
npm run dev:server
```

### Available Migrations

| File | Tables Created |
|------|-----------------|
| `001_create_players.sql` | `players`, `player_identities` (auth) |
| `002_create_items.sql` | `item_definitions`, `stash_entries` (inventory) |
| `003_create_skills.sql` | `player_skills` (progression) |
| `004_create_factions.sql` | `factions`, `faction_memberships` (groups) |
| `005_create_run_history.sql` | `run_history` (extraction runs) |
| `006_create_audit_log.sql` | `audit_log` (admin actions) |
| `007_create_admin_users.sql` | `admin_users`, `admin_sessions` (admin accounts) |

Track applied migrations in the `_migrations` table:
```sql
SELECT * FROM _migrations ORDER BY applied_at;
```

## Redis Setup (Phase 2+)

```bash
# Via Docker Compose (recommended)
docker compose up -d

# Or manually
docker run -d --name ellmud-redis -p 6379:6379 redis:7

# Enable Redis presence in server config
export REDIS_PRESENCE_ENABLED=true
export REDIS_CONNECTION_STRING=redis://localhost:6379
npm run dev:server
```

**Note:** Colyseus uses Redis for presence (multi-replica awareness) and narration cache eviction. Not required for single-server local dev, but recommended for testing multiplayer.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js ≥ 20 |
| Language | TypeScript (strict) |
| WebSocket Framework | Colyseus 0.17.x |
| HTTP Framework | Express 4 |
| Auth | Microsoft Entra External ID (OAuth/OIDC) + bcryptjs + UUID tokens |
| Database | PostgreSQL (pg driver, raw SQL) |
| Cache | Redis (presence, narration) |
| Admin UI | React 18 + Vite + Tailwind CSS |
| LLM | Azure AI Foundry (GPT-4o-mini) |
| Testing | Vitest |
| Linting | ESLint |
| Build | TypeScript compiler (tsc) + Vite |
| Monorepo | npm workspaces |
