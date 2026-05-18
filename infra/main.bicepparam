using './main.bicep'

param environmentName = 'uat'

param location = 'centralus'

param postgresAdminUsername = 'pgadmin'

// Required: export POSTGRES_ADMIN_PASSWORD before running az deployment group create
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')

param postgresDatabaseName = 'ellmud'

// OpenAI-compatible LLM — narration (optional, degrades to templates when unset)
// param openaiLlmEndpoint = 'https://api.openai.com'
// param openaiLlmKey = readEnvironmentVariable('OPENAI_LLM_KEY')
// param openaiLlmModel = 'gpt-4o'
// param enableLlmNarration = 'true'

// Admin API token — required for admin dashboard access (fail-closed when unset)
// param adminToken = readEnvironmentVariable('ADMIN_TOKEN')

// Load simulator for KEDA autoscaling demos. Set to "true" or a connection count.
param simulateLoad = ''
