/**
 * Health Endpoint Tests
 *
 * Covers: GET /health returns 200 with status, uptime, and timestamp.
 */

import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import { createHealthRouter } from '../health.js';
import type { Server } from 'node:http';

describe('Health Endpoint', () => {
  let server: Server;

  afterEach(() => {
    if (server) server.close();
  });

  async function createApp(): Promise<{ port: number; app: express.Express }> {
    const app = express();
    app.use(createHealthRouter());
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    return { port, app };
  }

  it('GET /health returns 200 with status ok', async () => {
    const { port } = await createApp();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('ok');
  });

  it('response includes uptime as a number', async () => {
    const { port } = await createApp();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThan(0);
  });

  it('response includes timestamp as a number', async () => {
    const { port } = await createApp();
    const before = Date.now();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as Record<string, unknown>;
    const after = Date.now();

    expect(typeof body.timestamp).toBe('number');
    expect(body.timestamp).toBeGreaterThanOrEqual(before);
    expect(body.timestamp).toBeLessThanOrEqual(after);
  });

  it('returns JSON content type', async () => {
    const { port } = await createApp();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
