/**
 * Barrel export for the narrative module.
 */

export { NarrationService } from './NarrationService.js';
export type { NarrationServiceDeps } from './NarrationService.js';
export { hashState } from './hasher.js';
export { InMemoryNarrationCache } from './cache.js';
export type { NarrationCache } from './cache.js';
export { LLMClient, validateLLMOutput, createOpenAITransport } from './llm-client.js';
export type { LLMTransport, LLMRequest, LLMResponse, OpenAITransportConfig } from './llm-client.js';
export { renderTemplate } from './templates.js';
export { NarrationTelemetryTracker } from './telemetry.js';
