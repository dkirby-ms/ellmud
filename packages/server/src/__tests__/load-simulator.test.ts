import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { EventEmitter } from 'node:events';
import {
  LoadSimulator,
  LOAD_SIMULATOR_PING_INTERVAL_MS,
  LOAD_SIMULATOR_RAMP_CONNECTIONS_PER_SECOND,
  LOAD_SIMULATOR_RAMP_INTERVAL_MS,
  createLoadSimulatorRouter,
  createLoadSimulatorShutdownHandler,
  registerLoadSimulatorShutdown,
} from '../load-simulator/index.js';
import { LOAD_SIMULATOR_DEFAULT_TARGET_CONNECTIONS, loadConfig, resetConfig } from '../config.js';

const TEST_ADMIN_TOKEN = 'load-simulator-admin-token';
const DEFAULT_URL = 'ws://127.0.0.1:2567';

type SocketEvent = 'open' | 'close' | 'error';
type SocketBehavior = 'open' | 'refuse';

class MockWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];
  static behaviorQueue: SocketBehavior[] = [];

  static reset(): void {
    MockWebSocket.instances = [];
    MockWebSocket.behaviorQueue = [];
  }

  readonly url: string;
  readyState = 0;
  closeCalls = 0;
  pingCalls = 0;
  private readonly listeners = new Map<SocketEvent, Set<() => void>>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    const behavior = MockWebSocket.behaviorQueue.shift() ?? 'open';

    setTimeout(() => {
      if (behavior === 'refuse') {
        this.emit('error');
        return;
      }

      this.readyState = MockWebSocket.OPEN;
      this.emit('open');
    }, 0);
  }

  on(event: SocketEvent, listener: () => void): void {
    const listeners = this.listeners.get(event) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  off(event: SocketEvent, listener: () => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  close(): void {
    this.closeCalls += 1;
    if (this.readyState === MockWebSocket.CLOSED) {
      return;
    }

    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  }

  ping(): void {
    this.pingCalls += 1;
  }

  emit(event: SocketEvent): void {
    if (event === 'close' || event === 'error') {
      this.readyState = MockWebSocket.CLOSED;
    }

    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }

    for (const listener of [...listeners]) {
      listener();
    }
  }
}

function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
    return;
  }

  process.env[key] = value;
}

function createSimulator(
  defaultTargetConnections = 6,
  options: Partial<ConstructorParameters<typeof LoadSimulator>[0]> = {},
): LoadSimulator {
  return new LoadSimulator({
    url: DEFAULT_URL,
    createSocket: (url) => new MockWebSocket(url),
    defaultTargetConnections,
    ...options,
  });
}

async function flushTimers(ms = 0): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

async function waitForConnections(simulator: LoadSimulator, expectedConnections: number, attempts = 8): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    if (simulator.getStatus().activeConnections === expectedConnections) {
      return;
    }

    await flushTimers(LOAD_SIMULATOR_RAMP_INTERVAL_MS);
    await flushTimers();
  }

  expect(simulator.getStatus().activeConnections).toBe(expectedConnections);
}

async function request(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  opts?: { body?: Record<string, unknown>; token?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const headers: Record<string, string> = {};
    if (opts?.token) {
      headers.Authorization = `Bearer ${opts.token}`;
    }
    if (opts?.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: method.toUpperCase(),
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) as Record<string, unknown> : {},
    };
  } finally {
    server.close();
  }
}

