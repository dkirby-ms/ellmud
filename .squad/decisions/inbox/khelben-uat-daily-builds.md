# Decision: Scheduled dev → uat Promotion Workflow

**Date:** 2025-07-18  
**Author:** Khelben (CI/CD Dev)  
**Status:** Proposed  
**PR:** squad/uat-daily-builds → dev

---

## Context

The team wanted daily builds flowing into UAT automatically so QA always has fresh code to test without manual promotion steps.

## Decision

Created `.github/workflows/scheduled-uat-promote.yml` — a **new, separate** workflow that:

1. **Runs 3x daily** (08:00, 14:00, 20:00 UTC) via `schedule` cron triggers
2. **Supports manual trigger** via `workflow_dispatch`
3. **Only promotes dev → uat** (uat → prod stays manual via `squad-promote.yml`)
4. **Safety:** Skips if dev has no commits ahead of uat
5. **Strips forbidden paths** (`.squad/`, `.ai-team/`, etc.) — same logic as `squad-promote.yml`
6. **Concurrency group** prevents overlapping runs
7. **Pinned action SHAs** match existing `ci-cd.yml`

## Why a Separate Workflow

- `squad-promote.yml` handles the full dev → uat → prod chain and should remain manual (prod deploys need human approval)
- Scheduled automation should only touch the dev → uat leg
- Keeping them separate means the schedule can be tuned without risking prod deployment logic

## Risks

- If dev has a broken build, the scheduled merge will push it to uat. Mitigation: `ci-cd.yml` runs build+test on push to uat and the deploy pipeline has rollback.
- Forbidden path stripping logic is duplicated across two workflows. If paths change, both must be updated.

## Follow-up

- Consider extracting the forbidden-path stripping into a reusable composite action if the list grows.
- Monitor whether 3x/day frequency is right — adjust cron schedule as needed.
