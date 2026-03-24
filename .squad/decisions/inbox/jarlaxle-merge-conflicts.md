# Decision: Dev branch is canonical for merge conflicts

**By:** Jarlaxle (Systems Dev)
**Date:** 2025-07-18
**Context:** PR #158 merge conflict resolution (dev → uat, 19 files)

## Decision

When resolving merge conflicts between `dev` and `uat`, prefer dev's version as the canonical source. Dev is the active development branch with the superset of changes.

## Rationale

- Dev had 60 lint fixes vs uat's 27 — most of uat's fixes were a subset of dev's
- Dev uses cleaner lint patterns: `void expr` over `// eslint-disable-next-line`, explicit types over `any`
- Dev has newer features (InMemoryUserStore, useDevAutoLogin, providerIndex) that uat lacks
- UAT's lint sweep accidentally duplicated code blocks that dev had consolidated

## Impact

- Future merges between dev and uat should follow the same principle: dev is the source of truth
- Lint fixes should be coordinated to avoid parallel sweeps on both branches
- Squad docs (decisions.md) are append-only — union merge when both sides add entries
