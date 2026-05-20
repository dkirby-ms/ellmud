#!/usr/bin/env tsx
/**
 * Lightweight WebSocket load testing tool for Ellmud.
 *
 * Uses raw HTTP auth/character APIs plus the Colyseus JS SDK — no browser.
 * This keeps per-user memory low enough for high-connection fan-out runs.
 */

import { Client, type Room } from '@colyseus/sdk';
import { MessageTypes, type CommandMessage } from '@ellmud/shared';

const KNOWN_ROOM_MESSAGE_TYPES = [
  MessageTypes.NARRATE,
  MessageTypes.ROOM_HEADER,
  MessageTypes.ZONE_STATE,
  MessageTypes.COMBAT_RESULT,
  MessageTypes.PLAYER_STATE,
  MessageTypes.TELEGRAPH,
  MessageTypes.OVERLAY_STATE,
  MessageTypes.STASH_UPDATE,
  MessageTypes.LOADOUT_UPDATE,
  MessageTypes.INVENTORY_UPDATE,
  MessageTypes.ROOM_SWITCH,
  MessageTypes.ZONE_TRANSFER,
  MessageTypes.EXPLORATION_DATA,
  MessageTypes.EXPLORATION_UPDATE,
  MessageTypes.ROOM_OCCUPANTS,
  MessageTypes.FLAG_STATE,
  MessageTypes.EFFECTIVE_STATS,
  MessageTypes.COMBAT_STATE,
  MessageTypes.PLAYER_LIST,
  MessageTypes.HELP_DATA,
] as const;

const QUIET_SDK_NOISE_PATTERNS = [
  '@colyseus/sdk: onMessage() not registered',
  'Room connection was closed unexpectedly',
] as const;

interface LoadTestConfig {
  url: string;
  connections: number;
  rampRate: number;
  token?: string;
  playerId?: string;
  username: string;
  stress: boolean;
  actionInterval: number;
  joinTimeoutMs: number;
  quiet: boolean;
  reconnect: boolean;
  reconnectAttempts: number;
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

  const joinTimeoutRaw = get('--join-timeout');
  const joinTimeoutMs = joinTimeoutRaw ? parseInt(joinTimeoutRaw, 10) : 30_000;
  if (!Number.isFinite(joinTimeoutMs) || joinTimeoutMs <= 0) {
    console.error('Error: --join-timeout must be a positive integer (milliseconds).');
    process.exit(1);
  }

  const reconnectAttemptsRaw = get('--reconnect-attempts');
  const reconnectAttempts = reconnectAttemptsRaw ? parseInt(reconnectAttemptsRaw, 10) : 1;
  if (!Number.isFinite(reconnectAttempts) || reconnectAttempts < 0) {
    console.error('Error: --reconnect-attempts must be a non-negative integer.');
    process.exit(1);
  }

  return {
    url: url.replace(/\/$/, ''),
    connections,
    rampRate,
    token: get('--token'),
    playerId: get('--player-id'),
    username: get('--username') ?? 'loadtest',
    stress: has('--no-stress') ? false : true,
    actionInterval,
    joinTimeoutMs,
    quiet: has('--quiet'),
    reconnect: has('--no-reconnect') ? false : reconnectAttempts > 0,
    reconnectAttempts,
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

interface UserSession {
  token: string;
  characterId: string;
  roomName: string;
}

interface HarnessStats {
  successfulJoins: number;
  usersEverConnected: number;
  totalConnectMs: number;
  unexpectedDisconnects: number;
  disconnect4002: number;
  joinRetries: number;
  reconnectAttempts: number;
  reconnectSuccesses: number;
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

function registerNoopMessageHandlers(room: Room): void {
  for (const type of KNOWN_ROOM_MESSAGE_TYPES) {
    room.onMessage(type, () => undefined);
  }
}

function shouldSuppressSdkNoise(line: string): boolean {
  return QUIET_SDK_NOISE_PATTERNS.some((pattern) => line.includes(pattern));
}

function installQuietSdkFilter(enabled: boolean): void {
  if (!enabled) {
    return;
  }

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    const line = args.map((arg) => String(arg)).join(' ');
    if (shouldSuppressSdkNoise(line)) {
      return;
    }
    originalWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    const line = args.map((arg) => String(arg)).join(' ');
    if (shouldSuppressSdkNoise(line)) {
      return;
    }
    originalError(...args);
  };
}

async function joinZoneRoom(
  wsCandidates: string[],
  roomName: string,
  token: string,
  characterId: string,
  joinTimeoutMs: number,
): Promise<{ room: Room; wsEndpoint: string; attemptCount: number }> {
  const failures: string[] = [];
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    for (const wsEndpoint of wsCandidates) {
      try {
        const client = new Client(wsEndpoint);
        const room = await withTimeout(
          client.joinOrCreate(roomName, { token, characterId }),
          joinTimeoutMs,
          `Join ${roomName} via ${wsEndpoint}`,
        );
        return { room, wsEndpoint, attemptCount: attempt };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`attempt ${attempt} ${wsEndpoint}: ${message}`);
      }
    }

    if (attempt < maxAttempts) {
      await sleep(1_000 * attempt);
    }
  }