describe('load simulator config', () => {
  const originalSimulateLoad = process.env['SIMULATE_LOAD'];

  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    setEnv('SIMULATE_LOAD', originalSimulateLoad);
    resetConfig();
  });

  it('keeps the simulator disabled when SIMULATE_LOAD is unset', () => {
    Reflect.deleteProperty(process.env, 'SIMULATE_LOAD');

    const config = loadConfig();

    expect(config.loadSimulator.enabled).toBe(false);
    expect(config.loadSimulator.targetConnections).toBe(LOAD_SIMULATOR_DEFAULT_TARGET_CONNECTIONS);
  });

  it('treats SIMULATE_LOAD=true as the default demo target', () => {
    process.env['SIMULATE_LOAD'] = 'true';

    const config = loadConfig();

    expect(config.loadSimulator.enabled).toBe(true);
    expect(config.loadSimulator.targetConnections).toBe(LOAD_SIMULATOR_DEFAULT_TARGET_CONNECTIONS);
  });

  it('accepts explicit numeric connection counts', () => {
    process.env['SIMULATE_LOAD'] = '50';

    const config = loadConfig();

    expect(config.loadSimulator.enabled).toBe(true);
    expect(config.loadSimulator.targetConnections).toBe(50);
  });

  it('treats SIMULATE_LOAD=false as disabled', () => {
    process.env['SIMULATE_LOAD'] = 'false';

    const config = loadConfig();

    expect(config.loadSimulator.enabled).toBe(false);
    expect(config.loadSimulator.targetConnections).toBe(0);
  });

  it('treats SIMULATE_LOAD=0 as disabled', () => {
    process.env['SIMULATE_LOAD'] = '0';

    const config = loadConfig();

    expect(config.loadSimulator.enabled).toBe(false);
    expect(config.loadSimulator.targetConnections).toBe(0);
  });
});

describe('LoadSimulator lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.reset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    MockWebSocket.reset();
  });

  it('start() begins ramping connections', async () => {
    const simulator = createSimulator(12);

    simulator.start();
    await flushTimers();
    expect(simulator.getStatus().activeConnections).toBe(5);

    await waitForConnections(simulator, 12);

    expect(simulator.getStatus().activeConnections).toBe(12);
    expect(MockWebSocket.instances).toHaveLength(12);
  });

  it('sends periodic ping frames to keep sockets alive', async () => {
    const simulator = createSimulator(2, { pingIntervalMs: 5_000 });

    simulator.start();
    await flushTimers();
    await flushTimers(5_000);

    expect(MockWebSocket.instances.every((socket) => socket.pingCalls >= 1)).toBe(true);
  });

  it('stop() gracefully closes all connections', async () => {
    const simulator = createSimulator(6);

    simulator.start();
    await flushTimers();
    await waitForConnections(simulator, 6);

    const stopPromise = simulator.stop();
    await flushTimers();
    const status = await stopPromise;

    expect(status.active).toBe(false);
    expect(status.connectionCount).toBe(0);
    expect(MockWebSocket.instances.every((socket) => socket.closeCalls === 1)).toBe(true);
  });

  it('double-start is idempotent', async () => {
    const simulator = createSimulator(6);

    simulator.start();
    simulator.start();
    await flushTimers();
    await waitForConnections(simulator, 6);

    expect(simulator.getStatus().activeConnections).toBe(6);
    expect(MockWebSocket.instances).toHaveLength(6);
  });

  it('stop() is a no-op when already stopped', async () => {
    const simulator = createSimulator(2);

    const status = await simulator.stop();

    expect(status.active).toBe(false);
    expect(status.connectionCount).toBe(0);
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('server shutdown triggers cleanup', async () => {
    const simulator = createSimulator(5);

    simulator.start();
    await flushTimers();

    const signals = new EventEmitter();
    registerLoadSimulatorShutdown(simulator, signals as unknown as { once: (event: 'SIGINT' | 'SIGTERM', listener: () => void) => void });

    signals.emit('SIGTERM');
    await flushTimers();

    expect(simulator.getStatus().active).toBe(false);
    expect(simulator.getStatus().connectionCount).toBe(0);
  });
});

