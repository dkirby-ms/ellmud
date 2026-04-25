# 🎮 Ellmud

> **Real-Time Multiplayer MUD/MMORPG — Permadeath, Persistent World**

Explore hand-crafted zones filled with creatures, danger, and other adventurers. Earn gear through combat and discovery. Manage your persistent stash between adventures. **Permadeath is permanent** — every decision carries weight. Your legend lives on in the Hall of Fame.

Ellmud is a multiplayer MUD/MMORPG with permadeath consequences and rich prose narration powered by LLM generation. Play via web browser with text-primary interface, or use the standalone **Unity client** for full 3D graphics. Both clients connect to the same persistent server-authoritative world.

**Server:** TypeScript + Colyseus for real-time multiplayer, PostgreSQL for persistence.  
**Web Client:** React + Vite for modern browser experience.  
**Unity Client:** Standalone 3D graphics client for Windows/Mac/Linux.

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

This repository contains the **server and web client** as a TypeScript monorepo with four packages:

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

**Unity Client:** The standalone 3D graphics client (Unity + C#) is maintained in a separate repository and connects to the same WebSocket server.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 22 / TypeScript | Server and shared code |
| **Real-Time** | Colyseus 0.17 | WebSocket multiplayer framework |
| **Web Client** | React 18 + Vite | Browser UI (game + admin dashboard) |
| **Graphics Client** | Unity + C# | Standalone 3D client for cross-platform desktop |
| **Database** | PostgreSQL 18 | Player state, stash, progression, content |
| **Cache** | Redis 8 | Narration cache, session presence |
| **Auth** | Microsoft Entra External ID + bcrypt | Production OAuth/OIDC + local dev login |
| **AI** | Azure AI Foundry (GPT-4o-mini) | LLM-powered prose narration |
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
- **Zones & Exploration:** Hand-crafted adventure zones; navigate via compass and directional commands
- **Real-Time Combat:** Server-tick-based (1 second); auto-attack with ability bar (hotkeys 1–5)
- **Creatures:** Various hostile creatures with procedural stats, behaviors, and loot tables
- **Loot System:** 17+ unique items across rarity tiers; contextual drop tables by zone and creature
- **Permadeath:** Characters don't respawn. Death drops equipped gear on a corpse; others can loot it
- **Stash & Loadout:** Persistent inventory (stash) separate from in-run inventory; manage gear between adventures
- **Command Parser:** 20+ game commands with aliases (look, take, attack, flee, emote, etc.)
- **LLM Narration:** Every action narrated by Azure GPT-4o-mini with template fallback for latency

### ✅ Phase 2 — Multiplayer & Admin
- **Shared-World Zones:** Multiple instances of zones; players encounter each other naturally
- **React Web Client:** Modern browser UI with login, character creation, gameplay, inventory management, map
- **Admin Dashboard:** Real-time content CRUD for creatures, items, loot tables, rooms, narrative templates
- **PostgreSQL Persistence:** Player characters, stash, progression, audit logs
- **Microsoft Entra Integration:** OAuth/OIDC login for production; bcrypt username/password for dev
- **Audit Log:** Track all admin actions with detailed timestamps and user info
- **Simulators:** Test loot drops and creature stat rolls before deployment

### ✅ Phase 2.5 — Admin Tools & Polish
- **Permadeath Hall of Fame:** Record character deaths with statistics and achievement tracking
- **Passive Defense:** Posture system (stand, crouch, etc.) affects dodge chance
- **Corpse Containers:** Dead creatures and players drop loot containers
- **ANSI Formatting Toolbar:** Admin can style prose in content editors
- **Zone Designer:** Visual map editor for authoring static hand-crafted zones
- **Deploy Pipeline:** Preview changes, promote content between staging and production

### 🔄 Phase 3 — Planned
- **Unity 3D Client:** Standalone graphics client for Windows/Mac/Linux; isometric or third-person perspective; same gameplay as web client
- **Advanced Creature AI:** Behavior trees, multi-phase boss fights, pack mechanics
- **Content Expansion:** Siltgate, Lost Catacombs, and other biomes; expanded creature roster
- **Faction System:** Strongholds, faction vendors, contracts, reputation tracking
- **Skills & Progression:** Character skills (Swordsmanship, Evasion, Awareness) unlock new abilities
- **Performance Optimization:** Creature AI threading, narrative generation batching, netcode optimization

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
- **Death has real consequences.** Dying in a zone means losing your equipped gear. Other players can loot your corpse. This creates meaningful risk.
- **Server is authoritative.** All game state lives on the server. Clients only send commands.
- **Text is canonical.** The prose feed is your primary interface to the game. All mechanics are visible here first.
- **Inventory ≠ Stash.** Inventory is your active gear (lost on death). Stash is your persistent storage (preserved).
- **Shared world by default.** Zones are shared between players. Overflow is handled by transparent instance management, but players share the world.
- **LLM-enriched prose.** When available, Azure AI Foundry enriches templates with creative prose. If it times out, we fall back to static text.

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

**Built with ❤️ by the Ellmud team. Join us and help shape the future of this MUD/MMORPG.**
