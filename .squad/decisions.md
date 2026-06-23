# Khelben — Azure OpenAI infra wiring

Decision: keep the Azure AI Foundry deployment gated by `deployAiFoundry = false` and route its endpoint/key/deployment into Container Apps only when explicitly enabled.

Rationale: this preserves current UAT/template-only behavior while making the Azure provider path deployable when the team opts in. Container Apps currently passes LLM keys as environment values rather than `secrets`/`secretRef`, so the Azure key was wired consistently and marked secure at the Bicep parameter boundary; a future refactor should move both OpenAI and Azure OpenAI keys to Container App secrets together.

---

---

# Khelben deploy resilience decision

## Context
GitHub issue #508 was a false-alarm CI/CD failure: UAT revision `ellmud-uat-app--0000002` for commit `a557ccb` is already Running and Healthy. The deploy job failed because one transient `az containerapp revision show` connection reset aborted the monitor loop under `bash -e`, then rollback attempted multiple-revision traffic commands against a single-revision Container App.

## Decision
Harden `.github/workflows/ci-cd.yml` deploy-job rollback/monitoring without changing the intended single-revision app mode.

- Capture rollback metadata before deployment: active revision, active image, and `activeRevisionsMode`.
- Wrap deployment-monitor Azure CLI calls in bounded retry-with-backoff helpers. A transient `az`/network failure now logs and retries the poll instead of immediately failing the job.
- Monitor the latest revision until it is Running/RunningAtMaxScale and Healthy (or health is unavailable), failing only on terminal failed running states or timeout.
- Make rollback mode-aware:
  - Single revision mode: redeploy the previously captured image with the existing explicit Node command and target port, then monitor the active rollback revision. No traffic-splitting or multiple-mode-only commands are used.
  - Multiple revision mode: preserve traffic-weight rollback behavior and deactivate the failed revision, both behind `az` retries.
- Do not switch the Container App to multiple mode as a side effect.

## Validation
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd.yml'))"` passed.
- Embedded deploy-job scripts passed `bash -n` after substituting GitHub expressions.
- `shellcheck` was not installed in the environment.

---

---

# PR #506 conflict resolution decision

**Author:** Khelben (CI/CD Dev)  
**Date:** 2026-06-20T16:04:29Z  
**Request:** Make PR #506 (`dev` → `uat`) mergeable without damaging `dev` or violating the promotion model.

## Verification

- `origin/uat` has no tracked `.squad/` files (`git ls-tree -r --name-only origin/uat | grep '^\.squad/'` returned no paths).
- `origin/uat` does retain Squad-adjacent operational files, including `.github/workflows/squad-*.yml`, `.github/agents/squad.agent.md`, and `.copilot/skills/*`.
- A test merge of `origin/uat` into local `dev` produced unmerged paths only at:
  - `.github/workflows/squad-promote.yml` (content conflict)
  - `.squad/templates/copilot-instructions.md` (modify/delete)
  - `.squad/templates/routing.md` (modify/delete)
  - `.squad/templates/scribe-charter.md` (modify/delete)
  - `.squad/templates/squad.agent.md.template` (modify/delete)
- The same test merge also staged many `.squad/` deletions because `uat` intentionally strips that directory. Committing such a merge without restoring them would damage `dev`.
- Recent scheduled `uat` merge commits preserve a zero `.squad/` count in the resulting `uat` tree.
- PR #506's raw diff from `uat` to `dev` includes `.squad/` paths, so a normal GitHub PR merge would introduce `.squad/` content into `uat`.
- `.gitattributes` only has union merge rules for selected `.squad` state files; it does not provide a branch-specific strategy to exclude `.squad/` from PR merges.
- `scheduled-uat-promote.yml` is the existing dev→uat promotion workflow and explicitly strips forbidden paths after merging.

## Decision

Do **not** resolve PR #506 by merging `origin/uat` into `dev` and pushing the merge commit.

