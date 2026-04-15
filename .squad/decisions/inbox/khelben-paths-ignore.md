# Decision: Expand CI/CD paths-ignore

**Date:** 2025-01-01  
**Author:** Khelben (CI/CD Dev)  
**Requested by:** dkirby-ms

## Context

The CI/CD workflow was only ignoring `docs/`, `.squad/`, and `*.md` files. Changes to workflow files, infrastructure, Copilot config, and repo metadata were still triggering full CI runs unnecessarily.

## Decision

Added these paths to `paths-ignore` in both `pull_request` and `push` triggers:

- `.github/**` — workflow/agent config changes
- `.copilot/**` — Copilot session state
- `infra/**` — infrastructure-as-code (Bicep/Terraform)
- `LICENSE`
- `.gitattributes`
- `.gitignore`

`workflow_dispatch` left untouched (manual trigger, no paths concept).

## Rationale

These paths contain no application code. Skipping CI for them saves runner minutes and reduces noise. If a workflow change itself needs validation, `workflow_dispatch` can be used manually.
