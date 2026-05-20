#!/usr/bin/env tsx
/**
 * Lightweight WebSocket load testing tool for Ellmud.
 *
 * Uses raw HTTP auth/character APIs plus the Colyseus JS SDK — no browser.
 * This keeps per-user memory low enough for high-connection fan-out runs.
 */

import { Client, type Room } from '@colyseus/sdk';
import { MessageTypes, type CommandMessage } from '../../shared/src/index.ts';

interface LoadTestConfig {
  url: string;
  connections: number;
  rampRate: number;
  token?: string;
  playerId?: string;
  username: string;
  stress: boolean;
  actionInterval: number;
}

function parseArgs(argv: string[]): LoadTestConfig {
  const args = argv.slice(2);
  const get = (flag: string): string | undefined => {
    for (let idx = args.length - 2; idx >= 0; idx -= 1) {
      if (args[idx] === flag) {
        return args[idx + 1];
      }
    }
    return undefined;
  };
  const has = (flag: string): boolean => args.includes(flag);

  const url = get('--url');
  if (!url) {
    console.error('Error: --url <target-url> is required.');
    process.exit(1);
  }

  const connectionsRaw = get('--connections');
  const connections = connectionsRaw ? parseInt(connectionsRaw, 10) : 10;
  if (!Number.isFinite(connections) || connections <= 0) {
    console.error('Error: --connections must be a positive integer.');
    process.exit(1);
  }

  const rampRateRaw = get('--ramp-rate');
  const rampRate = rampRateRaw ? parseInt(rampRateRaw, 10) : 2;
  if (!Number.isFinite(rampRate) || rampRate <= 0) {
    console.error('Error: --ramp-rate must be a positive integer.');
    process.exit(1);
  }

  const actionIntervalRaw = get('--action-interval');
  const actionInterval = actionIntervalRaw ? parseInt(actionIntervalRaw, 10) : 3_000;
  if (!Number.isFinite(actionInterval) || actionInterval <= 0) {
    console.error('Error: --action-interval must be a positive integer (milliseconds).');
    process.exit(1);
  }

  return {
    url: url.replace(/\/$/, ''),
    connections,
    rampRate,
    token: get('--token'),
    playerId: get('--player-id'),
    username: get('--username') ?? 'load-tester',
    stress: has('--no-stress') ? false : true,
    actionInterval,
  };
}

interface AuthResponse {
  token: string;
  playerId: string;
}

interface CharacterSummary {
  id: string;
  name: string;
}

interface SpawnZoneResponse {
  target: string;
}

async function expectJson<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${context} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function loginUser(baseUrl: string, username: string, password: string): Promise<AuthResponse | null> {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as AuthResponse;
}

async function registerUser(baseUrl: string, username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return expectJson<AuthResponse>(res, 'Registration');
}

async function loginOrRegister(baseUrl: string, username: string, password: string): Promise<AuthResponse> {
  const existing = await loginUser(baseUrl, username, password);
  if (existing) {
    return existing;
  }
  return registerUser(baseUrl, username, password);
}

async function listCharacters(baseUrl: string, token: string): Promise<CharacterSummary[]> {
  const res = await fetch(`${baseUrl}/api/characters`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return [];
  }
  const body = (await res.json()) as { characters?: CharacterSummary[] };
  return body.characters ?? [];
}

async function createCharacter(baseUrl: string, token: string, name: string): Promise<CharacterSummary> {
  const res = await fetch(`${baseUrl}/api/characters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, startingZoneSlug: 'the-reliquary' }),
  });
  const body = await expectJson<{ character: CharacterSummary }>(res, 'Character creation');
  return body.character;
}

async function selectCharacter(baseUrl: string, token: string, characterId: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/characters/${characterId}/select`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  await expectJson<{ message: string }>(res, 'Character select');
}

async function fetchSpawnZone(baseUrl: string, token: string): Promise<SpawnZoneResponse> {
  const res = await fetch(`${baseUrl}/api/spawn-zone`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return expectJson<SpawnZoneResponse>(res, 'Spawn-zone lookup');
}

const MOVEMENT_COMMANDS = ['north', 'south', 'east', 'west', 'up', 'down'] as const;
const CHAT_MESSAGES = [
  'status check from the load test',
  'watching websocket pressure rise',
  'keda should see this crowd soon',
  'roaming the reliquary for science',
  'colyseus is getting a proper workout',
  'another synthetic traveler arrives',
] as const;
const DIRECTION_ALIASES: Record<string, [string, string]> = {
  n: ['go', 'north'],
  s: ['go', 'south'],
  e: ['go', 'east'],
  w: ['go', 'west'],
  u: ['go', 'up'],
  d: ['go', 'down'],
  north: ['go', 'north'],
  south: ['go', 'south'],
  east: ['go', 'east'],
  west: ['go', 'west'],
  up: ['go', 'up'],
  down: ['go', 'down'],
};

function randomItem<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) {
    throw new Error('randomItem requires a non-empty array.');
  }
  return item;
}

