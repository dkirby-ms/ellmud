import { Router, type Request, type Response } from 'express';
import WebSocket from 'ws';
import { adminAuth } from '../admin/middleware.js';

export const LOAD_SIMULATOR_RAMP_INTERVAL_MS = 1000;
export const LOAD_SIMULATOR_RAMP_CONNECTIONS_PER_SECOND = 5;
export const LOAD_SIMULATOR_PING_INTERVAL_MS = 15000;

type SocketEvent = 'open' | 'close' | 'error';
type ShutdownSignal = 'SIGINT' | 'SIGTERM';

export interface LoadSimulatorStatus {
  active: boolean;
  stopping: boolean;
  targetConnections: number;
  activeConnections: number;
  connectingConnections: number;
  connectionCount: number;
  url: string;
  rampConnectionsPerSecond: number;
  pingIntervalMs: number;
}

export interface LoadSimulatorSocket {
  on: (event: SocketEvent, listener: (event?: unknown) => void) => void;
  off?: (event: SocketEvent, listener: (event?: unknown) => void) => void;
  removeListener?: (event: SocketEvent, listener: (event?: unknown) => void) => void;
  close: () => void;
  ping?: () => void;
  readyState?: number;
}

type WebSocketFactory = (url: string) => LoadSimulatorSocket;

export interface LoadSimulatorOptions {
  url: string;
  createSocket?: WebSocketFactory;
  rampIntervalMs?: number;
  rampConnectionsPerSecond?: number;
  pingIntervalMs?: number;
  defaultTargetConnections?: number;
  logger?: Pick<Console, 'log' | 'warn'>;
}

export interface LoadSimulatorRouterDeps {
  loadSimulator: LoadSimulator;
}

export interface ShutdownRegistrar {
  once: (signal: ShutdownSignal, listener: () => void) => void;
}

function normalizeTargetConnections(targetConnections: number | undefined, fallback: number): number {
  if (targetConnections === undefined || Number.isNaN(targetConnections)) {
    return fallback;
  }

  return Math.max(0, Math.floor(targetConnections));
}

function attachSocketListener(
  socket: LoadSimulatorSocket,
  event: SocketEvent,
  listener: (event?: unknown) => void,
): () => void {
  socket.on(event, listener);
  return () => {
    if (typeof socket.off === 'function') {
      socket.off(event, listener);
      return;
    }
    socket.removeListener?.(event, listener);
  };
}

export class LoadSimulator {
  private readonly url: string;
  private readonly createSocket: WebSocketFactory;
  private readonly rampIntervalMs: number;
  private readonly rampConnectionsPerSecond: number;
  private readonly pingIntervalMs: number;
  private readonly defaultTargetConnections: number;
  private readonly logger: Pick<Console, 'log' | 'warn'>;
  private readonly activeSockets = new Set<LoadSimulatorSocket>();
  private readonly connectingSockets = new Set<LoadSimulatorSocket>();
  private readonly socketCleanup = new Map<LoadSimulatorSocket, Array<() => void>>();
  private readonly pingTimers = new Map<LoadSimulatorSocket, NodeJS.Timeout>();
  private rampTimer: NodeJS.Timeout | null = null;
  private stopPromise: Promise<void> | null = null;
  private resolveStopPromise: (() => void) | null = null;
  private active = false;
  private stopping = false;
  private targetConnections = 0;

  constructor(options: LoadSimulatorOptions) {
    this.url = options.url;
    this.createSocket = options.createSocket ?? ((url) => new WebSocket(url));
    this.rampIntervalMs = options.rampIntervalMs ?? LOAD_SIMULATOR_RAMP_INTERVAL_MS;
    this.rampConnectionsPerSecond = Math.max(1, Math.floor(
      options.rampConnectionsPerSecond ?? LOAD_SIMULATOR_RAMP_CONNECTIONS_PER_SECOND,
    ));
    this.pingIntervalMs = Math.max(1000, Math.floor(options.pingIntervalMs ?? LOAD_SIMULATOR_PING_INTERVAL_MS));
    this.defaultTargetConnections = Math.max(1, Math.floor(options.defaultTargetConnections ?? 1));
    this.logger = options.logger ?? console;
  }

