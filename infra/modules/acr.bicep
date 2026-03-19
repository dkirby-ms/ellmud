// Azure Container Registry — Basic SKU
// Managed identity pull configured via RBAC in main.bicep

@description('Resource name prefix')
param resourcePrefix string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

// ACR names must be alphanumeric only
var acrName = replace('${resourcePrefix}acr', '-', '')

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

@description('ACR resource name')
output acrName string = acr.name

@description('ACR login server FQDN')
output acrLoginServer string = acr.properties.loginServer

@description('ACR resource ID')
output acrId string = acr.id
