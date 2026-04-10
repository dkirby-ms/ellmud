# Khelben — History

## Core Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, TypeScript, Colyseus (game server), React (client), WebSocket/SSH
- **Monorepo:** packages/server, packages/client, packages/shared
- **Branching:** dev → uat → prod (default branch is dev)
- **User:** dkirby-ms
- **Build:** `npm run build` (TypeScript compilation across packages)
- **Test:** `npx vitest run` (3,100+ tests across packages)
- **Lint:** Check package.json for lint command
- **Docker:** Dockerfile and docker-compose.yml at repo root
- **CI/CD:** .github/workflows/ — CI runs on push, release on prod
- **Infra:** infra/ directory for infrastructure config
- **Port:** Game server runs on port 2567

## Learnings

- **Scheduled UAT promotion:** `.github/workflows/scheduled-uat-promote.yml` runs 3x daily (08:00, 14:00, 20:00 UTC) to merge dev → uat automatically. Uses same forbidden-path stripping as `squad-promote.yml`. Manual `squad-promote.yml` still needed for uat → prod.
- **Pinned action SHAs:** CI workflows use pinned commit SHAs for actions (e.g., `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`). Match these when adding new workflows.
- **Forbidden paths stripped on promotion:** `.ai-team/`, `.squad/`, `.ai-team-templates/`, `team-docs/`, `docs/proposals/` — must be kept in sync across `squad-promote.yml` and `scheduled-uat-promote.yml`.
- **Concurrency:** Scheduled workflow uses `concurrency: { group: scheduled-uat-promote, cancel-in-progress: false }` to prevent overlapping merge runs. CI uses per-ref groups with cancel-in-progress.
- **GITHUB_TOKEN limitation:** Pushes made with `GITHUB_TOKEN` (by `github-actions[bot]`) do NOT trigger other workflows by design (to prevent infinite loops). Solution: use `workflow_dispatch` trigger + explicit `gh workflow run` calls after pushing.
- **CI/CD trigger pattern:** After promotion workflows push to uat/prod, they now explicitly trigger `ci-cd.yml` via `gh workflow run ci-cd.yml --ref <branch>` using `GH_TOKEN`. A 5-second sleep gives GitHub time to process the push before triggering.
- **workflow_dispatch needs actions:write:** `gh workflow run` uses the workflow_dispatch API, which requires `actions: write` permission on GITHUB_TOKEN. `contents: write` alone is not enough — the API returns HTTP 403 without it. Both promote workflows now carry both permissions.

