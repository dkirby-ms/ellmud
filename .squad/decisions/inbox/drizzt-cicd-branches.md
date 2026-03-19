### CI/CD Pipeline — 3-Branch Environment Strategy
**By:** Drizzt (Engine Dev)
**Date:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Commit:** ec83635

**What:** CI/CD workflow updated from single-branch (`main`) to 3-branch strategy:
- `dev` — PRs merge here. Tests only, no cloud deploy.
- `uat` — Push triggers build + deploy to UAT Azure Container App.
- `prod` — Push triggers build + deploy to Prod Azure Container App.

**Key design choices:**
1. GitHub environments (`uat`, `prod`) provide per-environment secrets (`CONTAINER_APP_NAME`, `RESOURCE_GROUP`, `ACR_NAME`, Azure OIDC creds). This means each environment's secrets are configured once in GitHub Settings → Environments.
2. Docker images tagged `ellmud-{env}:{sha}` (e.g., `ellmud-uat:abc1234`, `ellmud-prod:abc1234`) to keep ACR organized.
3. `github.ref_name` used as the environment selector — no matrix, no conditionals. Push triggers already scoped to `[uat, prod]`.
4. Failure issue job now branch-aware (includes branch name in title/body).

**Requires from team:**
- GitHub environments `uat` and `prod` must be created in repo settings with appropriate secrets.
- Secrets needed per environment: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `ACR_NAME`, `CONTAINER_APP_NAME`, `RESOURCE_GROUP`.

**Why:** Team decision to use UAT/Prod only (no dev cloud environment). Local dev stays fully local.
