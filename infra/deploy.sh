#!/usr/bin/env bash
# deploy.sh — Deploy Ellmud infrastructure to Azure
# Usage: ./infra/deploy.sh [resource-group] [location]
set -euo pipefail

RESOURCE_GROUP="${1:-ellmud-rg}"
LOCATION="${2:-eastus2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

echo "🏗️  Ellmud Infrastructure Deployment"
echo "   Resource Group: ${RESOURCE_GROUP}"
echo "   Location:       ${LOCATION}"
echo ""

# ─── Ensure resource group exists ────────────────────────────────────────────

echo "📦 Creating resource group (if needed)..."
az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --tags environment=dev project=ellmud managedBy=bicep \
  --output none

# ─── Deploy Bicep ────────────────────────────────────────────────────────────

echo "🚀 Deploying Bicep templates..."
az deployment group create \
  --resource-group "${RESOURCE_GROUP}" \
  --template-file "${SCRIPT_DIR}/main.bicep" \
  --parameters "${SCRIPT_DIR}/main.bicepparam" \
  --name "ellmud-$(date +%Y%m%d-%H%M%S)" \
  --verbose

echo ""
echo "✅ Deployment complete!"
echo ""

# ─── Print outputs ───────────────────────────────────────────────────────────

echo "📋 Resource Summary:"
az deployment group show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "$(az deployment group list --resource-group "${RESOURCE_GROUP}" --query '[0].name' -o tsv)" \
  --query 'properties.outputs' \
  --output table 2>/dev/null || echo "(outputs available via: az deployment group show --resource-group ${RESOURCE_GROUP} --name <deployment-name> --query properties.outputs)"
