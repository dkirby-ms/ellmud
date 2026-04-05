/**
 * NarrationService factory — wires LLM client when OpenAI-compatible config is present.
 */

import { NarrationService } from './NarrationService.js';
import { LLMClient, createOpenAITransport } from './llm-client.js';
import { getConfig } from '../config.js';
import type { NarrationCache } from './cache.js';
import type { NarrationConfig } from '@ellmud/shared';

/**
 * Create a NarrationService with LLM client when configured.
 * Uses OpenAI-compatible endpoint when credentials are present, otherwise template-only fallback.
 */
export function createNarrationService(
  cache?: NarrationCache,
  config?: NarrationConfig,
): NarrationService {
  const serverConfig = getConfig();
  
  let llmClient: LLMClient | undefined;
  
  if (serverConfig.enableLLMNarration) {
    if (serverConfig.openaiLLM) {
      const transport = createOpenAITransport({
        endpoint: serverConfig.openaiLLM.endpoint,
        apiKey: serverConfig.openaiLLM.apiKey,
        model: serverConfig.openaiLLM.model,
      });
      llmClient = new LLMClient(transport);
    }
  }
  
  return new NarrationService({
    cache,
    llmClient,
    config,
  });
}