  start(targetConnections?: number): LoadSimulatorStatus {
    const normalizedTarget = normalizeTargetConnections(targetConnections, this.defaultTargetConnections);
    if (normalizedTarget <= 0) {
      void this.stop();
      return this.getStatus();
    }

    const wasActive = this.active;
    const previousTarget = this.targetConnections;

    this.active = true;
    this.stopping = false;
    this.targetConnections = normalizedTarget;

    if (!wasActive) {
      this.logger.log(
        `[Ellmud] Load simulator: starting ${normalizedTarget} loopback WebSocket connection(s) against ${this.url}`,
      );
    } else if (previousTarget !== normalizedTarget) {
      this.logger.log(
        `[Ellmud] Load simulator: adjusting target from ${previousTarget} to ${normalizedTarget} loopback connection(s)`,
      );
    }

    if (!this.rampTimer) {
      this.rampTimer = setInterval(() => {
        this.rampConnections();
      }, this.rampIntervalMs);
    }

    this.rampConnections();
    return this.getStatus();
  }

  async stop(): Promise<LoadSimulatorStatus> {
    const wasActive = this.active || this.stopping || this.getStatus().connectionCount > 0;

    this.active = false;
    this.targetConnections = 0;

    if (this.rampTimer) {
      clearInterval(this.rampTimer);
      this.rampTimer = null;
    }

    const sockets = [...this.activeSockets, ...this.connectingSockets];
    if (sockets.length === 0) {
      this.stopping = false;
      if (wasActive) {
        this.logger.log('[Ellmud] Load simulator: stopped');
      }
      return this.getStatus();
    }

    if (!this.stopping) {
      this.logger.log('[Ellmud] Load simulator: stopping loopback WebSocket traffic');
    }
    this.stopping = true;

    if (!this.stopPromise) {
      this.stopPromise = new Promise<void>((resolve) => {
        this.resolveStopPromise = resolve;
      });
    }

    for (const socket of sockets) {
      socket.close();
    }

    await this.stopPromise;
    return this.getStatus();
  }

  getStatus(): LoadSimulatorStatus {
    return {
      active: this.active,
      stopping: this.stopping,
      targetConnections: this.targetConnections,
      activeConnections: this.activeSockets.size,
      connectingConnections: this.connectingSockets.size,
      connectionCount: this.activeSockets.size + this.connectingSockets.size,
      url: this.url,
      rampConnectionsPerSecond: this.rampConnectionsPerSecond,
      pingIntervalMs: this.pingIntervalMs,
    };
  }

  private rampConnections(): void {
    if (!this.active || this.stopping) {
      return;
    }

    const deficit = this.targetConnections - this.getStatus().connectionCount;
    if (deficit <= 0) {
      return;
    }

    const nextBatchSize = Math.min(deficit, this.rampConnectionsPerSecond);
    for (let i = 0; i < nextBatchSize; i += 1) {
      this.openConnection();
    }
  }

  private openConnection(): void {
    if (!this.active || this.stopping) {
      return;
    }

    let socket: LoadSimulatorSocket;
    try {
      socket = this.createSocket(this.url);
    } catch (error) {
      this.logger.warn('[Ellmud] Load simulator: failed to create a loopback socket', error);
      return;
    }

    this.connectingSockets.add(socket);

    const handleOpen = () => {
      if (!this.connectingSockets.delete(socket)) {
        return;
      }
      this.activeSockets.add(socket);
      this.startPingLoop(socket);
    };

    const handleClosed = () => {
      this.connectingSockets.delete(socket);
      this.activeSockets.delete(socket);
      this.stopPingLoop(socket);
      this.cleanupSocket(socket);
      this.finishStoppingIfIdle();
    };

    this.socketCleanup.set(socket, [
      attachSocketListener(socket, 'open', handleOpen),
      attachSocketListener(socket, 'close', handleClosed),
      attachSocketListener(socket, 'error', handleClosed),
    ]);
  }

