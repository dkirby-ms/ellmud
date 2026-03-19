# Ellmud

**PvPvE Extraction RPG — Real-Time MUD**

Dive into procedurally generated shards, scavenge gear, fight creatures, and extract before collapse. Everything you don't extract, you lose.

## Quick Start

```bash
# Prerequisites: Node.js >= 20
nvm use           # reads .nvmrc
npm install       # install all workspace dependencies
npm run build     # build shared → server → client
npm run dev:server # start server on ws://localhost:2567
```

The admin dashboard is at `http://localhost:2567/colyseus`.

No database, Redis, or LLM credentials required for Phase 1 — everything runs in-memory with template narrative fallback.

## Architecture

```
Browser (WebSocket) → Colyseus 0.17.x → Game Systems → Narrative Pipeline
                                              ↓                ↓
                                         PostgreSQL      Azure AI Foundry
                                           Redis         (GPT-4o-mini)
```

**Core principle:** The LLM describes; the server decides. All game state is server-authoritative. Clients receive only narrated prose — never raw game state.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture Overview](docs/architecture.md) | System boundaries, data flow, component map |
| [Setup Guide](docs/setup.md) | Local development, env vars, running tests |
| [API Reference](docs/api-reference.md) | WebSocket protocol, commands, HTTP endpoints |
| [LLM Integration](docs/llm-integration.md) | Narration pipeline, prompts, caching, templates |
| [Player Guide](docs/player-guide.md) | How to play, commands, combat, extraction |
| [Admin Guide](docs/admin-guide.md) | Dashboard, debugging, configuration |
| [Game Design Document](GDD.md) | Authoritative game design specification |

## Project Structure

```
packages/
├── shared/   # @ellmud/shared — types, message protocol, item system
├── server/   # @ellmud/server — Colyseus game server
└── client/   # @ellmud/client — web terminal (Phase 2)
```

## Tech Stack

- **Runtime:** Node.js 20+ / TypeScript
- **WebSocket:** Colyseus 0.17.x
- **Auth:** bcryptjs + UUID tokens
- **Database:** PostgreSQL (pg driver)
- **Cache:** In-memory LRU (Redis planned)
- **LLM:** Azure AI Foundry (GPT-4o-mini)
- **Testing:** Vitest
- **Deployment:** Azure Container Apps + GitHub Actions

## Phase 1 Status

Solo extraction loop with in-memory persistence:
- ✅ Colyseus rooms (ShardRoom, RefugeRoom)
- ✅ Command parser (17 verbs + aliases)
- ✅ Tick-based combat (strike, dodge, flee)
- ✅ Creature AI (Drowned Revenant)
- ✅ Extraction mechanic (5-tick channel)
- ✅ Item system (17 items, 6 tiers)
- ✅ Stash persistence
- ✅ LLM narration pipeline (cache + templates + Azure AI)
- ✅ Username/password auth
- ✅ Admin monitor dashboard

## License

ISC
