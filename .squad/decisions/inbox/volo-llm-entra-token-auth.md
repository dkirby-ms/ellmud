### 2026-06-23T12:10: Volo — Azure OpenAI uses Entra token auth

**Decision:** The server-side Azure OpenAI narration path uses Entra bearer tokens from `DefaultAzureCredential`, scoped to `https://cognitiveservices.azure.com/.default`, and does not require or read an API key.

**Details:**
- Azure requests use `{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}`.
- `AZURE_OPENAI_API_VERSION` defaults to GA `2024-10-21`.
- Tokens are acquired lazily, cached, and refreshed five minutes before expiry.
- `LLM_PROVIDER=azure` selects Azure when endpoint/deployment are present; if unset, complete Azure config is auto-selected before the OpenAI-compatible API-key path.
- `ENABLE_LLM_NARRATION=false` still forces template-only narration.

**Rationale:** This honors the standing directive to use the ACA system-assigned managed identity and the already-granted Cognitive Services OpenAI User role, avoiding any LLM API key secret for Azure.
