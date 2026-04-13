# 🎮 Ellmud

> **PvPvE Extraction RPG — Real-Time MUD**

Explore persistent zones filled with creatures and loot. Scavenge gear, fight for survival, manage your persistent stash in the Refuge, then dive into extraction runs. Everything you don't extract, you lose. **Death is permanent** — but your legend lives on in the Hall of Fame.

Ellmud is a text-primary, real-time multiplayer extraction RPG built on WebSocket, with rich prose narration powered by LLM prose generation. Built in TypeScript with Colyseus for real-time multiplayer, React for the web client, and PostgreSQL for persistence.

---

## 🎯 What Makes Ellmud Unique

- **Permadeath with Meaning** — When you die, your character is gone forever. But your story is recorded in the Hall of Fame, and your stash is preserved for your next run.
- **Real-Time Tick-Based Combat** — Strike, dodge, and flee in a synchronized tick loop. Combat is fast, tense, and unforgiving.
- **Passive Dodge Mechanic** — Your posture affects your dodge chance. Stand tall or crouch low to survive longer.
- **Extraction-Based Progression** — Success isn't measured by kills—it's by what you bring home. Die with loot? It's gone. Loot dies with you.
- **Prose Narration** — Every action is narrated in rich prose. Combat, exploration, and interaction feel cinematic, not mechanical.
- **Procedural Shards** — The Warrens are split into multiple shards (shard instances). Each shard is a unique PvE instance; other players may be present.
- **Persistent Stash** — Your stash survives death. Load out your gear, dive in, and if you make it out alive, keep what you found.
- **Live Admin Tools** — Content creators can tweak creatures, items, and encounters in real-time without restarting the server.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 22.0.0 (see `.nvmrc`)
- **npm** 10+
- **Docker** (optional; for PostgreSQL and Redis in development)

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/dkirby-ms/ellmud.git
cd ellmud

# 2. Use the correct Node version
nvm use

# 3. Install dependencies
npm install

# 4. Start PostgreSQL and Redis (optional; in-memory mode works for solo testing)
docker compose up -d

# 5. Configure environment (optional; defaults work for local dev)
cp .env.example .env

# 6. Build all packages
npm run build

# 7. Start the dev server (both server and client)
npm run dev
```

This starts:
- **Game Server:** WebSocket at `ws://localhost:2567`
- **Game Client:** React app at `http://localhost:3000`
- **Admin Dashboard:** Also at `http://localhost:3000/admin`
- **Server Health:** `http://localhost:2567/health`
- **Colyseus Monitor:** `http://localhost:2567/colyseus` (real-time room state)

**Separate terminals** (if you prefer):
```bash
npm run dev:server    # Terminal 1: Game server
npm run dev:client    # Terminal 2: Client + admin UI
```

---

## 🏗️ Project Structure

This is a **monorepo** with four packages:

```
packages/
├── shared/          # @ellmud/shared — Types, message protocol, item definitions
├── server/          # @ellmud/server — Colyseus game server, admin APIs, game systems
├── client/          # @ellmud/client — React web app (game UI + admin dashboard)
└── e2e/             # @ellmud/e2e — End-to-end tests
```

- **shared:** Compiled to CommonJS and ESM; used by both server and client.
- **server:** Node.js application; includes Colyseus rooms, command parsing, game logic, HTTP APIs.
- **client:** Vite + React SPA; runs in the browser.
- **e2e:** Vitest integration tests; runs against a live server.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 22 / TypeScript | Server and shared code |
| **Real-Time** | Colyseus 0.17 | WebSocket multiplayer framework |
| **Client** | React 18 + Vite | Web UI (game + admin) |
| **Database** | PostgreSQL 18 | Player state, stash, run history, content |
| **Cache** | Redis 8 | Narration cache, Colyseus presence |
| **Auth** | Microsoft Entra External ID + bcrypt | Production OAuth/OIDC + local dev login |
| **AI** | Azure AI Foundry (GPT-4o-mini) | Prose narration generation |
| **Testing** | Vitest | Unit tests, integration tests, e2e tests |
| **Linting** | ESLint + TypeScript | Type safety and code quality |
| **Deployment** | Docker + Azure Container Apps | Production hosting |

---

## 📚 Running Tests & Builds

```bash
# Run all tests across all packages
npm run test

# Run tests for a specific package
npm run test -w @ellmud/server

# Run linting
npm run lint

# Build all packages (for production)
npm run build

# Build a specific package
npm run build -w @ellmud/shared

# Run e2e tests (requires a running server)
npm run test:e2e
```

---

## 🐳 Docker & Deployment

### Local Docker Compose

Start PostgreSQL + Redis + the game server together:

```bash
docker compose --profile full up -d
```

Services:
- **PostgreSQL** on `localhost:5434` (user: `ellmud`, password: `ellmud_dev`)
- **Redis** on `localhost:6379`
- **Game Server** on `localhost:2567` and `localhost:3000`

To stop:
```bash
docker compose down
```

### Production Deployment

The project includes a multi-stage `Dockerfile`:
1. **Build stage:** Compiles TypeScript, bundles React
2. **Runtime stage:** Runs only the compiled server + client assets
3. **Exposed ports:** `2567` (game server), `3000` (client assets)

Docker image is pushed to Azure Container Registry and deployed via Azure Container Apps.

---

## ⚙️ Environment Configuration

