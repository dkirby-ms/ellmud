// Redis as unmanaged container in Container Apps
// Not Azure Cache for Redis — per architecture decision (retiring Sept 2028)

@description('Resource name prefix')
param resourcePrefix string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Container Apps Environment ID')
param containerAppEnvironmentId string

resource redisApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${resourcePrefix}-redis'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: containerAppEnvironmentId
    configuration: {
      ingress: {
        external: false
        targetPort: 6379
        transport: 'tcp'
        exposedPort: 6379
      }
    }
    template: {
      containers: [
        {
          name: 'redis'
          image: 'redis:7-alpine'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          command: [
            'redis-server'
            '--maxmemory'
            '256mb'
            '--maxmemory-policy'
            'allkeys-lru'
            '--save'
            ''
            '--appendonly'
            'no'
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

@description('Redis internal FQDN')
output redisHost string = redisApp.properties.configuration.ingress.fqdn

@description('Redis container app name')
output redisAppName string = redisApp.name
