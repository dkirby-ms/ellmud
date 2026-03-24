// Redis as ACA add-on service (service bind)
// ACA injects REDIS_HOST, REDIS_PORT, REDIS_ENDPOINT into bound consumers

@description('Resource name prefix')
param resourcePrefix string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Container Apps Environment ID')
param containerAppEnvironmentId string

resource redisService 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${resourcePrefix}-redis'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: containerAppEnvironmentId
    configuration: {
      service: {
        type: 'redis'
      }
    }
  }
}

@description('Redis add-on service resource ID (for service binds)')
output redisServiceId string = redisService.id

@description('Redis container app name')
output redisAppName string = redisService.name