See `.env.example` for a complete template. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `2567` | Game server listen port |
| `NODE_ENV` | `development` | Environment mode (development / production) |
| `DATABASE_URL` | — | PostgreSQL connection string (required for persistence) |
| `REDIS_CONNECTION_STRING` | `redis://localhost:6379` | Redis connection string |
| `REDIS_CACHE_ENABLED` | `false` | Enable narration result caching |
| `REDIS_PRESENCE_ENABLED` | `false` | Enable Redis for multi-instance presence |
| `ALLOW_LOCAL_AUTH` | `true` | Allow username/password login (dev mode) |
| `ENTRA_CLIENT_ID` | — | Microsoft Entra External ID client ID (production) |
| `ENTRA_CLIENT_SECRET` | — | Entra secret |
| `ENTRA_TENANT_ID` | — | Entra tenant ID |
| `CLIENT_URL` | `http://localhost:3000` | Client URL for OAuth redirects |
| `AZURE_ENDPOINT` | — | Azure AI Foundry endpoint for LLM |
| `AZURE_API_KEY` | — | Azure API key |
| `AZURE_DEPLOYMENT_NAME` | `gpt-4o-mini` | LLM model deployment name |
| `LOG_LEVEL` | `info` | Logging verbosity (debug / info / warn / error) |
| `ADMIN_TOKEN` | — | Admin API secret (auto-generated if not set) |

---

## 🎮 Game Features (Current)

### ✅ Phase 1 — Core Loop
- **Zones & Exploration:** The Warrens procedurally generated; explore on foot
- **Tick-Based Combat:** Strike, dodge, flee in 1.5-second combat ticks
- **Creatures:** Drowned Revenant and other monsters with procedural stats
- **Loot System:** 17 unique items across 6 rarity tiers; contextual drop tables
- **Extraction:** 5-tick channeled extraction before shard collapse (10 minutes)
- **Stash & Loadout:** Persistent inventory separate from in-run inventory
- **Command Parser:** 17+ game commands with aliases (look, take, attack, flee, etc.)
- **Prose Narration:** Every action is narrated by the LLM (with template fallback)

### ✅ Phase 2 — Multiplayer & Admin
- **Multiplayer Shards:** Multiple instances of the Warrens; players may encounter each other
- **React Web Client:** Modern UI with login, character select, gameplay, inventory
- **Admin Dashboard:** Real-time content CRUD for creatures, items, biomes, loot tables, rooms, templates, etc.
- **PostgreSQL Persistence:** Players, stash, run history, audit logs
- **Microsoft Entra Integration:** OAuth/OIDC login for production; bcrypt for dev
- **Audit Log:** Track all admin actions with timestamps and user info
- **Simulators:** Test loot drops and creature stat rolls before deploying

### ✅ Phase 2.5 — Admin Tools & Polish
- **Permadeath System:** Characters don't respawn; Hall of Fame records all deaths
- **Passive Dodge:** Posture system affects dodge chance (stand, crouch, etc.)
- **Corpse Containers:** Dead creatures and players drop loot containers
- **ANSI Formatting Toolbar:** Admin can style prose in content editors
- **Zone Designer:** Visual map editor for static zones (Warrens topology tools)
- **Deploy Page:** Preview changes, promote content between staging and production

### 🔄 Phase 3 — Planned
- SSH/Raw TCP client adapter (legacy MUD client support)
- Advanced creature AI (behavior trees, multi-phase fights)
- PvP system (arenas, player contracts, faction warfare)
- Content expansion (Siltgate and other biomes, more creatures, events)
- Performance optimization (creature AI threading, narrative batching)

---

## 📖 Documentation

| Resource | Purpose |
|----------|---------|
| **[GDD.md](GDD.md)** | **START HERE.** Authoritative game design doc. Read this to understand what the game is and how it works. |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | How to set up for development, contribution workflow, code style, testing checklist |
| **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** | Community standards and expected behavior |
| **[SECURITY.md](SECURITY.md)** | How to report security vulnerabilities responsibly |
| **[CHANGELOG.md](CHANGELOG.md)** | Release notes and feature history |
| **docs/architecture.md** | System design, data flow, component responsibilities |
| **docs/setup.md** | Detailed local dev setup, troubleshooting, Docker workflows |
| **docs/api-reference.md** | WebSocket protocol, commands, HTTP endpoints |
| **docs/llm-integration.md** | Narration pipeline, prompts, caching strategy |
| **docs/player-guide.md** | How to play, command reference, combat tips |
| **docs/admin-guide.md** | Admin dashboard, simulators, deployment process |

---

## 🎲 Game Design Decisions

Key pillars encoded in the game:

- **Permadeath is permanent.** When you die, you're dead. No respawns, no resurrection. New character only.
- **Extraction is the goal.** Dying in a shard means losing all in-run loot. Get out alive or lose it all.
- **Server is authoritative.** All game state lives on the server. Clients only send commands.
- **Text is canonical.** The prose feed is your primary interface to the game. All mechanics are visible here first.
- **Inventory ≠ Stash.** Inventory is your active gear (lost on death). Stash is your persistent storage (preserved).
- **LLM-generated prose.** When available, the Azure AI Foundry enriches templates with creative prose. If it times out, we fall back to static text.

For deep design philosophy, see **[GDD.md](GDD.md)**.

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Branch and commit conventions
- Code style and testing requirements
- Areas looking for help (game logic, UI, backend, docs)

Quick checklist before opening a PR:
```bash
npm run build     # Ensure code compiles
npm run lint      # Check for style issues
npm run test      # Run all tests
```

---

## 📜 License

[ISC](LICENSE) — See LICENSE file for details.

---

## 🔗 Links

- **Repository:** https://github.com/dkirby-ms/ellmud
- **Issue Tracker:** https://github.com/dkirby-ms/ellmud/issues
- **Discussions:** https://github.com/dkirby-ms/ellmud/discussions
- **Game Design Doc:** [GDD.md](GDD.md)

---

**Built with ❤️ by the Ellmud team. Join us and help shape the future of this extraction RPG.**
