# Decision: Align release workflows with dev/uat/prod branching

**Date:** 2026-04-09
**Author:** Minsc
**Issue:** #379

## Context
The Squad tooling workflows (`release.yml`, `squad-release.yml`, `squad-promote.yml`) shipped with a default `dev → preview → main` branching model, but this repo uses `dev → uat → prod`. Neither `main` nor `preview` branches exist, causing `release.yml` to fail at checkout.

## Decision
Updated all three release-related workflows to use the actual `dev → uat → prod` branching model:
- `release.yml` checks out and pushes to `prod`
- `squad-release.yml` triggers on push to `prod`
- `squad-promote.yml` promotes `dev → uat → prod`

## Impact
- Release workflow should now succeed when dispatched
- Squad promote pipeline is now usable
- Consistent with `ci-cd.yml` which already targets `uat`/`prod`
