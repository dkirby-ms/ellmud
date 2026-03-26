### CI Security Audit Gate Added
**By:** Jarlaxle (Systems Dev)
**Date:** 2026-07-26
**PR context:** Add npm audit to CI pipeline

**What:**
Added `npm audit --audit-level=high` as a build gate in `ci-cd.yml`. Runs in the `build-and-test` job immediately after `npm ci`. Fails the pipeline on HIGH or CRITICAL severity vulnerabilities only — low and moderate are allowed through.

**Why:**
- Supply-chain security: catches known-vulnerable dependencies before they reach UAT/prod.
- Positioned early in the pipeline (before build/lint/test) so it fails fast.
- Threshold set to high to avoid noisy false-positive blocks from low-severity advisories.

**Impact:**
- Any PR or push to uat/prod with a high/critical npm advisory will be blocked.
- If a transitive dependency introduces a high-severity vuln, the team will need to either upgrade, replace, or use `npm audit fix` before merging.
- Current state: 0 vulnerabilities. Gate is clean.
