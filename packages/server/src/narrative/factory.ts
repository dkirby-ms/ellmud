/**
 * NarrationService factory — wires LLM client when Azure config is present.
 */

import { NarrationService } from './NarrationService.js';
import { LLMClient, createAzureTransport, createOpenAITransport } from './llm-client.js';
import { getConfig } from '../config.js';
import type { NarrationCache } from './cache.js';
import type { NarrationConfig } from '@ellmud/shared';

/**
 * Create a NarrationService with LLM client when configured.
 * Priority: Azure AI Foundry > OpenAI-compatible endpoint > template-only fallback.
 */
export function createNarrationService(
  cache?: NarrationCache,
  config?: NarrationConfig,
): NarrationService {
  const serverConfig = getConfig();
  
  let llmClient: LLMClient | undefined;
  
  if (serverConfig.enableLLMNarration) {
    if (serverConfig.azureAI) {
      const transport = createAzureTransport({
        endpoint: serverConfig.azureAI.endpoint,
        apiKey: serverConfig.azureAI.apiKey,
        deploymentName: serverConfig.azureAI.deploymentName,
        apiVersion: serverConfig.azureAI.apiVersion,
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
