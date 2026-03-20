// Container Apps Environment + Game Server Container App
// Consumption tier, 1 vCPU / 2 GiB, min 1 max 1 replica (Phase 1)
//
// When existingEnvironmentId is empty, creates a new Container Apps Environment.
// When existingEnvironmentId is provided, deploys the app into that environment.

@description('Resource name prefix')
param resourcePrefix string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Log Analytics workspace customer ID (required when creating environment)')
param logAnalyticsCustomerId string = ''

@description('Log Analytics workspace shared key (required when creating environment)')
@secure()
param logAnalyticsSharedKey string = ''

@description('Existing Container Apps Environment ID (skips environment creation)')
param existingEnvironmentId string = ''

@description('Application Insights connection string')
param appInsightsConnectionString string = ''

@description('PostgreSQL server FQDN')
param postgresServerFqdn string = ''

@description('PostgreSQL database name')
param postgresDatabaseName string = ''

@description('PostgreSQL admin username')
param postgresAdminUsername string = ''

@description('PostgreSQL admin password')
@secure()
param postgresAdminPassword string = ''

@description('Redis host (internal Container Apps FQDN)')
param redisHost string = ''

@description('Deploy the game server container app (false = environment only)')
param deployApp bool = false

var createEnvironment = existingEnvironmentId == ''

// Bootstrap placeholder — replaced by real image after first CI push.
// Listens on 2567 (Colyseus default) so ingress config stays stable.
var bootstrapImage = 'node:22-alpine'
var bootstrapCommand = 'node -e "require(\'http\').createServer((q,s)=>{s.writeHead(200,{\'Content-Type\':\'application/json\'});s.end(JSON.stringify({status:\'ok\',mode:\'placeholder\'}))}).listen(2567,\'0.0.0.0\')"'

resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = if (createEnvironment) {
  name: '${resourcePrefix}-cae'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsSharedKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

var resolvedEnvironmentId = createEnvironment ? containerAppEnv.id : existingEnvironmentId

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = if (deployApp) {
  name: '${resourcePrefix}-app'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: resolvedEnvironmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 2567
        transport: 'http'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
    }
    template: {
      containers: [
        {
          name: 'ellmud'
          image: bootstrapImage
          command: ['/bin/sh', '-c']
          args: [bootstrapCommand]
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '2567' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
            { name: 'DATABASE_URL', value: 'postgresql://${postgresAdminUsername}:${postgresAdminPassword}@${postgresServerFqdn}:5432/${postgresDatabaseName}?sslmode=require' }
            { name: 'REDIS_URL', value: 'redis://${redisHost}:6379' }
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

@description('Container Apps Environment ID')
output environmentId string = resolvedEnvironmentId

@description('Container Apps Environment name')
output environmentName string = createEnvironment ? containerAppEnv.name : last(split(existingEnvironmentId, '/'))

@description('Container App name')
output containerAppName string = deployApp ? containerApp!.name : ''

@description('Container App FQDN')
output containerAppFqdn string = deployApp ? containerApp!.properties.configuration.ingress.fqdn : ''

@description('Container App managed identity principal ID')
output containerAppPrincipalId string = deployApp ? containerApp!.identity.principalId : ''
