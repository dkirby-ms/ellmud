#!/usr/bin/env bash
# deploy.sh — Deploy Ellmud infrastructure to Azure
# Usage: ./infra/deploy.sh [resource-group] [location] [environment-name]
set -euo pipefail

RESOURCE_GROUP="${1:-ellmud-rg}"
LOCATION="${2:-eastus2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT_NAME="${3:-$(sed -n "s/^param environmentName = '\(.*\)'$/\1/p" "${SCRIPT_DIR}/main.bicepparam" | head -1)}"
DEFAULT_POSTGRES_ADMIN_USERNAME="$(sed -n "s/^param postgresAdminUsername = '\(.*\)'$/\1/p" "${SCRIPT_DIR}/main.bicepparam" | head -1)"
DEFAULT_POSTGRES_DATABASE_NAME="$(sed -n "s/^param postgresDatabaseName = '\(.*\)'$/\1/p" "${SCRIPT_DIR}/main.bicepparam" | head -1)"
CONTAINER_APP_NAME="${CONTAINER_APP_NAME:-ellmud-${ENVIRONMENT_NAME}-app}"
CONFIGURE_GRAFANA_POSTGRES_DATASOURCE="${CONFIGURE_GRAFANA_POSTGRES_DATASOURCE:-false}"

# ─── Preflight checks ───────────────────────────────────────────────────────

if ! command -v az &> /dev/null; then
  echo "❌ Azure CLI (az) is required. Install: https://aka.ms/install-azure-cli"
  exit 1
fi

if [ -z "${POSTGRES_ADMIN_PASSWORD:-}" ]; then
  echo "❌ POSTGRES_ADMIN_PASSWORD environment variable is required."
  echo "   export POSTGRES_ADMIN_PASSWORD='<your-secure-password>'"
  exit 1
fi

if [ -z "${ENVIRONMENT_NAME}" ]; then
  echo "❌ Could not determine environmentName from infra/main.bicepparam."
  echo "   Pass it explicitly: ./infra/deploy.sh <resource-group> <location> <environment-name>"
  exit 1
fi

echo "🏗️  Ellmud Infrastructure Deployment"
echo "   Resource Group: ${RESOURCE_GROUP}"
echo "   Location:       ${LOCATION}"
echo "   Environment:    ${ENVIRONMENT_NAME}"
echo "   Container App:  ${CONTAINER_APP_NAME}"
echo ""

# ─── Ensure resource group exists ────────────────────────────────────────────

echo "📦 Creating resource group (if needed)..."
az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --tags environment=dev project=ellmud managedBy=bicep \
  --output none

CURRENT_IMAGE=""
CURRENT_COMMAND_JSON=""
CURRENT_ARGS_JSON=""

if CURRENT_CONTAINER_SPEC="$(az containerapp show \
  --name "${CONTAINER_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "properties.template.containers[0].{image:image,command:command,args:args}" \
  -o json 2>/dev/null)" && [ -n "${CURRENT_CONTAINER_SPEC}" ] && [ "${CURRENT_CONTAINER_SPEC}" != "null" ]; then
  mapfile -t EXISTING_SPEC < <(CURRENT_CONTAINER_SPEC="${CURRENT_CONTAINER_SPEC}" python3 <<'PYEOF'
import json
import os

spec = json.loads(os.environ['CURRENT_CONTAINER_SPEC'])
if not spec or not spec.get('image'):
    raise SystemExit(0)

print(spec['image'])
print(json.dumps(spec.get('command') or []))
print(json.dumps(spec.get('args') or []))
PYEOF
  )

  if [ "${#EXISTING_SPEC[@]}" -eq 3 ] && [ -n "${EXISTING_SPEC[0]}" ]; then
    CURRENT_IMAGE="${EXISTING_SPEC[0]}"
    CURRENT_COMMAND_JSON="${EXISTING_SPEC[1]}"
    CURRENT_ARGS_JSON="${EXISTING_SPEC[2]}"
    echo "♻️  Preserving existing container app image and entrypoint for ${CONTAINER_APP_NAME}"
  fi
else
  echo "🆕 No existing container app found for ${CONTAINER_APP_NAME}; bootstrap placeholder will be used on first deploy"
fi

# ─── Deploy Bicep ────────────────────────────────────────────────────────────

echo "🚀 Deploying Bicep templates..."
DEPLOYMENT_NAME="ellmud-$(date +%Y%m%d-%H%M%S)"
DEPLOY_ARGS=(
  --resource-group "${RESOURCE_GROUP}"
  --template-file "${SCRIPT_DIR}/main.bicep"
  --parameters "${SCRIPT_DIR}/main.bicepparam"
  --name "${DEPLOYMENT_NAME}"
  --verbose
)

if [ -n "${CURRENT_IMAGE}" ]; then
  DEPLOY_ARGS+=(
    --parameters "containerImage=${CURRENT_IMAGE}"
    --parameters "containerCommand=${CURRENT_COMMAND_JSON}"
    --parameters "containerArgs=${CURRENT_ARGS_JSON}"
  )
fi

az deployment group create "${DEPLOY_ARGS[@]}"

echo ""
echo "✅ Deployment complete!"
echo ""

# ─── Print outputs ───────────────────────────────────────────────────────────

echo "📋 Resource Summary:"
az deployment group show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${DEPLOYMENT_NAME}" \
  --query 'properties.outputs' \
  --output table 2>/dev/null || echo "(outputs available via: az deployment group show --resource-group ${RESOURCE_GROUP} --name ${DEPLOYMENT_NAME} --query properties.outputs)"

echo ""
if [ "${CONFIGURE_GRAFANA_POSTGRES_DATASOURCE}" = "true" ]; then
  echo "📈 Configuring Grafana PostgreSQL data source..."
  GRAFANA_POSTGRES_USER="${GRAFANA_POSTGRES_USER:-${DEFAULT_POSTGRES_ADMIN_USERNAME:-pgadmin}}" \
  GRAFANA_POSTGRES_DATABASE="${GRAFANA_POSTGRES_DATABASE:-${DEFAULT_POSTGRES_DATABASE_NAME:-ellmud}}" \
  POSTGRES_ADMIN_PASSWORD="${POSTGRES_ADMIN_PASSWORD}" \
  "${SCRIPT_DIR}/configure-grafana-postgres-datasource.sh" "${RESOURCE_GROUP}" "${ENVIRONMENT_NAME}"
else
  echo "📈 Grafana PostgreSQL data source not configured automatically."
  echo "   Run: ./infra/configure-grafana-postgres-datasource.sh ${RESOURCE_GROUP} ${ENVIRONMENT_NAME}"
  echo "   Or redeploy with CONFIGURE_GRAFANA_POSTGRES_DATASOURCE=true"
fi
