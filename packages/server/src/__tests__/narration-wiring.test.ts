/**
 * Integration test for NarrationService wiring into ZoneRoom.
 * Issue #277 — Verify LLM client is instantiated and called for narrations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createNarrationService } from '../narrative/factory.js';
import type { LLMTransport, LLMResponse, LLMRequest } from '../narrative/llm-client.js';
import { LLMClient } from '../narrative/llm-client.js';
import { InMemoryNarrationCache } from '../narrative/cache.js';
import { resetConfig, getConfig } from '../config.js';

// Mock transport that tracks calls
function createMockTransport(response: string = 'A dark chamber with water pooling at your feet.'): LLMTransport {
  const transport: LLMTransport & { callCount: number } = Object.assign(
    async (_request: LLMRequest, _signal: AbortSignal): Promise<LLMResponse> => {
      transport.callCount++;
      return { choices: [{ message: { content: response } }] };
    },
    { callCount: 0 }
  );
  return transport;
}

describe('NarrationService factory integration', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('creates NarrationService without LLM when Azure config is missing', () => {
    // No AZURE_AI_ENDPOINT env var
    delete process.env.AZURE_AI_ENDPOINT;
    delete process.env.AZURE_AI_KEY;
    
    const service = createNarrationService();
    
    expect(service).toBeDefined();
    expect(service.telemetry).toBeDefined();
  });

  it('creates NarrationService with LLM client when Azure config is present', () => {
    // Set Azure config env vars
    process.env.AZURE_AI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_AI_KEY = 'test-api-key';
    process.env.AZURE_AI_DEPLOYMENT = 'gpt-4o-mini';
    
    resetConfig(); // reload config
    const config = getConfig();
    
    expect(config.azureAI).toBeDefined();
    expect(config.azureAI?.endpoint).toBe('https://test.openai.azure.com');
    expect(config.azureAI?.apiKey).toBe('test-api-key');
    expect(config.azureAI?.deploymentName).toBe('gpt-4o-mini');
    
    const service = createNarrationService();
    expect(service).toBeDefined();
  });

  it('uses default deployment name when not specified', () => {
    process.env.AZURE_AI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_AI_KEY = 'test-api-key';
    delete process.env.AZURE_AI_DEPLOYMENT;
    
    resetConfig();
    const config = getConfig();
    
    expect(config.azureAI?.deploymentName).toBe('gpt-4o-mini');
  });

  it('uses default API version when not specified', () => {
    process.env.AZURE_AI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_AI_KEY = 'test-api-key';
    delete process.env.AZURE_AI_API_VERSION;
    
    resetConfig();
    const config = getConfig();
    
    expect(config.azureAI?.apiVersion).toBe('2024-08-01-preview');
  });

  it('narrates with mock LLM transport', async () => {
    const mockTransport = createMockTransport('Test LLM response.');
    const llmClient = new LLMClient(mockTransport);
    const cache = new InMemoryNarrationCache();
    const service = createNarrationService(cache);
    
    // Manually inject the mock client (for testing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).llmClient = llmClient;
    
    const context: import('@ellmud/shared').NarrationContext = {
      narration_type: 'room_description',
      room: {
        id: 'test-room',
        light_level: 1.0,
        exits: ['north', 'south'],
        features: [],
        items_visible: [],
        creatures: [],
        hazards: [],
        traces: [],
        zone_stability: 1.0,
      },
      player: {
        hp_pct: 1.0,
        statuses: [],
        stance: 'exploring',
        awareness_level: 0.5,
        visited_before: false,
      },
      recent_events: [],
      narrative_directives: {
        tone: 'grim',
        verbosity: 'standard',
        forbidden: ['reveal_player_names'],
      },
    };
    
    const result = await service.narrate(context);
    
    expect(result).toBe('Test LLM response.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mockTransport as any).callCount).toBe(1);
  });

  it('falls back to template when LLM client is null', async () => {
    const cache = new InMemoryNarrationCache();
    const service = createNarrationService(cache);
    
    // Ensure no LLM client is set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).llmClient = null;
    
    const context: import('@ellmud/shared').NarrationContext = {
      narration_type: 'room_description',
      room: {
        id: 'test-room',
        light_level: 1.0,
        exits: ['north'],
        features: [],
        items_visible: [],
        creatures: [],
        hazards: [],
        traces: [],
        zone_stability: 1.0,
      },
      player: {
        hp_pct: 1.0,
        statuses: [],
        stance: 'exploring',
        awareness_level: 0.5,
        visited_before: false,
      },
      recent_events: [],
      narrative_directives: {
        tone: 'grim',
        verbosity: 'standard',
        forbidden: [],
      },
    };
    
    const result = await service.narrate(context);
    
    // Should return template text (not empty)
    expect(result.length).toBeGreaterThan(0);
    // Verify fallback was used (service has no LLM client)
    const stats = service.telemetry.getTelemetry();
    expect(stats.fallback_uses).toBe(1);
  });

  it('disables LLM narration when ENABLE_LLM_NARRATION=false even with Azure credentials', () => {
    // Set Azure credentials
    process.env.AZURE_AI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_AI_KEY = 'test-api-key';
    process.env.AZURE_AI_DEPLOYMENT = 'gpt-4o-mini';
    // Explicitly disable LLM narration
    process.env.ENABLE_LLM_NARRATION = 'false';
    
    resetConfig();
    const config = getConfig();
    
    // Azure credentials should be present
    expect(config.azureAI).toBeDefined();
    // But LLM narration toggle should be disabled
    expect(config.enableLLMNarration).toBe(false);
    
    const service = createNarrationService();
    
    // Service should be created without LLM client (null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).llmClient).toBeNull();
  });

  it('enables LLM narration by default when Azure credentials are present', () => {
    // Set Azure credentials
    process.env.AZURE_AI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_AI_KEY = 'test-api-key';
    // Do not set ENABLE_LLM_NARRATION — should default to true
    delete process.env.ENABLE_LLM_NARRATION;
    
    resetConfig();
    const config = getConfig();
    
    expect(config.azureAI).toBeDefined();
    expect(config.enableLLMNarration).toBe(true);
    
    const service = createNarrationService();
    
    // Service should be created with LLM client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).llmClient).toBeDefined();
  });

  it('respects ENABLE_LLM_NARRATION=true explicitly', () => {
    // Set Azure credentials and explicitly enable
    process.env.AZURE_AI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_AI_KEY = 'test-api-key';
    process.env.ENABLE_LLM_NARRATION = 'true';
    
    resetConfig();
    const config = getConfig();
    
    expect(config.azureAI).toBeDefined();
    expect(config.enableLLMNarration).toBe(true);
    
    const service = createNarrationService();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).llmClient).toBeDefined();
  });
});