function nextActionDelay(baseIntervalMs: number): number {
  const jitterMultiplier = 0.5 + Math.random();
  return Math.max(500, Math.round(baseIntervalMs * jitterMultiplier));
}

async function waitWithAbort(ms: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) {
    return false;
  }

  return await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timer);
      resolve(false);
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function buildStressCommand(userIndex: number): string {
  if (Math.random() < 0.5) {
    return randomItem(MOVEMENT_COMMANDS);
  }

  return `say ${randomItem(CHAT_MESSAGES)} [lt-${userIndex}]`;
}

function parseRawCommand(input: string): CommandMessage {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  let verb = parts[0]?.toLowerCase() ?? '';
  let args = parts.slice(1);

  const alias = DIRECTION_ALIASES[verb];
  if (alias) {
    verb = alias[0];
    args = [alias[1]];
  }

  return { verb, args };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timeout) {
        clearTimeout(timeout);
      }
    }),
    new Promise<T>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

function getWsCandidates(baseUrl: string): string[] {
  const url = new URL(baseUrl);
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const sameHost = `${wsProtocol}//${url.host}`;
  const devHost = `${wsProtocol}//${url.hostname}:2567`;
  const preferDevHost = url.protocol === 'http:' && (!url.port || url.port === '3000');
  const ordered = preferDevHost ? [devHost, sameHost] : [sameHost, devHost];
  return ordered.filter((candidate, index) => ordered.indexOf(candidate) === index);
}

