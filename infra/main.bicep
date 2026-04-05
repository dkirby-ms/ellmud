// Ellmud — Main Bicep Orchestrator
// Deploys all infrastructure for the game server
//
// Usage:
//   az deployment group create \
//     --resource-group ellmud-rg \
//     --template-file infra/main.bicep \
//     --parameters infra/main.bicepparam

targetScope = 'resourceGroup'

// ─── Parameters ─────────────────────────────────────────────────────────────

@description('Environment name')
@allowed(['uat', 'prod'])
param environmentName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('PostgreSQL administrator username')
param postgresAdminUsername string = 'pgadmin'

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('PostgreSQL database name')
param postgresDatabaseName string = 'ellmud'

@description('Entra External ID client ID')
param entraClientId string = ''

@description('Entra External ID client secret')
@secure()
param entraClientSecret string = ''

@description('Entra External ID tenant ID (GUID)')
param entraTenantId string = ''

@description('Entra External ID CIAM tenant subdomain (custom domain name, not GUID)')
param entraTenantSubdomain string = ''

@description('OAuth callback URL (must match Entra app registration redirect URI)')
param entraRedirectUri string = ''

@description('Allow local username/password authentication (false for production)')
param allowLocalAuth string = 'false'

@description('Client app URL for OAuth redirects')
param clientUrl string = ''

@description('Azure AI Foundry endpoint URL')
param azureAiEndpoint string = ''

@secure()
@description('Azure AI Foundry API key')
param azureAiKey string = ''

@description('Azure AI deployment name')
param azureAiDeployment string = 'gpt-4o-mini'

@description('Azure AI API version')
param azureAiApiVersion string = '2024-08-01-preview'

@description('Enable LLM narration (false = template-only mode)')
param enableLlmNarration string = 'true'

@secure()
@description('Admin API bearer token (fail-closed when unset)')
param adminToken string = ''

@description('Require authentication to join rooms (true for production)')
param authRequired string = 'true'

// ─── Variables ──────────────────────────────────────────────────────────────

var resourcePrefix = 'ellmud-${environmentName}'
var tags = {
  environment: environmentName
  project: 'ellmud'
  managedBy: 'bicep'
}

// ─── Modules ────────────────────────────────────────────────────────────────

// 1. Monitoring — must deploy first (Container Apps needs Log Analytics)
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    resourcePrefix: resourcePrefix
    location: location
    tags: tags
  }
}

// 2. Container Registry
module acr 'modules/acr.bicep' = {
  name: 'acr'
  params: {
    resourcePrefix: resourcePrefix
    location: location
    tags: tags
  }
}

// 3. PostgreSQL
module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    resourcePrefix: resourcePrefix
    location: location
    tags: tags
    adminUsername: postgresAdminUsername
    adminPassword: postgresAdminPassword
    databaseName: postgresDatabaseName
  }
}

// 4. Container Apps Environment (phase 1 — environment only, no app yet)
module containerAppsEnv 'modules/container-apps.bicep' = {
  name: 'container-apps-env'
  params: {
    resourcePrefix: resourcePrefix
    location: location
    tags: tags
    logAnalyticsCustomerId: monitoring.outputs.logAnalyticsCustomerId
    logAnalyticsSharedKey: monitoring.outputs.logAnalyticsSharedKey
    deployApp: false
    postgresAdminPassword: ''
  }
}

// 5. Redis — deployed as ACA dev service (add-on) inside container-apps module
// Created automatically when redisServiceName is provided to the app module.

// 6. Container Apps Game Server (reuses existing environment, deploys the app)
module containerAppsApp 'modules/container-apps.bicep' = {
  name: 'container-apps-app'
  params: {
    resourcePrefix: resourcePrefix
    location: location
    tags: tags
    existingEnvironmentId: containerAppsEnv.outputs.environmentId
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    postgresServerFqdn: postgres.outputs.serverFqdn
    postgresDatabaseName: postgres.outputs.databaseName
    postgresAdminUsername: postgresAdminUsername
    postgresAdminPassword: postgresAdminPassword
    redisServiceName: '${resourcePrefix}-redis'
    deployApp: true
    entraClientId: entraClientId
    entraClientSecret: entraClientSecret
    entraTenantId: entraTenantId
    entraTenantSubdomain: entraTenantSubdomain
    entraRedirectUri: entraRedirectUri
    allowLocalAuth: allowLocalAuth
    clientUrl: clientUrl
    azureAiEndpoint: azureAiEndpoint
    azureAiKey: azureAiKey
    azureAiDeployment: azureAiDeployment
    azureAiApiVersion: azureAiApiVersion
    enableLlmNarration: enableLlmNarration
    adminToken: adminToken
    authRequired: authRequired
  }
}

// 7. AI Foundry — GPT-4o-mini serverless endpoint
module aiFoundry 'modules/ai-foundry.bicep' = {
  name: 'ai-foundry'
  params: {
    resourcePrefix: resourcePrefix
    location: location
    tags: tags
  }
}

// ─── RBAC: Container App → ACR Pull ─────────────────────────────────────────

// ACR name must be deterministic (not a runtime output) for role assignment scope
var acrNameForRbac = replace('${resourcePrefix}acr', '-', '')

resource acrResourceRef 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrNameForRbac
}

resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, acrNameForRbac, 'AcrPull')
  scope: acrResourceRef
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d' // AcrPull
    )
    principalId: containerAppsApp.outputs.containerAppPrincipalId
    principalType: 'ServicePrincipal'
  }
  dependsOn: [acr]
}

// ─── Outputs ────────────────────────────────────────────────────────────────

output resourceGroupName string = resourceGroup().name
output acrName string = acr.outputs.acrName
output acrLoginServer string = acr.outputs.acrLoginServer
output containerAppName string = containerAppsApp.outputs.containerAppName
output containerAppFqdn string = containerAppsApp.outputs.containerAppFqdn
output containerAppEnvironmentName string = containerAppsEnv.outputs.environmentName
output postgresServerFqdn string = postgres.outputs.serverFqdn
output postgresDatabaseName string = postgres.outputs.databaseName
output aiServicesEndpoint string = aiFoundry.outputs.aiServicesEndpoint
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString
