using './main.bicep'

param environmentName = 'uat'

param location = 'centralus'

param postgresAdminUsername = 'pgadmin'

// Required: export POSTGRES_ADMIN_PASSWORD before running az deployment group create
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')

param postgresDatabaseName = 'ellmud'