describe('LoadSimulator admin API', () => {
  const originalAdminToken = process.env['ADMIN_TOKEN'];

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.reset();
    process.env['ADMIN_TOKEN'] = TEST_ADMIN_TOKEN;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    MockWebSocket.reset();
    setEnv('ADMIN_TOKEN', originalAdminToken);
  });

  function createApp(simulator: LoadSimulator): express.Express {
    const app = express();
    app.use(express.json());
    app.use(createLoadSimulatorRouter({ loadSimulator: simulator }));
    return app;
  }

  it('GET /status returns the current state', async () => {
    const simulator = createSimulator(5);
    simulator.start();
    await flushTimers();

    const app = createApp(simulator);
    const response = await request(app, 'get', '/admin/api/load-simulator/status', { token: TEST_ADMIN_TOKEN });

    expect(response.status).toBe(200);
    expect(response.body.connectionCount).toBe(5);
    expect(response.body.rampConnectionsPerSecond).toBe(LOAD_SIMULATOR_RAMP_CONNECTIONS_PER_SECOND);
    expect(response.body.pingIntervalMs).toBe(LOAD_SIMULATOR_PING_INTERVAL_MS);
  });

  it('POST /start activates with the requested connection count', async () => {
    const simulator = createSimulator(8);
    const app = createApp(simulator);

    const response = await request(app, 'post', '/admin/api/load-simulator/start', {
      token: TEST_ADMIN_TOKEN,
      body: { connections: 8 },
    });
    await flushTimers();
    await waitForConnections(simulator, 8);

    expect(response.status).toBe(200);
    expect(response.body.targetConnections).toBe(8);
    expect(simulator.getStatus().activeConnections).toBe(8);
  });

  it('POST /stop deactivates the simulator', async () => {
    const simulator = createSimulator(5);
    simulator.start();
    await flushTimers();

    const app = createApp(simulator);
    const response = await request(app, 'post', '/admin/api/load-simulator/stop', { token: TEST_ADMIN_TOKEN });
    await flushTimers();

    expect(response.status).toBe(200);
    expect(response.body.active).toBe(false);
    expect(simulator.getStatus().connectionCount).toBe(0);
  });

  it('endpoints require admin auth', async () => {
    const simulator = createSimulator(5);
    const app = createApp(simulator);

    const responses = await Promise.all([
      request(app, 'get', '/admin/api/load-simulator/status'),
      request(app, 'post', '/admin/api/load-simulator/start', { body: { connections: 1 } }),
      request(app, 'post', '/admin/api/load-simulator/stop'),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });
});

describe('LoadSimulator edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.reset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    MockWebSocket.reset();
  });

  it('keeps retrying failed loopback connections until one opens', async () => {
    MockWebSocket.behaviorQueue.push('refuse', 'refuse', 'open');
    const simulator = createSimulator(1, { rampConnectionsPerSecond: 1 });

    simulator.start();
    await flushTimers();
    await waitForConnections(simulator, 1, 3);

    expect(MockWebSocket.instances).toHaveLength(3);
    expect(simulator.getStatus().activeConnections).toBe(1);
  });

  it('respects the target limit and does not overshoot', async () => {
    const simulator = createSimulator(7);

    simulator.start();
    await flushTimers();
    await waitForConnections(simulator, 7);

    expect(simulator.getStatus().activeConnections).toBe(7);
    expect(MockWebSocket.instances).toHaveLength(7);
  });

  it('does not re-establish dropped connections after stop()', async () => {
    const simulator = createSimulator(2);

    simulator.start();
    await flushTimers();
    await waitForConnections(simulator, 2);
    const createdBeforeStop = MockWebSocket.instances.length;

    const stopPromise = simulator.stop();
    await flushTimers();
    await stopPromise;
    await flushTimers(LOAD_SIMULATOR_RAMP_INTERVAL_MS * 2);

    expect(simulator.getStatus().connectionCount).toBe(0);
    expect(MockWebSocket.instances).toHaveLength(createdBeforeStop);
  });

  it('shutdown handler remains idempotent', async () => {
    const simulator = createSimulator(1);
    const stopSpy = vi.spyOn(simulator, 'stop');
    const shutdown = createLoadSimulatorShutdownHandler(simulator);

    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });
});