  private startPingLoop(socket: LoadSimulatorSocket): void {
    if (this.pingTimers.has(socket)) {
      return;
    }

    const timer = setInterval(() => {
      if (!this.activeSockets.has(socket) || this.stopping) {
        return;
      }

      if (socket.readyState !== undefined && socket.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        socket.ping?.();
      } catch {
        // Ignore ping failures; close/error handlers drive cleanup and retries.
      }
    }, this.pingIntervalMs);

    this.pingTimers.set(socket, timer);
  }

  private stopPingLoop(socket: LoadSimulatorSocket): void {
    const timer = this.pingTimers.get(socket);
    if (timer) {
      clearInterval(timer);
      this.pingTimers.delete(socket);
    }
  }

  private cleanupSocket(socket: LoadSimulatorSocket): void {
    const cleanup = this.socketCleanup.get(socket);
    if (cleanup) {
      for (const dispose of cleanup) {
        dispose();
      }
      this.socketCleanup.delete(socket);
    }
  }

  private finishStoppingIfIdle(): void {
    if (this.activeSockets.size > 0 || this.connectingSockets.size > 0) {
      return;
    }

    const wasStopping = this.stopping;
    this.stopping = false;
    this.resolveStopPromise?.();
    this.resolveStopPromise = null;
    this.stopPromise = null;

    if (wasStopping) {
      this.logger.log('[Ellmud] Load simulator: stopped');
    }
  }
}

export function createLoadSimulatorRouter({ loadSimulator }: LoadSimulatorRouterDeps): Router {
  const router = Router();

  router.get('/admin/api/load-simulator/status', adminAuth, (_req: Request, res: Response) => {
    res.json(loadSimulator.getStatus());
  });

  router.post('/admin/api/load-simulator/start', adminAuth, (req: Request, res: Response) => {
    const body = req.body as { connections?: number | string; targetConnections?: number | string } | undefined;
    const rawConnections = body?.connections ?? body?.targetConnections;

    let connections: number | undefined;
    if (rawConnections !== undefined) {
      connections = typeof rawConnections === 'string'
        ? Number.parseInt(rawConnections, 10)
        : rawConnections;

      if (!Number.isFinite(connections) || connections <= 0) {
        res.status(400).json({ error: 'connections must be a positive integer' });
        return;
      }
    }

    const status = loadSimulator.start(connections);
    res.json(status);
  });

  router.post('/admin/api/load-simulator/stop', adminAuth, async (_req: Request, res: Response) => {
    const status = await loadSimulator.stop();
    res.json(status);
  });

  return router;
}

export function createLoadSimulatorShutdownHandler(loadSimulator: Pick<LoadSimulator, 'stop'>): (signal?: string) => Promise<void> {
  let pendingStop: Promise<void> | null = null;

  return async () => {
    if (!pendingStop) {
      pendingStop = loadSimulator.stop().then(() => undefined).finally(() => {
        pendingStop = null;
      });
    }

    await pendingStop;
  };
}

export function registerLoadSimulatorShutdown(
  loadSimulator: Pick<LoadSimulator, 'stop'>,
  registrar: ShutdownRegistrar = process,
): (signal?: string) => Promise<void> {
  const shutdownHandler = createLoadSimulatorShutdownHandler(loadSimulator);

  registrar.once('SIGINT', () => {
    void shutdownHandler('SIGINT');
  });
  registrar.once('SIGTERM', () => {
    void shutdownHandler('SIGTERM');
  });

  return shutdownHandler;
}
