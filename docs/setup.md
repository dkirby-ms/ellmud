# Local Development Setup

## Prerequisites

- **Node.js** ≥ 20.0.0 (see `.nvmrc` — currently pinned to 20)
- **npm** (comes with Node.js)
- **PostgreSQL** (optional, Phase 2 — in-memory repos used by default)
- **Redis** (optional, Phase 2 — in-memory cache used by default)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/dkirby-ms/ellmud.git
cd ellmud

# Use the correct Node.js version
nvm use  # reads .nvmrc

# Install all dependencies (workspaces)
npm install

# Build all packages (shared must build first)
npm run build

# Start the server
npm run dev:server
```

The server will start on `ws://localhost:2567` with the admin monitor at `http://localhost:2567/colyseus`.

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
| `AUTH_REQUIRED` | `false` | Require auth tokens to join rooms |
| `MAX_PLAYERS_PER_SHARD` | `1` | Max concurrent players per shard (Phase 1: solo) |
| `MAX_REPLICAS` | `1` | Max Container Apps replicas |
| `REDIS_PRESENCE_ENABLED` | `false` | Enable Redis-backed Colyseus presence |
| `REDIS_CONNECTION_STRING` | `redis://localhost:6379` | Redis connection string |
| `DATABASE_URL` | *(none)* | PostgreSQL connection string (Phase 2) |
| `AZURE_ENDPOINT` | *(none)* | Azure AI Foundry endpoint URL |
| `AZURE_API_KEY` | *(none)* | Azure AI Foundry API key |
| `AZURE_DEPLOYMENT_NAME` | `gpt-4o-mini` | Azure AI Foundry model deployment |
| `AZURE_API_VERSION` | `2024-10-01` | Azure AI Foundry API version |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

### Phase 1 Defaults

Phase 1 runs entirely in-memory — no PostgreSQL, no Redis, no LLM required:

- **Auth:** Optional. Anonymous join allowed when `AUTH_REQUIRED=false`.
- **Database:** In-memory repositories (`InMemoryPlayerRepository`, `InMemoryStashRepository`, `InMemoryTokenStore`).
- **Cache:** In-memory LRU narration cache (1000 entries).
- **LLM:** Template fallback fires when no Azure credentials are configured.

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

## Database Setup (Phase 2)

When moving to persistent storage:

```bash
# Start PostgreSQL locally
docker run -d --name ellmud-db \
  -e POSTGRES_DB=ellmud \
  -e POSTGRES_USER=ellmud \
  -e POSTGRES_PASSWORD=ellmud \
  -p 5432:5432 \
  postgres:16

# Set the connection string
export DATABASE_URL=postgresql://ellmud:ellmud@localhost:5432/ellmud

# Migrations run automatically on server start
npm run dev:server
```

Migration files are in `packages/server/src/db/migrations/`:

| Migration | Tables |
|-----------|--------|
| `001_create_players.sql` | `players`, `player_identities` |
| `002_create_items.sql` | `item_definitions`, `stash_entries` |
| `003_create_skills.sql` | `player_skills` |
| `004_create_factions.sql` | `factions`, `faction_memberships` |
| `005_create_run_history.sql` | `run_history` |

## Redis Setup (Phase 2)

```bash
# Start Redis locally
docker run -d --name ellmud-redis -p 6379:6379 redis:7

# Enable Redis presence
export REDIS_PRESENCE_ENABLED=true
export REDIS_CONNECTION_STRING=redis://localhost:6379
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js ≥ 20 |
| Language | TypeScript (strict) |
| WebSocket Framework | Colyseus 0.17.x |
| HTTP Framework | Express 4 |
| Auth | bcryptjs + UUID tokens |
| Database | PostgreSQL (pg driver, raw SQL) |
| Cache | In-memory LRU (Redis planned) |
| LLM | Azure AI Foundry (GPT-4o-mini) |
| Testing | Vitest |
| Linting | ESLint |
| Build | TypeScript compiler (tsc) |
| Monorepo | npm workspaces |