That would make the PR technically mergeable only by making `uat` an ancestor of `dev`; the subsequent PR merge would carry `dev`'s tree into `uat`, including `.squad/`, which violates the established stripped-uat model. Resolving the modify/delete conflicts by deleting `.squad/` from `dev` is also invalid because `dev` must retain Squad tooling and state.

The correct promotion path is the strip-based dev→uat workflow, not a raw `dev`→`uat` PR merge carrying the full `dev` tree.

## Workflow conflict note

For `.github/workflows/squad-promote.yml`, the `uat` side is the appropriate downstream version for the current branch model: it promotes `uat` → `prod` via PR and documents that dev→uat is handled by `scheduled-uat-promote.yml`. The `dev` side currently refers to non-existent `preview`/`main` branches, so it is stale for the active `dev`/`uat`/`prod` model. However, updating that file alone would not solve the `.squad/` raw-PR problem.

## Recommended next action

Close or supersede PR #506 as a raw `dev`→`uat` PR and promote via the strip workflow after ensuring allowed workflow files on `dev` match the active branch model. Do not force-push, do not rewrite `dev`, and do not delete `.squad/` from `dev`.

---

---

# Azure OpenAI Transport Provider Selection

Requested by: @dkirby-ms
Author: Volo
Date: 2026-06-20

## Decision

LLM provider resolution is explicit-first, then auto-detect:

