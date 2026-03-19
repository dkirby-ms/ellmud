using './main.bicep'

param environmentName = 'dev'

param location = 'eastus2'

param postgresAdminUsername = 'pgadmin'

// Required: export POSTGRES_ADMIN_PASSWORD before running az deployment group create
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')

param postgresDatabaseName = 'ellmud'
