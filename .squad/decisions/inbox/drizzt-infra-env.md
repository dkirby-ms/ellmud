### Bicep Env Var Audit & Fix — Container Apps Template
**By:** Drizzt (Engine Dev)
**Date:** 2026-04-06

## Decision

Aligned the Container Apps Bicep template (`infra/modules/container-apps.bicep`) with all env vars the server actually reads from `config.ts` and `admin/middleware.ts`.

## Changes

1. **Renamed** `MAX_PLAYERS_PER_SHARD` → `MAX_PLAYERS_PER_ZONE` (was silently injected but never read since migration 013)
2. **Added Azure AI vars:** `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY` (@secure), `AZURE_AI_DEPLOYMENT` (default: gpt-4o-mini), `AZURE_AI_API_VERSION` (default: 2024-08-01-preview)
3. **Added** `ENABLE_LLM_NARRATION` (default: true)
4. **Added** `ADMIN_TOKEN` (@secure, default: empty — fail-closed)
5. **Added** `AUTH_REQUIRED` (default: true — explicit for prod clarity)
6. All new params flow through `main.bicep` → `container-apps.bicep`. `main.bicepparam` has commented placeholders for Azure AI and admin token.

## Rationale

- Secrets use `@secure()` so they don't leak in deployment logs or ARM template outputs
- Azure AI vars default to empty so deployments without LLM credentials still work (template-only narration mode)
- `AUTH_REQUIRED=true` is the config.ts default, but making it explicit in Bicep prevents surprises if the code default ever changes

## Team Impact

- **Jarlaxle/Volo:** No code changes — this is infra-only. LLM narration will now actually receive Azure credentials in prod.
- **Minsc:** Admin dashboard will work in prod once `ADMIN_TOKEN` is set in the deployment pipeline.
- **All:** Any new env vars read by the server should be added to Bicep at the same time as the code change.
