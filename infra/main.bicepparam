using './main.bicep'

param environmentName = 'uat'

param location = 'centralus'

param postgresAdminUsername = 'pgadmin'

// Required: export POSTGRES_ADMIN_PASSWORD before running az deployment group create
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')

param postgresDatabaseName = 'ellmud'

// Azure OpenAI / AI Foundry LLM narration uses the Container App's
// system-assigned managed identity. No LLM API key is required.
param azureOpenAiDeployment = 'gpt-4o-mini'
param azureOpenAiApiVersion = '2024-10-21'
param enableLlmNarration = 'true'

// Admin API token — required for admin dashboard access (fail-closed when unset)
// param adminToken = readEnvironmentVariable('ADMIN_TOKEN')
