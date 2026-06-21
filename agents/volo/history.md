

## 2026-06-21T16:08:38Z — LLM narration reachability analysis

Volo confirmed the codebase has a real NarrationService pipeline and OpenAI-compatible transport, but production wiring only reaches player-join event narration. Look, combat, ambient, and sensory output bypass LLM; UAT has no provisioned LLM resource; AZURE_AI_* env vars are currently dead; admin narrative templates are disconnected from runtime narration.
