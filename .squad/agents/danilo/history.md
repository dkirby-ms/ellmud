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