async function joinZoneRoom(
  wsCandidates: string[],
  roomName: string,
  token: string,
  characterId: string,
): Promise<{ room: Room; wsEndpoint: string }> {
  const failures: string[] = [];

  for (const wsEndpoint of wsCandidates) {
    try {
      const client = new Client(wsEndpoint);
      const room = await withTimeout(
        client.joinOrCreate(roomName, { token, characterId }),
        10_000,
        `Join ${roomName} via ${wsEndpoint}`,
      );
      return { room, wsEndpoint };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${wsEndpoint}: ${message}`);
    }
  }

  throw new Error(`Zone join failed. ${failures.join(' | ')}`);
}

type ConnectionStatus = 'connecting' | 'connected' | 'failed' | 'closed';

interface StressLoopHandle {
  stop: () => void;
  done: Promise<void>;
}

interface VirtualUser {
  index: number;
  status: ConnectionStatus;
  error?: string;
  room: Room | null;
  connectPromise?: Promise<void>;
  actionLoop?: Promise<void>;
  stopActions?: () => void;
  closing: boolean;
  close: () => Promise<void>;
}

interface VirtualUserOptions {
  baseUrl: string;
  wsCandidates: string[];
  index: number;
  sharedToken?: string;
  sharedPlayerId?: string;
  stressEnabled: boolean;
  actionIntervalMs: number;
  users: VirtualUser[];
}

function countUsers(users: VirtualUser[], status: ConnectionStatus): number {
  return users.filter((user) => user.status === status).length;
}

function startStressLoop(room: Room, user: VirtualUser, actionIntervalMs: number): StressLoopHandle {
  const controller = new AbortController();

  const done = (async () => {
    while (!controller.signal.aborted) {
      const shouldContinue = await waitWithAbort(nextActionDelay(actionIntervalMs), controller.signal);
      if (!shouldContinue || user.closing) {
        break;
      }

      const command = parseRawCommand(buildStressCommand(user.index));
      room.send(MessageTypes.COMMAND, command);
    }
  })().catch((err) => {
    if (controller.signal.aborted || user.closing) {
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    user.error = `Stress loop failed: ${message}`;
    if (user.status === 'connected') {
      user.status = 'closed';
    }
    console.warn(`[load-test] User ${user.index} stress loop stopped: ${message}`);
  });

  return {
    stop: () => controller.abort(),
    done,
  };
}

async function connectVirtualUser(user: VirtualUser, opts: VirtualUserOptions): Promise<void> {
  const {
    baseUrl,
    wsCandidates,
    index,
    sharedToken,
    sharedPlayerId,
    stressEnabled,
    actionIntervalMs,
    users,
  } = opts;

  try {
    let token: string;

    if (sharedToken && sharedPlayerId) {
      token = sharedToken;
    } else {
      const username = `loadtest${index}`;
      const password = `Lt!loadtest${index}`;
      const auth = await loginOrRegister(baseUrl, username, password);
      token = auth.token;
    }

    if (user.closing) {
      return;
    }

    const existingChars = await listCharacters(baseUrl, token);
    let character: CharacterSummary;
    if (existingChars.length > 0) {
      character = existingChars[0]!;
    } else {
      const alpha = 'abcdefghijklmnopqrstuvwxyz';
      const randAlpha = Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('');
      const characterName = `Lt${randAlpha}${alpha[index % alpha.length]}`;
      character = await createCharacter(baseUrl, token, characterName);
    }

    await selectCharacter(baseUrl, token, character.id);
    const spawnZone = await fetchSpawnZone(baseUrl, token);

    if (user.closing) {
      return;
    }

    const { room, wsEndpoint } = await joinZoneRoom(wsCandidates, spawnZone.target, token, character.id);
    if (user.closing) {
      await room.leave().catch(() => undefined);
      return;
    }

    user.room = room;
    room.onError((code, message) => {
      user.error = `Room error ${code}: ${message ?? 'Unknown error'}`;
      if (user.status === 'connecting') {
        user.status = 'failed';
      } else if (!user.closing && user.status === 'connected') {
        user.status = 'closed';
      }
      console.warn(`[load-test] User ${user.index} room error: ${user.error}`);
    });
    room.onLeave((code) => {
      if (user.status !== 'failed' && user.status !== 'closed') {
        user.status = 'closed';
      }
      if (!user.closing) {
        console.warn(`[load-test] User ${user.index} disconnected (code ${code}).`);
      }
    });

    if (stressEnabled) {
      const stressLoop = startStressLoop(room, user, actionIntervalMs);
      user.stopActions = stressLoop.stop;
      user.actionLoop = stressLoop.done;
    }

    user.status = 'connected';
    console.log(`[load-test] User ${user.index} connected (${countUsers(users, 'connected')} live) via ${wsEndpoint}`);
  } catch (err) {
    user.status = 'failed';
    user.error = err instanceof Error ? err.message : String(err);
    console.warn(`[load-test] User ${user.index} FAILED: ${user.error}`);
    await user.close();
  }
}

function createVirtualUser(opts: VirtualUserOptions): VirtualUser {
  const user: VirtualUser = {
    index: opts.index,
    status: 'connecting',
    room: null,
    closing: false,
    close: async () => {
      if (user.closing) {
        return;
      }
      user.closing = true;
      user.stopActions?.();
      await user.actionLoop?.catch(() => undefined);
      const room = user.room;
      user.room = null;
      if (room) {
        await room.leave().catch(() => undefined);
      }
      if (user.status !== 'failed') {
        user.status = 'closed';
      }
    },
  };

  user.connectPromise = connectVirtualUser(user, opts);
  return user;
}

function startReporter(users: VirtualUser[], intervalMs = 5_000): NodeJS.Timeout {
  return setInterval(() => {
    const connected = countUsers(users, 'connected');
    const connecting = countUsers(users, 'connecting');
    const failed = countUsers(users, 'failed');
    const closed = countUsers(users, 'closed');
    console.log(
      `[load-test] connections: ${connected} live | ${connecting} connecting | ${failed} failed | ${closed} closed (total spawned: ${users.length})`,
    );
  }, intervalMs);
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  const wsCandidates = getWsCandidates(config.url);

  console.log(`[load-test] Target: ${config.url}`);
  console.log(`[load-test] Connections: ${config.connections} (ramp: ${config.rampRate}/s)`);
  console.log(`[load-test] Stress traffic: ${config.stress ? `enabled (${config.actionInterval}ms base interval)` : 'disabled'}`);
  console.log(`[load-test] WS candidates: ${wsCandidates.join(', ')}`);
  if (config.token) {
    console.log('[load-test] Auth mode: TOKEN (shared credentials)');
  } else {
    console.log('[load-test] Auth mode: AUTO (self-registering per connection)');
    console.log('[load-test] NOTE: Accounts use deterministic names (loadtest0, loadtest1, ...) and are reused across runs.');
  }

  const users: VirtualUser[] = [];
  let shuttingDown = false;
  const reporterHandle = startReporter(users);

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`\n[load-test] ${signal} received — closing ${users.length} connection(s)…`);
    clearInterval(reporterHandle);
    await Promise.allSettled(users.map((user) => user.close()));
    const connected = countUsers(users, 'connected');
    const failed = countUsers(users, 'failed');
    console.log(`[load-test] Shutdown complete. ${connected} were live, ${failed} failed.`);
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  while (users.length < config.connections && !shuttingDown) {
    const batchSize = Math.min(config.rampRate, config.connections - users.length);
    for (let i = 0; i < batchSize; i += 1) {
      const user = createVirtualUser({
        baseUrl: config.url,
        wsCandidates,
        index: users.length,
        sharedToken: config.token,
        sharedPlayerId: config.playerId,
        stressEnabled: config.stress,
        actionIntervalMs: config.actionInterval,
        users,
      });
      users.push(user);
    }

    if (users.length < config.connections && !shuttingDown) {
      await sleep(1_000);
    }
  }

  if (!shuttingDown) {
    console.log(`[load-test] Ramp complete. ${countUsers(users, 'connected')}/${config.connections} connections live. Holding… (Ctrl+C to stop)`);
  }

  await new Promise<void>((resolve) => {
    if (shuttingDown) {
      resolve();
      return;
    }
    process.once('SIGINT', () => resolve());
    process.once('SIGTERM', () => resolve());
  });
}

main().catch((err) => {
  console.error('[load-test] Fatal error:', err);
  process.exit(1);
});
