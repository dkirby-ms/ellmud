# Khelben — CI/CD Dev History

## Core Context

- Ellmud infra/deploy owner for Bicep, Azure Container Apps, GitHub Actions, promotion flows, Docker, monitoring, and environment wiring.
- Repo uses `dev → uat → prod`; game server listens on port 2567.
- Common validation: `npm run build`, `npx vitest run`, `az bicep build --file infra/main.bicep`, and YAML parsing for workflow edits.

## Durable CI/CD and infra learnings

- Docker runtime `npm ci --omit=dev` must use `--ignore-scripts` so the `prepare` script does not require dev-only Husky.
- `workflow_dispatch` needs explicit handling in workflow `if:` expressions and changelog extraction; merge-based promotions should read commits from the second parent rather than falling back to stale `CHANGELOG.md` content.
- Protected prod promotion must use PRs, not force pushes. UAT/prod promotion flows strip forbidden paths such as `.squad/` from downstream branches.
- `infra/modules/container-apps.bicep` is the source of truth for ACA runtime env injection; new deploy toggles flow through `infra/main.bicep`, `infra/main.bicepparam`, and docs/examples as needed.
- ACA bootstrap image `node:22-alpine` is greenfield-only. Brownfield infra redeploys and rollback paths must preserve or validate the live ACR image/entrypoint instead of reapplying the placeholder.
- Redis must remain enabled in deploys, but app startup and `/health` must not block on Redis cold start. CI/CD should guard that the ACA Redis service bind remains present after deploy/rollback.
- Managed Grafana is provisioned by Bicep, but PostgreSQL datasource wiring uses post-deploy `az grafana data-source create/update`; Grafana needs read RBAC, while App Insights ingestion uses connection strings.

## Recent history

### 2026-06-23T08:07:33-05:00: Issue #509 AI Foundry endpoint provisioning

- Re-enabled the `aiFoundry` module and `aiServicesEndpoint` output in `infra/main.bicep`; PR #525 closed issue #509.
- Validated with `az bicep build --file infra/main.bicep`.
- Deferred Container App LLM endpoint/auth wiring until the #510 auth decision.

### 2026-06-23T11:22:00Z: ACA placeholder rollback and Redis bind guards

- PR #527 preserved live ACR images, rejected placeholder rollback targets, extended ACA revision monitoring, kept Redis flags enabled, and failed deploy/rollback if the ACA Redis service bind was missing.

### 2026-06-23T12:10:00Z: Issue #510 managed-identity LLM infra wiring

- Container Apps now receive Azure OpenAI config via `LLM_PROVIDER=azure`, `AZURE_OPENAI_ENDPOINT` from `aiServicesEndpoint`, `AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini`, `AZURE_OPENAI_API_VERSION=2024-10-21`, and `ENABLE_LLM_NARRATION=true`.
- The Azure LLM path uses ACA system-assigned managed identity plus Cognitive Services OpenAI User; no LLM API key is wired in Bicep/GitHub Actions for this path.
- Open follow-up: evaluate `ai-foundry.bicep` hardening for local key auth and public network access.
