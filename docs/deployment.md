# Ellmud — Deployment Guide

How to deploy the Ellmud game server infrastructure from scratch on Azure.

## Prerequisites

- [Azure CLI](https://aka.ms/install-azure-cli) v2.60+ installed and logged in (`az login`)
- An Azure subscription with Contributor access
- Azure AI Services access (for GPT-4o-mini deployment)

## Architecture Overview

All resources deploy into a single resource group in **East US 2** (default):

| Resource | Azure Service | SKU / Tier |
|----------|--------------|------------|
| Game Server | Container Apps | Consumption (1 vCPU / 2 GiB) |
| Database | PostgreSQL Flexible Server | Burstable B1ms, 32 GB |
| Cache | Redis container (in Container Apps) | 0.25 vCPU / 0.5 GiB |
| AI | Azure AI Services | GPT-4o-mini (GlobalStandard) |
| Registry | Azure Container Registry | Basic |
| Monitoring | Application Insights + Log Analytics | Free / PerGB2018 |

## Environments

Two environments are supported: **uat** and **prod**. There is no dev environment — local development uses local services.

Set the `environmentName` parameter in `main.bicepparam` to `uat` or `prod`.

## Quick Start

```bash
# 1. Set your PostgreSQL password
export POSTGRES_ADMIN_PASSWORD='<choose-a-secure-password>'

# 2. Run the deployment script
chmod +x infra/deploy.sh
./infra/deploy.sh
```

This creates resource group `ellmud-rg` in `eastus2` and deploys all infrastructure.

### Custom resource group or region

```bash
./infra/deploy.sh my-resource-group westus2
```

## Manual Deployment

If you prefer to run the Azure CLI commands directly:

```bash
# Create resource group
az group create --name ellmud-rg --location eastus2

# Deploy infrastructure
export POSTGRES_ADMIN_PASSWORD='<your-password>'
az deployment group create \
  --resource-group ellmud-rg \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam
```

## File Structure

```
infra/
  main.bicep              # Orchestrator — wires all modules together
  main.bicepparam         # Parameter file (region, names, env vars)
  deploy.sh               # One-command deployment script
  setup-gh-environments.sh # GitHub environment + secrets setup
  modules/
    monitoring.bicep       # Application Insights + Log Analytics
    acr.bicep              # Azure Container Registry (Basic)
    postgres.bicep         # PostgreSQL Flexible Server (B1ms, 32 GB)
    container-apps.bicep   # Container Apps Environment + game server app
    redis.bicep            # Redis container (unmanaged, in Container Apps)
    ai-foundry.bicep       # Azure AI Services + GPT-4o-mini deployment
```

## Deployment Order

The orchestrator (`main.bicep`) handles dependencies automatically:

1. **Monitoring** — Log Analytics + App Insights (needed by Container Apps)
2. **ACR** — Container Registry (independent)
3. **PostgreSQL** — Database (independent)
4. **Container Apps Environment** — hosting platform (needs Log Analytics)
5. **Redis** — cache container (needs Container Apps Environment)
6. **Game Server App** — reuses the environment, wired to Postgres + Redis
7. **AI Foundry** — GPT-4o-mini endpoint (independent)
8. **RBAC** — ACR Pull role for the Container App's managed identity

## Resource Naming Convention

All resources follow the pattern `ellmud-{env}-{resource-type}`:

| Resource | Name Pattern | Example (UAT) |
|----------|-------------|---------|
| Resource Group | `ellmud-rg` | `ellmud-rg` |
| Container App | `ellmud-{env}-app` | `ellmud-uat-app` |
| Container App Env | `ellmud-{env}-cae` | `ellmud-uat-cae` |
| PostgreSQL | `ellmud-{env}-pg` | `ellmud-uat-pg` |
| Redis | `ellmud-{env}-redis` | `ellmud-uat-redis` |
| ACR | `ellmud{env}acr` | `ellmuduatacr` |
| App Insights | `ellmud-{env}-ai` | `ellmud-uat-ai` |
| Log Analytics | `ellmud-{env}-logs` | `ellmud-uat-logs` |
| Grafana | `ellmud-{env}-grafana` | `ellmud-uat-grafana` |
| AI Services | `ellmud-{env}-ai-services` | `ellmud-uat-ai-services` |

## Environment Variables

The game server container receives these environment variables automatically:

| Variable | Source | Description |
|----------|--------|-------------|
| `NODE_ENV` | Static | `production` |
| `PORT` | Static | `2567` (Colyseus default) |
| `DATABASE_URL` | PostgreSQL module | Full connection string with SSL |
| `REDIS_URL` | Redis module | `redis://<redis-fqdn>:6379` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Monitoring module | App Insights telemetry |

## Post-Deployment

After infrastructure is deployed:

1. **Push a container image** — CI/CD will build and push to ACR, then update the Container App
2. **Verify health** — The bootstrap placeholder responds on `/` with `{"status":"ok","mode":"placeholder"}`
3. **Check logs** — `az containerapp logs show --name ellmud-uat-app --resource-group ellmud-rg`
4. **Open Grafana** — use the deployment output `grafanaEndpoint`; the instance can read Azure Monitor/App Insights data through its managed identity's `Monitoring Reader` role on the resource group

## GitHub Environments Setup

For CI/CD, run the interactive setup script to configure GitHub environment secrets:

```bash
chmod +x infra/setup-gh-environments.sh
./infra/setup-gh-environments.sh
```

This creates `uat` and `prod` environments in GitHub with the required Azure secrets.

## Tearing Down

```bash
az group delete --name ellmud-rg --yes --no-wait
```

## Phase 1 Constraints

- **Single replica** — `minReplicas: 1, maxReplicas: 1` (no autoscaling)
- **Redis is ephemeral** — no persistence (AOF/RDB disabled), used for Colyseus presence only
- **No custom domain** — uses Container Apps default FQDN
- **No Key Vault** — secrets passed directly for simplicity; add Key Vault in Phase 2
