### OpenAI-Compatible LLM Transport — Provider Priority Chain
**By:** Drizzt (Engine Dev)
**Issue:** #310

## Decision

When both Azure AI and OpenAI-compatible LLM configs are present, Azure takes priority. The factory chain is: Azure > OpenAI-compatible > template-only fallback.

## Rationale

Backward compatibility. Existing Azure deployments must not change behavior when new env vars are added. Admins opt into the OpenAI path by *not* setting Azure credentials, or by removing them.

## Config Surface

- `OPENAI_LLM_ENDPOINT` + `OPENAI_LLM_KEY` — both required to activate
- `OPENAI_LLM_MODEL` — defaults to `gpt-4o`
- `ENABLE_LLM_NARRATION` — master toggle still respected

## Team Impact

- **Volo/Jarlaxle:** No changes needed — `LLMClient` and `NarrationService` are provider-agnostic
- **Minsc:** If building admin UI for LLM settings, check both `config.azureAI` and `config.openaiLLM`
- **Regis:** No client changes — narration protocol is unchanged
