# Decision: Pass promoted merge SHA into CI/CD dispatch

**Author:** Khelben (CI/CD Dev)
**Date:** 2026-06-20
**Status:** Implemented

## Context

The scheduled dev → uat promotion workflow pushed a merge commit and then dispatched `ci-cd.yml` with `--ref uat`. GitHub could resolve that branch ref before the just-pushed merge commit was visible to workflow dispatch, causing CI/CD to run against the previous uat HEAD.

## Decision

Capture the exact merge commit SHA after the scheduled promotion push and pass it as a `workflow_dispatch` input named `sha` to `ci-cd.yml`.

`ci-cd.yml` defines a single effective `BUILD_SHA` as `github.event.inputs.sha || github.sha`, so normal push and PR runs remain unchanged, while dispatched promotion runs check out and deploy the exact promoted merge commit.

## Implementation

- `scheduled-uat-promote.yml` now emits `merge_sha=$(git rev-parse HEAD)` from the merge step when a push occurs.
- The trigger step now runs `gh workflow run ci-cd.yml --ref uat -f sha=${{ steps.merge.outputs.merge_sha }}`.
- `ci-cd.yml` now accepts optional workflow dispatch input `sha`.
- All repository checkout steps in CI/CD use `ref: ${{ env.BUILD_SHA }}`.
- Docker image build and deploy tags use `${{ env.BUILD_SHA }}` so the deployed image tag matches the checked-out commit.

## Validation

Both modified workflow files parse successfully with Python/PyYAML. Push-triggered runs still fall back to `github.sha`; dispatched promotion runs use the explicit `sha` input throughout the pipeline.
