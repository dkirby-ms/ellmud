import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAzureOpenAITransport } from '../narrative/llm-client.js';
import type { AzureOpenAITokenProvider, LLMRequest } from '../narrative/llm-client.js';

const MINIMAL_REQUEST: LLMRequest = {
  messages: [
    { role: 'system', content: 'You are a test assistant.' },
    { role: 'user', content: 'Say hello in one word.' },
  ],
  max_tokens: 10,
  temperature: 0,
};

function okResponse() {
  return new Response(JSON.stringify({
    choices: [{ message: { content: 'test' } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('createAzureOpenAITransport', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('builds the Azure deployment URL and sends an Entra bearer token', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: Record<string, unknown> = {};
    const tokenProvider: AzureOpenAITokenProvider = vi.fn(async () => ({
      token: 'mock-entra-token',
      expiresOnTimestamp: Date.now() + 60 * 60 * 1000,
    }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = typeof input === 'string' ? input : input.toString();
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      capturedBody = JSON.parse(init?.body as string);
      return okResponse();
    };

    try {
      const transport = createAzureOpenAITransport({
        endpoint: 'https://ellmud-ai.openai.azure.com/',
        deployment: 'gpt-4o-mini',
        apiVersion: '2024-10-21',
        tokenProvider,
      });

      await transport(MINIMAL_REQUEST, new AbortController().signal);

      expect(capturedUrl).toBe(
        'https://ellmud-ai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21',
      );
      expect(capturedHeaders['Authorization']).toBe('Bearer mock-entra-token');
      expect(capturedHeaders['Content-Type']).toBe('application/json');
      expect(capturedBody).toEqual({
        messages: MINIMAL_REQUEST.messages,
        max_tokens: MINIMAL_REQUEST.max_tokens,
        temperature: MINIMAL_REQUEST.temperature,
      });
      expect(tokenProvider).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('caches tokens across calls while they are safely before expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T17:00:00Z'));
    const tokenProvider: AzureOpenAITokenProvider = vi.fn(async () => ({
      token: 'cached-token',
      expiresOnTimestamp: Date.now() + 60 * 60 * 1000,
    }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => okResponse();

    try {
      const transport = createAzureOpenAITransport({
        endpoint: 'https://ellmud-ai.openai.azure.com',
        deployment: 'gpt-4o-mini',
        tokenProvider,
      });

      await transport(MINIMAL_REQUEST, new AbortController().signal);
      await transport(MINIMAL_REQUEST, new AbortController().signal);

      expect(tokenProvider).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('refreshes cached tokens inside the expiry safety window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T17:00:00Z'));
    let tokenIndex = 0;
    const tokens = ['first-token', 'second-token'];
    const observedAuthHeaders: string[] = [];
    const tokenProvider: AzureOpenAITokenProvider = vi.fn(async () => ({
      token: tokens[tokenIndex++]!,
      expiresOnTimestamp: Date.now() + 10 * 60 * 1000,
    }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      const headers = (init?.headers as Record<string, string>) ?? {};
      observedAuthHeaders.push(headers['Authorization'] ?? '');
      return okResponse();
    };

    try {
      const transport = createAzureOpenAITransport({
        endpoint: 'https://ellmud-ai.openai.azure.com',
        deployment: 'gpt-4o-mini',
        tokenProvider,
      });

      await transport(MINIMAL_REQUEST, new AbortController().signal);
      vi.advanceTimersByTime(6 * 60 * 1000);
      await transport(MINIMAL_REQUEST, new AbortController().signal);

      expect(tokenProvider).toHaveBeenCalledTimes(2);
      expect(observedAuthHeaders).toEqual(['Bearer first-token', 'Bearer second-token']);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
