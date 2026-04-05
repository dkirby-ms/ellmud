/**
 * NarrationService factory — wires LLM client when Azure config is present.
 */

import { NarrationService } from './NarrationService.js';
import { LLMClient, createAzureTransport } from './llm-client.js';
import { getConfig } from '../config.js';
import type { NarrationCache } from './cache.js';
import type { NarrationConfig } from '@ellmud/shared';

/**
 * Create a NarrationService with Azure AI Foundry LLM client when configured.
 * Falls back to template-only mode when no Azure endpoint is available.
 */
export function createNarrationService(
  cache?: NarrationCache,
  config?: NarrationConfig,
): NarrationService {
  const serverConfig = getConfig();
  
  let llmClient: LLMClient | undefined;
  
  if (serverConfig.azureAI) {
    const transport = createAzureTransport({
      endpoint: serverConfig.azureAI.endpoint,
      apiKey: serverConfig.azureAI.apiKey,
      deploymentName: serverConfig.azureAI.deploymentName,
      apiVersion: serverConfig.azureAI.apiVersion,
    });
    llmClient = new LLMClient(transport);
  }
  
  return new NarrationService({
    cache,
    llmClient,
    config,
  });
}
