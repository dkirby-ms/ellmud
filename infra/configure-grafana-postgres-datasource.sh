#!/usr/bin/env bash
# configure-grafana-postgres-datasource.sh — create/update the PostgreSQL data source in Azure Managed Grafana
# Usage: ./infra/configure-grafana-postgres-datasource.sh [resource-group] [environment-name]
set -euo pipefail

RESOURCE_GROUP="${1:-${RESOURCE_GROUP:-rg-ellmud}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT_NAME="${2:-$(sed -n "s/^param environmentName = '\(.*\)'$/\1/p" "${SCRIPT_DIR}/main.bicepparam" | head -1)}"
DEFAULT_POSTGRES_USER="$(sed -n "s/^param postgresAdminUsername = '\(.*\)'$/\1/p" "${SCRIPT_DIR}/main.bicepparam" | head -1)"
DEFAULT_POSTGRES_DATABASE="$(sed -n "s/^param postgresDatabaseName = '\(.*\)'$/\1/p" "${SCRIPT_DIR}/main.bicepparam" | head -1)"

GRAFANA_NAME="${GRAFANA_NAME:-ellmud-${ENVIRONMENT_NAME}-grafana}"
POSTGRES_SERVER_NAME="${POSTGRES_SERVER_NAME:-ellmud-${ENVIRONMENT_NAME}-pg}"
DATASOURCE_NAME="${GRAFANA_POSTGRES_DATASOURCE_NAME:-Ellmud PostgreSQL}"
POSTGRES_USER="${GRAFANA_POSTGRES_USER:-${DEFAULT_POSTGRES_USER:-pgadmin}}"
POSTGRES_DATABASE="${GRAFANA_POSTGRES_DATABASE:-${DEFAULT_POSTGRES_DATABASE:-ellmud}}"
POSTGRES_PASSWORD="${GRAFANA_POSTGRES_PASSWORD:-${POSTGRES_ADMIN_PASSWORD:-}}"
POSTGRES_PORT="${GRAFANA_POSTGRES_PORT:-5432}"
POSTGRES_SSLMODE="${GRAFANA_POSTGRES_SSLMODE:-require}"
POSTGRES_VERSION="${GRAFANA_POSTGRES_VERSION:-1500}"

run_az() {
  AZURE_EXTENSION_USE_DYNAMIC_INSTALL=yes_without_prompt az "$@"
}

if ! command -v az >/dev/null 2>&1; then
  echo "❌ Azure CLI (az) is required. Install: https://aka.ms/install-azure-cli"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ python3 is required to build the Grafana data source definition."
  exit 1
fi

if [ -z "${ENVIRONMENT_NAME}" ]; then
  echo "❌ Could not determine environmentName from infra/main.bicepparam."
  echo "   Pass it explicitly: ./infra/configure-grafana-postgres-datasource.sh <resource-group> <environment-name>"
  exit 1
fi

if [ -z "${POSTGRES_PASSWORD}" ]; then
  echo "❌ GRAFANA_POSTGRES_PASSWORD or POSTGRES_ADMIN_PASSWORD must be set."
  echo "   export POSTGRES_ADMIN_PASSWORD='<your-secure-password>'"
  exit 1
fi

POSTGRES_HOST="${GRAFANA_POSTGRES_HOST:-$(run_az postgres flexible-server show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${POSTGRES_SERVER_NAME}" \
  --query fullyQualifiedDomainName \
  -o tsv)}"

run_az grafana show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${GRAFANA_NAME}" \
  --only-show-errors \
  --query name \
  -o tsv >/dev/null

DATASOURCE_DEFINITION="$(
  DATASOURCE_NAME="${DATASOURCE_NAME}" \
  POSTGRES_HOST="${POSTGRES_HOST}" \
  POSTGRES_PORT="${POSTGRES_PORT}" \
  POSTGRES_DATABASE="${POSTGRES_DATABASE}" \
  POSTGRES_USER="${POSTGRES_USER}" \
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  POSTGRES_SSLMODE="${POSTGRES_SSLMODE}" \
  POSTGRES_VERSION="${POSTGRES_VERSION}" \
  python3 <<'PYEOF'
import json
import os

print(json.dumps({
    'name': os.environ['DATASOURCE_NAME'],
    'type': 'postgres',
    'access': 'proxy',
    'url': f"{os.environ['POSTGRES_HOST']}:{os.environ['POSTGRES_PORT']}",
    'database': os.environ['POSTGRES_DATABASE'],
    'user': os.environ['POSTGRES_USER'],
    'isDefault': False,
    'jsonData': {
        'postgresVersion': int(os.environ['POSTGRES_VERSION']),
        'sslmode': os.environ['POSTGRES_SSLMODE'],
        'timescaledb': False,
    },
    'secureJsonData': {
        'password': os.environ['POSTGRES_PASSWORD'],
    },
}))
PYEOF
)"

if run_az grafana data-source show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${GRAFANA_NAME}" \
  --data-source "${DATASOURCE_NAME}" \
  --only-show-errors >/dev/null 2>&1; then
  run_az grafana data-source update \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${GRAFANA_NAME}" \
    --data-source "${DATASOURCE_NAME}" \
    --definition "${DATASOURCE_DEFINITION}" \
    --only-show-errors >/dev/null
  ACTION="Updated"
else
  run_az grafana data-source create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${GRAFANA_NAME}" \
    --definition "${DATASOURCE_DEFINITION}" \
    --only-show-errors >/dev/null
  ACTION="Created"
fi

echo "✅ ${ACTION} Grafana data source '${DATASOURCE_NAME}' (${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE})."
echo "   Uses user '${POSTGRES_USER}' with SSL mode '${POSTGRES_SSLMODE}'."
echo "   Requires your Azure identity to have Grafana Editor/Admin access on ${GRAFANA_NAME}."
