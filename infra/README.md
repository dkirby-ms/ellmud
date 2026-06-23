# Ellmud infrastructure deploy notes

## Azure OpenAI / AI Foundry LLM narration

LLM narration uses Azure OpenAI-compatible AI Foundry with Entra token auth from the Azure Container Apps system-assigned managed identity. No LLM API key secret is required or configured.

Container environment:

- `LLM_PROVIDER=azure`
- `AZURE_OPENAI_ENDPOINT` from the Bicep `aiFoundry.outputs.aiServicesEndpoint` output
- `AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini`
- `AZURE_OPENAI_API_VERSION=2024-10-21`
- `ENABLE_LLM_NARRATION=true`

The Container App identity must have the `Cognitive Services OpenAI User` role on the AI Services account (`ellmud-<environment>-ai-services`). Role assignment is intentionally not created by this template because deployment principals may not have role-assignment permissions; grant it once before enabling LLM narration.