1. If `LLM_PROVIDER=azure`, use Azure OpenAI only when `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, and `AZURE_OPENAI_DEPLOYMENT` are all present.
2. If `LLM_PROVIDER=openai`, use the existing OpenAI-compatible path only when `OPENAI_LLM_ENDPOINT` and `OPENAI_LLM_KEY` are present.
3. If `LLM_PROVIDER` is unset, prefer Azure OpenAI when complete Azure config exists; otherwise use OpenAI-compatible config; otherwise remain template-only.

`ENABLE_LLM_NARRATION=false` still overrides all provider selection and forces template-only behavior.

## Rationale

This keeps the existing `OPENAI_LLM_*` path backward-compatible while allowing Azure OpenAI to become the preferred configured provider once its required variables are present. Explicit `LLM_PROVIDER` gives operators a deterministic override during migration or incident response. Azure uses the stable GA API version default `2024-10-21`, with `AZURE_OPENAI_API_VERSION` available for future service changes.

---

# Khelben — Issue 509 AI Foundry endpoint provisioning

Decision: re-enable the `aiFoundry` Bicep module in `infra/main.bicep` and expose `aiFoundry.outputs.aiServicesEndpoint` as a stack output, without wiring that endpoint into Container Apps for this issue.

Rationale: the app's Azure OpenAI provider path requires a complete Azure configuration (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, and `AZURE_OPENAI_DEPLOYMENT`). The current module exposes the endpoint and account name but does not settle key/managed-identity auth or deployment env-var wiring, so forcing only `OPENAI_LLM_ENDPOINT`/container wiring would be incomplete and could create a misleading runtime configuration. This keeps the real AI Services account and `gpt-4o-mini` GlobalStandard deployment provisioned while leaving container auth/wiring to the follow-up auth decision.

Region finding: Microsoft Foundry region availability lists `gpt-4o-mini` version `2024-07-18` as available for Global Standard in both `eastus2` and `centralus`. The module still uses the deployment `location` parameter for the regional AI Services account and `GlobalStandard` for model routing; no region was changed in this issue.


---

### 2026-06-23T10:54: User directive — Redis always enabled
**By:** dkirby-ms (via Copilot)
**What:** Redis must be enabled in all deploys regardless of replica count. Disabling the Redis feature flags (REDIS_CACHE_ENABLED / REDIS_PRESENCE_ENABLED / REDIS_DRIVER_ENABLED) to pass ACA health checks is rejected as a hack. The real fix is to make Redis connect reliably and not block server startup.
**Why:** User explicitly rejected the Redis-disable workaround introduced in PR #527 / commit 6c262586. Root cause to fix: ACA Redis dev-service add-on connection refused at boot (likely service-bind env var mismatch vs what the server reads) + server blocking boot on Redis instead of connecting lazily/async.
**References:** PR #527, commit 6c262586, infra/modules/container-apps.bicep:200-202, original Redis wiring commit 0891670

---

# Decision: Redis must not block server boot or ACA health

Redis remains enabled for deploys, but server startup no longer waits for Redis to accept connections before binding HTTP/Colyseus or serving `/health`.

Changes made in `packages/server`:
- Narration cache now returns a Redis-backed cache immediately when `REDIS_CACHE_ENABLED=true`; it connects/reconnects in the background with bounded connect/operation timeouts and no permanent in-memory fallback.
- Colyseus presence and matchmaker driver now use non-blocking Redis wrappers: local behavior is available during Redis cold start, Redis clients retry asynchronously, and subscriptions/room listings mirror into Redis once connected.
- `/health` remains HTTP 200 `status: ok` while Redis is connecting, with Redis status exposed separately as `redis-connecting`, `redis-connected`, etc.

Rationale: ACA revision health depends on the process listening promptly. Redis connection-refused or slow cold start must not delay `server.listen()` or health responses, while Redis must remain enabled and retry in the background for multi-replica deploys.

---

# Prevent ACA rollback/redeploy to bootstrap Alpine image

**Author:** Khelben  
**Date:** 2026-06-23  
**Status:** Proposed for Scribe merge

## Decision

Harden the ACA deployment paths so `node:22-alpine` remains a greenfield-only bootstrap placeholder and is never accepted as a rollback target for Ellmud.

## Rationale

The failed UAT run captured `node:22-alpine` as the previous active image, deployed the correct ACR app image, timed out while the app revision was still activating, and then rollback re-applied the placeholder. Live ACA/Log Analytics checks showed the app image used port 2567 and eventually reached server startup after the workflow timeout; startup was delayed by Redis being enabled while the ACA Redis endpoint refused connections.

## Implementation

- CI/CD rollback now refuses previous images unless they match `*.azurecr.io/ellmud-*:<tag>`.
- CI/CD disables Redis env flags for the current single-replica ACA deployment and waits up to 12 minutes for activation.
- `infra/main.bicep` requires an explicit `containerImage` so direct brownfield Bicep deployments cannot silently reset ACA to `node:22-alpine`.
- `infra/deploy.sh` always passes either the live image/entrypoint or the greenfield placeholder explicitly.

## Follow-up

Re-enable ACA Redis flags only after the Redis service bind/endpoint is verified healthy during cold start.

---

# Khelben — Redis enabled and ACA service bind guarded

**Date:** 2026-06-23T11:18:00-05:00
**Branch:** squad/fix-aca-alpine-placeholder
**Requested by:** dkirby-ms

## Decision

Keep Redis enabled in every deploy path. The Redis-disable workaround from commit 6c262586 is reverted only for the three runtime flags:

- `REDIS_PRESENCE_ENABLED=true`
- `REDIS_CACHE_ENABLED=true`
- `REDIS_DRIVER_ENABLED=true`

The rollback guard, image/entrypoint preservation, idempotent infra deploy behavior, and extended revision monitor from 6c262586 are preserved.

## Service-bind finding

The Redis connection path remains Bicep-owned: `infra/modules/container-apps.bicep` creates the ACA Redis dev-service add-on before the app and sets `properties.template.serviceBinds` with `name: 'redis'`. Live UAT inspection showed the app currently has the Redis bind:

```bash
az containerapp show --name ellmud-uat-app --resource-group rg-ellmud --query properties.template.serviceBinds -o json
```

Because `az containerapp update` should preserve the Bicep-owned template service bind, the workflow now verifies immediately after image deployment, and also after single-revision rollback updates, that `properties.template.serviceBinds[?name=='redis']` is still present. If it is missing, the deploy fails instead of silently creating a revision that would lack service-bind-injected `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`.

## Validation

- `az bicep build --file infra/main.bicep` succeeded.
- Workflow YAML parsed successfully with Python/PyYAML.
