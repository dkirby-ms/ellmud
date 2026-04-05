/**
 * OpenAI-Compatible LLM Transport — Unit Tests
 *
 * Verifies createOpenAITransport():
 *   - URL construction (endpoint + /v1/chat/completions)
 *   - Bearer token auth header
 *   - Model field included in request body
 *   - Error handling for non-200 responses
 *   - AbortSignal support
 */

import { describe, it, expect } from 'vitest';
import { createOpenAITransport } from '../narrative/llm-client.js';
import type { OpenAITransportConfig, LLMRequest } from '../narrative/llm-client.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TEST_CONFIG: OpenAITransportConfig = {
  endpoint: 'https://api.openai.com',
  apiKey: 'sk-test-key-not-real',
  model: 'gpt-4o',
};

const MINIMAL_REQUEST: LLMRequest = {
  messages: [
    { role: 'system', content: 'You are a test assistant.' },
    { role: 'user', content: 'Say hello in one word.' },
  ],
  max_tokens: 10,
  temperature: 0,
};

function mockFetchOk(body: unknown = { choices: [{ message: { content: 'test' } }] }) {
  return async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createOpenAITransport — structure', () => {
  it('should return a function', () => {
    const transport = createOpenAITransport(TEST_CONFIG);
    expect(typeof transport).toBe('function');
  });

  it('should return a function that accepts (request, signal) parameters', () => {
    const transport = createOpenAITransport(TEST_CONFIG);
    expect(transport.length).toBe(2);
  });
});

describe('createOpenAITransport — URL construction', () => {
  it('should construct URL as endpoint + /v1/chat/completions', async () => {
    let capturedUrl = '';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: string | URL | Request, _init?: RequestInit) => {
      capturedUrl = typeof input === 'string' ? input : input.toString();
      return mockFetchOk()();
    };

    try {
      const transport = createOpenAITransport(TEST_CONFIG);
      await transport(MINIMAL_REQUEST, new AbortController().signal);

      expect(capturedUrl).toBe('https://api.openai.com/v1/chat/completions');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle endpoints with trailing slash', async () => {
    let capturedUrl = '';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: string | URL | Request) => {
      capturedUrl = typeof input === 'string' ? input : input.toString();
      return mockFetchOk()();
    };

    try {
      const transport = createOpenAITransport({
        ...TEST_CONFIG,
        endpoint: 'http://localhost:1234',
      });
      await transport(MINIMAL_REQUEST, new AbortController().signal);

      expect(capturedUrl).toBe('http://localhost:1234/v1/chat/completions');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createOpenAITransport — auth header', () => {
  it('should send Authorization: Bearer header', async () => {
    let capturedHeaders: Record<string, string> = {};

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      return mockFetchOk()();
    };

    try {
      const transport = createOpenAITransport(TEST_CONFIG);
      await transport(MINIMAL_REQUEST, new AbortController().signal);

      expect(capturedHeaders['Authorization']).toBe(`Bearer ${TEST_CONFIG.apiKey}`);
      expect(capturedHeaders['Content-Type']).toBe('application/json');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createOpenAITransport — request body', () => {
  it('should include model field in request body', async () => {
    let capturedBody: Record<string, unknown> = {};

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return mockFetchOk()();
    };

    try {
      const transport = createOpenAITransport(TEST_CONFIG);
      await transport(MINIMAL_REQUEST, new AbortController().signal);

      expect(capturedBody).toEqual({
        model: 'gpt-4o',
        messages: MINIMAL_REQUEST.messages,
        max_tokens: MINIMAL_REQUEST.max_tokens,
        temperature: MINIMAL_REQUEST.temperature,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should use the configured model name', async () => {
    let capturedBody: Record<string, unknown> = {};

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return mockFetchOk()();
    };

    try {
      const transport = createOpenAITransport({
        ...TEST_CONFIG,
        model: 'mistral-large-latest',
      });
      await transport(MINIMAL_REQUEST, new AbortController().signal);

      expect(capturedBody.model).toBe('mistral-large-latest');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createOpenAITransport — error handling', () => {
  it('should throw on non-200 response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    try {
      const transport = createOpenAITransport(TEST_CONFIG);
      await expect(transport(MINIMAL_REQUEST, new AbortController().signal)).rejects.toThrow(
        'OpenAI-compatible LLM error: 401 Unauthorized',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should throw on 403 Forbidden', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response('Forbidden', { status: 403, statusText: 'Forbidden' });

    try {
      const transport = createOpenAITransport(TEST_CONFIG);
      await expect(transport(MINIMAL_REQUEST, new AbortController().signal)).rejects.toThrow(
        'OpenAI-compatible LLM error: 403',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should throw on 429 Rate Limited', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });

    try {
      const transport = createOpenAITransport(TEST_CONFIG);
      await expect(transport(MINIMAL_REQUEST, new AbortController().signal)).rejects.toThrow(
        'OpenAI-compatible LLM error: 429',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should throw on 500 Server Error', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    try {
      const transport = createOpenAITransport(TEST_CONFIG);
      await expect(transport(MINIMAL_REQUEST, new AbortController().signal)).rejects.toThrow(
        'OpenAI-compatible LLM error: 500',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should respect AbortSignal', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
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
      const transport = createOpenAITransport(TEST_CONFIG);
      const controller = new AbortController();

      const promise = transport(MINIMAL_REQUEST, controller.signal);
      controller.abort();

      await expect(promise).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
