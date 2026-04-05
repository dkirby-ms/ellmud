using './main.bicep'

param environmentName = 'uat'

param location = 'centralus'

param postgresAdminUsername = 'pgadmin'

// Required: export POSTGRES_ADMIN_PASSWORD before running az deployment group create
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')

param postgresDatabaseName = 'ellmud'

// Azure AI Foundry — LLM narration (optional, degrades to templates when unset)
// param azureAiEndpoint = 'https://<your-ai-services>.cognitiveservices.azure.com'
// param azureAiKey = readEnvironmentVariable('AZURE_AI_KEY')
// param azureAiDeployment = 'gpt-4o-mini'
// param azureAiApiVersion = '2024-08-01-preview'
// param enableLlmNarration = 'true'

// Admin API token — required for admin dashboard access (fail-closed when unset)
// param adminToken = readEnvironmentVariable('ADMIN_TOKEN')
