/**
 * NarrationService factory — wires LLM client when configured.
 */

import { NarrationService } from './NarrationService.js';
import { LLMClient, createAzureOpenAITransport, createOpenAITransport } from './llm-client.js';
import { getConfig } from '../config.js';
import type { NarrationCache } from './cache.js';
import type { NarrationConfig } from '@ellmud/shared';

/**
 * Create a NarrationService with LLM client when configured.
 * Uses Azure OpenAI token auth or OpenAI-compatible endpoint when configured,
 * otherwise template-only fallback.
 */
export function createNarrationService(
  cache?: NarrationCache,
  config?: NarrationConfig,
): NarrationService {
  const serverConfig = getConfig();
  
  let llmClient: LLMClient | undefined;
  
  if (serverConfig.enableLLMNarration) {
    if (serverConfig.llmProvider === 'azure' && serverConfig.azureOpenAILLM) {
      const transport = createAzureOpenAITransport({
        endpoint: serverConfig.azureOpenAILLM.endpoint,
        deployment: serverConfig.azureOpenAILLM.deployment,
        apiVersion: serverConfig.azureOpenAILLM.apiVersion,
      });
      llmClient = new LLMClient(transport);
    } else if (serverConfig.openaiLLM) {
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
