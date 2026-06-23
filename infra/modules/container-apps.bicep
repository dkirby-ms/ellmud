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

@description('Redis add-on service name (deployed as ACA dev service, used for service bind)')
param redisServiceName string = ''

@description('Deploy the game server container app (false = environment only)')
param deployApp bool = false

@description('Container image to run (defaults to bootstrap placeholder until CI/CD deploys the real image)')
param containerImage string = 'node:22-alpine'

@description('Container command array (defaults to the bootstrap placeholder entrypoint)')
param containerCommand array = [
  '/bin/sh'
  '-c'
]

@description('Container args array (defaults to the bootstrap placeholder HTTP responder)')
param containerArgs array = [
  'node -e "require(\'http\').createServer((q,s)=>{s.writeHead(200,{\'Content-Type\':\'application/json\'});s.end(JSON.stringify({status:\'ok\',mode:\'placeholder\'}))}).listen(2567,\'0.0.0.0\')"'
]

@description('Entra External ID client ID')
param entraClientId string = ''

@secure()
@description('Entra External ID client secret')
param entraClientSecret string = ''

@description('Entra External ID tenant ID')
param entraTenantId string = ''

@description('Entra External ID CIAM tenant subdomain (custom domain name, not GUID)')
param entraTenantSubdomain string = ''

@description('OAuth callback URL')
param entraRedirectUri string = ''

@description('Allow local username/password authentication')
param allowLocalAuth string = 'false'

@description('Client app URL for OAuth redirects (e.g. https://ellmud-test.kirbytoso.xyz)')
param clientUrl string = ''

@description('OpenAI-compatible LLM endpoint URL (OpenAI, Azure OpenAI, LM Studio, etc.)')
param openaiLlmEndpoint string = ''

@secure()
@description('OpenAI-compatible LLM API key')
param openaiLlmKey string = ''

@description('OpenAI-compatible LLM model name')
param openaiLlmModel string = 'gpt-4o'

@description('Enable LLM narration (false = template-only mode)')
param enableLlmNarration string = 'true'

@secure()
@description('Admin API bearer token (fail-closed when unset)')
param adminToken string = ''

@description('Require authentication to join rooms')
param authRequired string = 'true'

var createEnvironment = existingEnvironmentId == ''
var containerAppName = '${resourcePrefix}-app'

// Bootstrap defaults keep first deploys greenfield-safe until CI/CD publishes
// the real server image. The root template requires an explicit image so
// brownfield redeploys cannot silently reset ACA to this placeholder.
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

// Redis dev service (ACA add-on) — created before the app so service bind works
resource redisService 'Microsoft.App/containerApps@2024-03-01' = if (deployApp && redisServiceName != '') {
  name: redisServiceName
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: resolvedEnvironmentId
    configuration: {
      service: {
        type: 'redis'
      }
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = if (deployApp) {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  dependsOn: [
    redisService
  ]
  properties: {
    managedEnvironmentId: resolvedEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 2567
        transport: 'http'
        allowInsecure: false
        stickySessions: {
          affinity: 'sticky'
        }
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
    }
    template: {
      serviceBinds: redisServiceName != '' ? [
        {
          serviceId: resourceId('Microsoft.App/containerApps', redisServiceName)
          name: 'redis'
        }
      ] : []
      containers: [
        {
          name: 'ellmud'
          image: containerImage
          command: empty(containerCommand) ? null : containerCommand
          args: empty(containerArgs) ? null : containerArgs
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '2567' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
            { name: 'DATABASE_URL', value: 'postgresql://${postgresAdminUsername}:${postgresAdminPassword}@${postgresServerFqdn}:5432/${postgresDatabaseName}?sslmode=require' }
            { name: 'REDIS_CACHE_ENABLED', value: 'false' }
            { name: 'REDIS_PRESENCE_ENABLED', value: 'false' }
            { name: 'REDIS_DRIVER_ENABLED', value: 'false' }
            { name: 'ENTRA_CLIENT_ID', value: entraClientId }
            { name: 'ENTRA_CLIENT_SECRET', value: entraClientSecret }
            { name: 'ENTRA_TENANT_ID', value: entraTenantId }
            { name: 'ENTRA_TENANT_SUBDOMAIN', value: entraTenantSubdomain }
            { name: 'ENTRA_REDIRECT_URI', value: entraRedirectUri }
            { name: 'ALLOW_LOCAL_AUTH', value: allowLocalAuth }
            { name: 'CLIENT_URL', value: clientUrl }
            { name: 'AUTH_REQUIRED', value: authRequired }
            { name: 'OPENAI_LLM_ENDPOINT', value: openaiLlmEndpoint }
            { name: 'OPENAI_LLM_KEY', value: openaiLlmKey }
            { name: 'OPENAI_LLM_MODEL', value: openaiLlmModel }
            { name: 'ENABLE_LLM_NARRATION', value: enableLlmNarration }
            { name: 'ADMIN_TOKEN', value: adminToken }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 4
        rules: [
          {
            name: 'websocket-connections'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
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
