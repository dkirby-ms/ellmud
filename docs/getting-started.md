<!-- markdownlint-disable-file -->

# Getting Started with Ellmud

Welcome to Ellmud development! This guide walks you through setting up your local environment, running the game, and exploring your first zone.

## Prerequisites

Before you start, ensure you have:

- **Node.js** ≥ 22.0.0 (check your version with `node --version`)
- **npm** (comes with Node.js)
- **Git** (to clone the repository)
- **Docker & Docker Compose** (optional, for PostgreSQL and Redis in Phase 2+)
- **A text editor or IDE** (VS Code, WebStorm, etc.)

### Install Node.js

If you don't have Node.js 22+:

- **macOS:** `brew install node` or download from [nodejs.org](https://nodejs.org)
- **Linux:** Use your package manager (`apt`, `yum`, etc.) or [nvm](https://github.com/nvm-sh/nvm)
- **Windows:** Download installer from [nodejs.org](https://nodejs.org)

Verify installation:
```bash
node --version  # Should be v22.x.x or higher
npm --version
```

## Step 1: Clone the Repository

```bash
git clone https://github.com/dkirby-ms/ellmud.git
cd ellmud
```

## Step 2: Install Dependencies

The Ellmud project uses **npm workspaces** — a monorepo with shared, server, and client packages. Install all dependencies with one command:

```bash
npm install
```

This installs dependencies for:
- `@ellmud/shared` — Shared types and message protocol
- `@ellmud/server` — Colyseus WebSocket game server
- `@ellmud/client` — React web client
- Root development dependencies (linters, test runners, etc.)

## Step 3: Configure Environment (Optional for Phase 1)

In **Phase 1** (in-memory mode), you can skip this step. For **Phase 2+** (with PostgreSQL and Redis):

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your local settings:
   ```env
   DATABASE_URL=postgres://ellmud:ellmud_dev@localhost:5434/ellmud
   REDIS_URL=redis://localhost:6379
   AZURE_AI_ENDPOINT=<your-azure-endpoint>
   AZURE_AI_KEY=<your-azure-key>
   ```

3. Start PostgreSQL and Redis:
   ```bash
   docker compose up -d
   ```

   Verify services are running:
   ```bash
   docker compose ps
   ```

## Step 4: Build the Project

TypeScript must be compiled before running:

```bash
npm run build
```

This builds all packages in dependency order (shared → server → client).

## Step 5: Start the Server

In a dedicated terminal, start the server in watch mode:

```bash
npm run dev:server
```

You should see:
```
[Ellmud] Colyseus server listening on ws://localhost:2567
[Ellmud] Admin dashboard available at http://localhost:2567/colyseus
[Ellmud] Auth required: false
```

The server watches your source files and auto-reloads on changes.

## Step 6: Start the Client

In a separate terminal, start the web client:

```bash
npm run dev:client
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

Open http://localhost:3000 in your browser.

## Step 7: Play Your First Session

### Create an Account

On the login screen:
1. Click "Create Account" (or "New Character" if in-game)
2. Enter a username and password
3. Click "Create Character"

You'll spawn in the Stronghold (safe hub zone).

### Basic Commands

Try these commands in the game:

| Command | Effect |
|---------|--------|
| `look` | Describe the current room |
| `go north` | Move north (check exits first with `look`) |
| `go <direction>` | Move in any direction (north, south, east, west, up, down) |
| `attack <creature>` | Attack a creature (e.g., `attack goblin`) |
| `dodge` | Dodge incoming attacks (default if you don't act) |
| `inventory` | See your items and equipment |
| `equip <item>` | Equip a weapon or armor |
| `help` | List available commands |

### Explore

1. In the Stronghold, use `look` to see exits
2. Navigate to the Expedition Board: `go <direction until you find it>`
3. Select a zone to explore (start with Tier 1 zones if new)
4. Enter the zone and fight creatures
5. Collect loot and return to the Stronghold
6. Manage gear in your stash

## Step 8: Run Tests

Verify everything is working by running the test suite:

```bash
npm test
```

This runs tests in all workspaces (shared, server, client). Tests use **Vitest** for unit tests and **Playwright** for e2e tests.

### Run Tests for a Specific Package

```bash
# Server tests only
npm test -w @ellmud/server

# Client tests only
npm test -w @ellmud/client

# E2E tests (requires server running)
npm run test:e2e -w @ellmud/e2e
```

## Useful Development Commands

### Build Only

If you don't want watch mode, just build once:

```bash
npm run build
```

### Lint Code

Check for style issues:

```bash
npm run lint
```

This runs ESLint across all packages.

### Run Both Server & Client

Start server and client simultaneously:

```bash
npm run dev
```

This runs in a combined terminal (Ctrl+C stops both).

### Stop Services

Stop the server or client with **Ctrl+C**.

Stop Docker services:

```bash
docker compose down
```

## Common Issues & Troubleshooting

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find and kill the process on port 3000
# macOS/Linux:
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill

# Or use a different port:
PORT=3001 npm run dev:client
```

### Module Not Found Errors

**Problem:** `Cannot find module '@ellmud/shared'`

**Solution:**
1. Ensure you ran `npm install` in the root directory
2. Rebuild the shared package: `npm run build -w @ellmud/shared`
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### TypeScript Errors

**Problem:** `src/index.ts:5:1 - error TS2688: Cannot find type definition file for ...`

**Solution:**
1. Run `npm run build` to compile TypeScript
2. Check for circular dependencies in imports
3. Run `npm install` to ensure types are installed

### Docker Connection Issues

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
1. Verify Docker is running: `docker ps`
2. Start services: `docker compose up -d`
3. Check logs: `docker compose logs postgres redis`
4. For Phase 1, skip Docker entirely and use in-memory mode

### Can't Connect to Server

**Problem:** "Failed to connect" when starting the client

**Solution:**
1. Ensure server is running: `npm run dev:server` in another terminal
2. Check that WebSocket is listening: `lsof -i :2567`
3. Verify port 2567 is not blocked by firewall
4. Check browser console (F12) for WebSocket error details

## Next Steps

Once you've created a character and explored a zone:

1. **Read the [Player Guide](player-guide.md)** — Learn game mechanics (combat, items, groups, permadeath)
2. **Read the [GDD](../GDD.md)** — Understand the complete game design
3. **Explore the [Architecture](architecture.md)** — Learn how the server and client communicate
4. **Create a Zone** — Use the [Zone Content Spec](zone-content.md) and [Zone Designer Quick-Start](zone-designer-quickstart.md)
5. **Contribute** — See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines

## Helpful Resources

- **[GDD.md](../GDD.md)** — Complete game design, mechanics, economy
- **[Architecture.md](architecture.md)** — How systems are built
- **[Player Guide](player-guide.md)** — How to play
- **[Admin Guide](admin-guide.md)** — Admin dashboard and server management
- **[Setup Guide](setup.md)** — Detailed local development setup
- **[Testing Guide](testing-guide.md)** — How to write and run tests
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — Developer contribution guidelines

## Getting Help

- Check [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) for known bugs
- Read existing GitHub issues at [dkirby-ms/ellmud/issues](https://github.com/dkirby-ms/ellmud/issues)
- See [SECURITY.md](../SECURITY.md) for security policies
- Check [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) for community guidelines

Happy adventuring! 🎮

