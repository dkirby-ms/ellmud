/**
 * Azure LLM Transport — Integration Tests
 *
 * Gated behind AZURE_AI_TEST=true environment variable.
 * When enabled, tests verify:
 *   - createAzureTransport() returns a callable transport function
 *   - URL and header construction is correct
 *   - Error handling for invalid credentials returns a clear error
 *
 * This is NOT a live API test by default — it only runs when explicitly enabled.
 */

import { describe, it, expect } from 'vitest';
import { createAzureTransport } from '../narrative/llm-client.js';
import type { LLMClientConfig, LLMTransport, LLMRequest } from '../narrative/llm-client.js';

const AZURE_AI_TEST = process.env.AZURE_AI_TEST === 'true';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TEST_CONFIG: LLMClientConfig = {
  endpoint: process.env.AZURE_AI_ENDPOINT || 'https://test-endpoint.openai.azure.com',
  apiKey: process.env.AZURE_AI_KEY || 'test-api-key-not-real',
  deploymentName: process.env.AZURE_AI_DEPLOYMENT || 'gpt-4o-mini',
  apiVersion: process.env.AZURE_AI_API_VERSION || '2024-02-15-preview',
};

const MINIMAL_REQUEST: LLMRequest = {
  messages: [
    { role: 'system', content: 'You are a test assistant.' },
    { role: 'user', content: 'Say hello in one word.' },
  ],
  max_tokens: 10,
  temperature: 0,
};

// ─── Always-run tests (transport shape & construction) ───────────────────────

describe('createAzureTransport — structure', () => {
  it('should return a function', () => {
    const transport = createAzureTransport(TEST_CONFIG);
    expect(typeof transport).toBe('function');
  });

  it('should return a function that accepts (request, signal) parameters', () => {
    const transport = createAzureTransport(TEST_CONFIG);
    expect(transport.length).toBe(2);
  });

  it('should construct correct URL from config', async () => {
    // Intercept the fetch call to verify URL construction
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = typeof input === 'string' ? input : input.toString();
      const headers = init?.headers as Record<string, string> | undefined;
      capturedHeaders = headers ?? {};
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'test' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    try {
      const transport = createAzureTransport(TEST_CONFIG);
      const controller = new AbortController();
      await transport(MINIMAL_REQUEST, controller.signal);

      // Verify URL structure
      const expectedUrl = `${TEST_CONFIG.endpoint}/openai/deployments/${TEST_CONFIG.deploymentName}/chat/completions?api-version=${TEST_CONFIG.apiVersion}`;
      expect(capturedUrl).toBe(expectedUrl);

      // Verify headers
      expect(capturedHeaders['Content-Type']).toBe('application/json');
      expect(capturedHeaders['api-key']).toBe(TEST_CONFIG.apiKey);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should throw on non-200 response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    };

    try {
      const transport = createAzureTransport(TEST_CONFIG);
      const controller = new AbortController();

      await expect(transport(MINIMAL_REQUEST, controller.signal))
        .rejects.toThrow('Azure AI Foundry error: 401 Unauthorized');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should throw on 403 Forbidden for invalid API key', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response('Forbidden', { status: 403, statusText: 'Forbidden' });
    };

    try {
      const transport = createAzureTransport({
        ...TEST_CONFIG,
        apiKey: 'invalid-key',
      });
      const controller = new AbortController();

      await expect(transport(MINIMAL_REQUEST, controller.signal))
        .rejects.toThrow('Azure AI Foundry error: 403');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should respect AbortSignal', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      // Simulate a slow request that checks signal
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    };

    try {
      const transport = createAzureTransport(TEST_CONFIG);
      const controller = new AbortController();

      const promise = transport(MINIMAL_REQUEST, controller.signal);
      controller.abort();

      await expect(promise).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should send request body with correct shape', async () => {
    let capturedBody: Record<string, unknown> = {};

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'ok' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    try {
      const transport = createAzureTransport(TEST_CONFIG);
      const controller = new AbortController();
      await transport(MINIMAL_REQUEST, controller.signal);

      expect(capturedBody).toEqual({
        messages: MINIMAL_REQUEST.messages,
        max_tokens: MINIMAL_REQUEST.max_tokens,
        temperature: MINIMAL_REQUEST.temperature,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ─── Live integration (only when AZURE_AI_TEST=true) ─────────────────────────

describe.skipIf(!AZURE_AI_TEST)('createAzureTransport — live integration', () => {
  let transport: LLMTransport;

  it('should make a successful health-check call to Azure', async () => {
    transport = createAzureTransport(TEST_CONFIG);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await transport(MINIMAL_REQUEST, controller.signal);
      expect(response).toBeDefined();
      expect(response.choices).toBeInstanceOf(Array);
      expect(response.choices.length).toBeGreaterThan(0);
      expect(typeof response.choices[0]!.message.content).toBe('string');
    } finally {
      clearTimeout(timeout);
    }
  }, 20_000);

  it('should reject invalid credentials against the real endpoint', async () => {
    const badTransport = createAzureTransport({
      ...TEST_CONFIG,
      apiKey: 'invalid-api-key-for-testing',
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      await expect(badTransport(MINIMAL_REQUEST, controller.signal))
        .rejects.toThrow('Azure AI Foundry error');
    } finally {
      clearTimeout(timeout);
    }
  }, 20_000);
});
