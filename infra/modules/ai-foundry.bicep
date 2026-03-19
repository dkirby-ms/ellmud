// Azure AI Foundry — Serverless endpoint for GPT-4o-mini
// Phase 1: single model deployment for LLM narration layer

@description('Resource name prefix')
param resourcePrefix string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

// Azure AI Services account (required for serverless model deployments)
resource aiServicesAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${resourcePrefix}-ai-services'
  location: location
  tags: tags
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${resourcePrefix}-ai-services'
    publicNetworkAccess: 'Enabled'
  }
}

// GPT-4o-mini serverless deployment
resource gpt4oMiniDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  name: 'gpt-4o-mini'
  parent: aiServicesAccount
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
  }
}

@description('AI Services endpoint')
output aiServicesEndpoint string = aiServicesAccount.properties.endpoint

@description('AI Services account name')
output aiServicesAccountName string = aiServicesAccount.name
