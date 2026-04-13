# Danilo — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, TypeScript, Colyseus (WebSocket), React client, PostgreSQL, LLM narration
- **User:** dkirby-ms
- **Joined:** 2026-03-28

## Core Context

Ellmud is a text-primary MUD with procedurally generated shard instances, tick-based combat, and an LLM narration layer. Players explore zones (currently the Warrens), fight creatures, collect loot, and extract. The game has a React web client with admin tools including a zone designer.

Key public-facing areas:
- `docs/` — project documentation
- `README.md` — project overview
- `GDD.md` — game design document
- Discord server for community communications

## Learnings

### #343 — Repo Hygiene (2026-04-08)

**What was done:**
- Created 9 missing hygiene files to scale contributor onboarding and automate releases
- LICENSE (ISC, matching package.json)
- CONTRIBUTING.md with clear contribution workflow, setup, code style expectations
- CODE_OF_CONDUCT.md (Contributor Covenant 2.0)
- SECURITY.md with responsible disclosure guidelines
- .editorconfig for consistent formatting (2-space indent, Unix line endings)
- .github/ISSUE_TEMPLATE/bug_report.md and feature_request.md
- .github/PULL_REQUEST_TEMPLATE.md with checklist
- .github/workflows/release.yml for automated version bumping and GitHub releases

**Key decisions:**
- Release workflow triggers on workflow_dispatch for manual control; uses `npm version` + `npm run version:sync` for workspace versioning
- PR template emphasizes testing (build, lint, test) and checklist discipline
- Issue templates use YAML frontmatter (GitHub standard) with labels and assignees
- CODE_OF_CONDUCT adapted from Contributor Covenant 2.0 (industry standard)

**Outcome:** PR #347 merged. Repo now has complete hygiene foundation for scaling contributors. Release pipeline is ready for manual triggering.

**Patterns to reuse:**
- This template set scales to similar game projects; minimal customization needed
- GitHub Actions release workflow is solid for monorepos using npm workspaces

### Help Screen Refresh (2025-07)

**What was done:**
- Audited all 33 command handler files against COMMAND_HELP registry in help.ts
- Added 15 missing commands: open, put, follow, unfollow, group, gsay, consent, unconsent, stand, sit, crouch, prone, recline, flag, toggle
- Created 4 new categories: Containers, Social, Posture, Settings
- Updated `take` entry to document `take <item> from <container>` syntax
- Used sandbox's multi-line ANSI tag pattern for `group` subcommand listing
- Confirmed `who` is handled async in ZoneRoom (not in handlers map) — correctly in help already
- Noted `listen`, `use`, `search`, `extract` are in help but have no handler in the registry — left as-is (may be planned or client-handled)

**Key patterns:**
- COMMAND_HELP is a pure metadata registry; it doesn't need to match the handlers map 1:1 (some commands like `who` are async)
- Multi-line usage strings use `\n` + ANSI `[bright-cyan]...[/bright-cyan]` tags for subcommand listings
- Categories in COMMAND_HELP must also appear in the `categoryOrder` array to render on the help screen
- Feature-gated commands use `requiredRoomType`; dev-only commands use `devOnly: true`

### README Rebuild (2026-04-13)

**What was done:**
- Completely rewrote README.md from ground up, reflecting actual game state
- Read GDD.md, package.json, docker-compose.yml, Dockerfile, CONTRIBUTING.md, CHANGELOG.md, .squad/directives.md
- Restructured to emphasize player experience first, then developer experience
- Reorganized with clear section hierarchy: intro → quick start → structure → tech stack → testing → docker → config → features → docs → design decisions
- Linked to all related docs (GDD.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, CHANGELOG.md, docs/*)
- Added emoji section headers for visual scanning
- Emphasized unique gameplay features: permadeath, extraction-based progression, prose narration, passive dodge, posture system, Hall of Fame, stash preservation
- Listed Phase 1/2/2.5/3 status with actual completed features and planned work
- Updated Node.js version requirement from ≥20.0.0 to ≥22.0.0 (per package.json engines)
- Fixed docker-compose example to use --profile full (since game-server service uses profiles: [full])
- Added table of environment variables with actual defaults from .env.example
- Preserved original architecture mermaid diagram (unchanged; still accurate)
- Provided clear "separate terminals" alternative to `npm run dev` for developers who prefer that

**Key learnings:**
- README was outdated; package.json shows >= 22.0.0 required, .nvmrc says 22
- CONTRIBUTING.md already existed with solid onboarding content
- Game now has permadeath (Phase 2.5 feature: Hall of Fame, character reset)
- Passive dodge mechanic is core (posture system: stand, crouch, prone, etc.)
- Docker compose includes full game-server container but it's behind profiles: [full] — need to use docker compose --profile full
- Phase 2.5 added significant admin polish: ANSI toolbar, zone designer, deploy page
- Team directives emphasize inventory ≠ stash, server-authoritative design, text-as-canonical UI
- Recent commits show focus on permadeath, corpse containers, noTake items, admin polish

**Outcomes:**
- New README is player-focused but developer-complete
- Links out to GDD for deep design philosophy (avoids bloat, respects KISS)
- Provides copy-paste setup paths for common workflows
- Clearly articulates what makes Ellmud unique (permadeath, extraction, prose narration)
- Positions Phase 3 as forward-looking roadmap, not vaporware