  throw new Error(`Zone join failed. ${failures.join(' | ')}`);
}

type ConnectionStatus = 'connecting' | 'connected' | 'failed' | 'closed';
type ConnectReason = 'initial' | 'reconnect';

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
  reconnectPromise?: Promise<void>;
  actionLoop?: Promise<void>;
  stopActions?: () => void;
  closing: boolean;
  reconnectCount: number;
  everConnected: boolean;
  session?: UserSession;
  close: () => Promise<void>;
}

interface VirtualUserOptions {
  baseUrl: string;
  wsCandidates: string[];
  index: number;
  sharedToken?: string;
  sharedPlayerId?: string;
  usernamePrefix: string;
  stressEnabled: boolean;
  actionIntervalMs: number;
  joinTimeoutMs: number;
  reconnectEnabled: boolean;
  reconnectAttempts: number;
  quiet: boolean;
  users: VirtualUser[];
  stats: HarnessStats;
}

function countUsers(users: VirtualUser[], status: ConnectionStatus): number {
  return users.filter((user) => user.status === status).length;
}

function countUsersEverConnected(users: VirtualUser[]): number {
  return users.filter((user) => user.everConnected).length;
}

function averageConnectTimeMs(stats: HarnessStats): number {
  if (stats.successfulJoins === 0) {
    return 0;
  }
  return Math.round(stats.totalConnectMs / stats.successfulJoins);
}

function nextReconnectDelay(attempt: number): number {
  return Math.min(5_000, attempt * 1_000);
}

