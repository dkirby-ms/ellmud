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

// 5. Redis — managed as ACA add-on via CLI (az containerapp add-on redis create)
// Not deployed via Bicep. Service bind configured via CLI.

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
    deployApp: true
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