function startStressLoop(room: Room, user: VirtualUser, actionIntervalMs: number): StressLoopHandle {
  const controller = new AbortController();

  const done = (async () => {
    while (!controller.signal.aborted) {
      const shouldContinue = await waitWithAbort(nextActionDelay(actionIntervalMs), controller.signal);
      if (!shouldContinue || user.closing || user.room !== room) {
        break;
      }

      const command = parseRawCommand(buildStressCommand(user.index));
      room.send(MessageTypes.COMMAND, command);
    }
  })().catch((err) => {
    if (controller.signal.aborted || user.closing || user.room !== room) {
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

async function prepareUserSession(user: VirtualUser, opts: VirtualUserOptions): Promise<UserSession> {
  const { baseUrl, index, sharedToken, sharedPlayerId, usernamePrefix } = opts;

  let token: string;

  if (sharedToken && sharedPlayerId) {
    token = sharedToken;
  } else {
    const username = `${usernamePrefix}${index}`;
    const password = `Lt!${usernamePrefix}${index}`;
    const auth = await loginOrRegister(baseUrl, username, password);
    token = auth.token;
  }

  if (user.closing) {
    throw new Error('User was closed before session bootstrap completed.');
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

  return {
    token,
    characterId: character.id,
    roomName: spawnZone.target,
  };
}

function stopUserActions(user: VirtualUser): void {
  user.stopActions?.();
  user.stopActions = undefined;
  user.actionLoop = undefined;
}

function startUserActions(user: VirtualUser, opts: VirtualUserOptions, room: Room): void {
  stopUserActions(user);
  if (!opts.stressEnabled) {
    return;
  }

  const stressLoop = startStressLoop(room, user, opts.actionIntervalMs);
  user.stopActions = stressLoop.stop;
  user.actionLoop = stressLoop.done;
}

async function finalizeUnexpectedDisconnect(user: VirtualUser, code: number, opts: VirtualUserOptions): Promise<void> {
  const canReconnect = opts.reconnectEnabled && user.session && user.reconnectCount < opts.reconnectAttempts;

  if (!canReconnect) {
    user.status = 'failed';
    user.error = `Disconnected unexpectedly (code ${code}).`;
    if (!opts.quiet) {
      console.warn(`[load-test] User ${user.index} disconnected unexpectedly (code ${code}).`);
    }
    return;
  }

  const attempt = user.reconnectCount + 1;
  user.reconnectCount = attempt;
  opts.stats.reconnectAttempts += 1;
  user.status = 'connecting';

  const reconnectPromise = (async () => {
    const delayMs = nextReconnectDelay(attempt);
    if (!opts.quiet) {
      console.log(`[load-test] User ${user.index} reconnecting after code ${code} (attempt ${attempt}/${opts.reconnectAttempts}) in ${delayMs}ms…`);
    }
    await sleep(delayMs);

    if (user.closing || !user.session) {
      return;
    }

    try {
      await establishRoomConnection(user, opts, user.session, 'reconnect');
      opts.stats.reconnectSuccesses += 1;
    } catch (err) {
      user.status = 'failed';
      user.error = err instanceof Error ? err.message : String(err);
      if (!opts.quiet) {
        console.warn(`[load-test] User ${user.index} reconnect FAILED: ${user.error}`);
      }
    }
  })().finally(() => {
    if (user.reconnectPromise === reconnectPromise) {
      user.reconnectPromise = undefined;
    }
  });

  user.reconnectPromise = reconnectPromise;
  await reconnectPromise;
}

function bindRoomLifecycle(room: Room, user: VirtualUser, opts: VirtualUserOptions): void {
  registerNoopMessageHandlers(room);

  room.onError((code, message) => {
    if (user.room !== room) {
      return;
    }

    user.error = `Room error ${code}: ${message ?? 'Unknown error'}`;
    if (user.status === 'connecting') {
      user.status = 'failed';
      if (!opts.quiet) {
        console.warn(`[load-test] User ${user.index} room error: ${user.error}`);
      }
    }
  });

  room.onLeave((code) => {
    if (user.room !== room) {
      return;
    }

    stopUserActions(user);
    user.room = null;

    if (user.closing || code === 1000) {
      if (user.status !== 'failed') {
        user.status = 'closed';
      }
      return;
    }

    opts.stats.unexpectedDisconnects += 1;
    if (code === 4002) {
      opts.stats.disconnect4002 += 1;
    }

    void finalizeUnexpectedDisconnect(user, code, opts);
  });
}

async function establishRoomConnection(
  user: VirtualUser,
  opts: VirtualUserOptions,
  session: UserSession,
  reason: ConnectReason,
): Promise<void> {
  const connectStartedAt = Date.now();
  user.status = 'connecting';

  const { room, wsEndpoint, attemptCount } = await joinZoneRoom(
    opts.wsCandidates,
    session.roomName,
    session.token,
    session.characterId,
    opts.joinTimeoutMs,
  );

  if (user.closing) {
    await room.leave().catch(() => undefined);
    return;
  }

  user.session = session;
  user.room = room;
  bindRoomLifecycle(room, user, opts);
  startUserActions(user, opts, room);
  user.status = 'connected';

  if (attemptCount > 1) {
    opts.stats.joinRetries += attemptCount - 1;
  }

  if (!user.everConnected) {
    user.everConnected = true;
    opts.stats.usersEverConnected += 1;
  }

  opts.stats.successfulJoins += 1;
  opts.stats.totalConnectMs += Date.now() - connectStartedAt;

  const liveUsers = countUsers(opts.users, 'connected');
  const action = reason === 'reconnect' ? 'reconnected' : 'connected';
  console.log(`[load-test] User ${user.index} ${action} (${liveUsers} live) via ${wsEndpoint}`);
}

async function connectVirtualUser(user: VirtualUser, opts: VirtualUserOptions): Promise<void> {
  try {
    const session = await prepareUserSession(user, opts);
    if (user.closing) {
      return;
    }

    await establishRoomConnection(user, opts, session, 'initial');
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
    reconnectCount: 0,
    everConnected: false,
    close: async () => {
      if (user.closing) {
        return;
      }
      user.closing = true;
      stopUserActions(user);
      await user.reconnectPromise?.catch(() => undefined);
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

function printReporterLine(users: VirtualUser[], stats: HarnessStats): void {
  const connected = countUsers(users, 'connected');
  const connecting = countUsers(users, 'connecting');
  const failed = countUsers(users, 'failed');
  const closed = countUsers(users, 'closed');
  console.log(
    `[load-test] connections: ${connected} live | ${connecting} connecting | ${failed} failed | ${closed} closed | ${stats.unexpectedDisconnects} disconnects (4002: ${stats.disconnect4002}) | avg connect ${averageConnectTimeMs(stats)}ms | total spawned: ${users.length}`,
  );
}

function startReporter(users: VirtualUser[], stats: HarnessStats, intervalMs = 5_000): NodeJS.Timeout {
  return setInterval(() => {
    printReporterLine(users, stats);
  }, intervalMs);
}

function printSummary(users: VirtualUser[], stats: HarnessStats): void {
  const failed = countUsers(users, 'failed');
  console.log(
    `[load-test] Summary: spawned ${users.length} | connected ${countUsersEverConnected(users)} | failed ${failed} | disconnected ${stats.unexpectedDisconnects} (4002: ${stats.disconnect4002}) | avg connect ${averageConnectTimeMs(stats)}ms | join retries ${stats.joinRetries} | reconnects ${stats.reconnectSuccesses}/${stats.reconnectAttempts}`,
  );
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  installQuietSdkFilter(config.quiet);

  const wsCandidates = getWsCandidates(config.url);
  const stats: HarnessStats = {
    successfulJoins: 0,
    usersEverConnected: 0,
    totalConnectMs: 0,
    unexpectedDisconnects: 0,
    disconnect4002: 0,
    joinRetries: 0,
    reconnectAttempts: 0,
    reconnectSuccesses: 0,
  };

  console.log(`[load-test] Target: ${config.url}`);
  console.log(`[load-test] Connections: ${config.connections} (ramp: ${config.rampRate}/s)`);
  console.log(`[load-test] Stress traffic: ${config.stress ? `enabled (${config.actionInterval}ms base interval)` : 'disabled'}`);
  console.log(`[load-test] Join timeout: ${config.joinTimeoutMs}ms`);
  console.log(`[load-test] Reconnects: ${config.reconnect ? `enabled (${config.reconnectAttempts} attempt(s))` : 'disabled'}`);
  console.log(`[load-test] Logging: ${config.quiet ? 'quiet SDK noise filtering enabled' : 'standard'}`);
  console.log(`[load-test] WS candidates: ${wsCandidates.join(', ')}`);
  if (config.token) {
    console.log('[load-test] Auth mode: TOKEN (shared credentials)');
  } else {
    console.log('[load-test] Auth mode: AUTO (self-registering per connection)');
    console.log(`[load-test] NOTE: Accounts use deterministic names (${config.username}0, ${config.username}1, ...) and are reused across runs.`);
  }

  const users: VirtualUser[] = [];
  let shuttingDown = false;
  const reporterHandle = startReporter(users, stats);

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`\n[load-test] ${signal} received — closing ${users.length} connection(s)…`);
    clearInterval(reporterHandle);
    await Promise.allSettled(users.map((user) => user.close()));
    printSummary(users, stats);
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
        usernamePrefix: config.username,
        stressEnabled: config.stress,
        actionIntervalMs: config.actionInterval,
        joinTimeoutMs: config.joinTimeoutMs,
        reconnectEnabled: config.reconnect,
        reconnectAttempts: config.reconnectAttempts,
        quiet: config.quiet,
        users,
        stats,
      });
      users.push(user);
    }

    if (users.length < config.connections && !shuttingDown) {
      await sleep(1_000);
    }
  }

  if (!shuttingDown) {
    console.log(`[load-test] Ramp complete. ${countUsers(users, 'connected')}/${config.connections} connections live. Holding… (Ctrl+C to stop)`);
    printReporterLine(users, stats);
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
