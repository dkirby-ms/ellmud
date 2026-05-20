#!/usr/bin/env tsx
/**
 * External load testing tool for Ellmud.
 *
 * Launches N real browser contexts via Playwright, each navigating to the
 * deployed app and establishing a live Colyseus WebSocket connection. The
 * connections are ramped gradually so KEDA can observe the scaling signal.
 *
 * Usage:
 *   npm run load-test -- --url https://app.example.com --connections 50
 *
 * Optional flags:
 *   --ramp-rate        <n>    Connections to open per second               (default: 2)
 *   --token            <jwt>  Shared auth token for all contexts
 *   --player-id        <id>   Player UUID matching the token above
 *   --username         <str>  Display name stored in localStorage          (default: "load-tester")
 *   --action-interval  <ms>   Base interval between stress actions         (default: 2000)
 *   --stress                  Enable gameplay stress traffic               (default)
 *   --no-stress               Keep connections idle after joining
 *
 * AUTH NOTE
 * ---------
 * The zone page requires valid auth data in localStorage
 * (ellmud_token, ellmud_playerId, ellmud_username, plus an active character
 * selection). This tool handles that in one of two ways:
 *
 *   1. AUTO mode (default): Each virtual user registers a unique account,
 *      creates a character, selects it, then enters /zone. This works when
 *      the target server allows open registration and the "the-reliquary"
 *      starting zone exists. Auto-created accounts are NOT cleaned up
 *      automatically — they will persist on the server.
 *
 *   2. TOKEN mode (--token + --player-id): A single pre-created JWT and
 *      player ID are injected into every context's localStorage. Each
 *      context still creates its own character (one per connection attempt).
 *      Use this when the server has registration disabled. Pre-seed the
 *      token with: POST /auth/register or POST /auth/login.
 */

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): {
  url: string;
  connections: number;
  rampRate: number;
  token: string | undefined;
  playerId: string | undefined;
  username: string;
  stress: boolean;
  actionInterval: number;
} {
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
  const connections = connectionsRaw ? parseInt(connectionsRaw, 10) : 20;
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
  const actionInterval = actionIntervalRaw ? parseInt(actionIntervalRaw, 10) : 2_000;
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

// ---------------------------------------------------------------------------
// Auth helpers (hit the server REST API directly, no browser needed)
// ---------------------------------------------------------------------------

interface AuthResponse {
  token: string;
  playerId: string;
}

interface CharacterSummary {
  id: string;
  name: string;
}

async function loginUser(baseUrl: string, username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) return null as unknown as AuthResponse;
  return (await res.json()) as AuthResponse;
}

async function registerUser(baseUrl: string, username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Registration failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as AuthResponse;
}

/** Try login first; only register if the user doesn't exist yet. */
async function loginOrRegister(baseUrl: string, username: string, password: string): Promise<AuthResponse> {
  const existing = await loginUser(baseUrl, username, password);
  if (existing) return existing;
  return registerUser(baseUrl, username, password);
}

async function listCharacters(baseUrl: string, token: string): Promise<CharacterSummary[]> {
  const res = await fetch(`${baseUrl}/api/characters`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { characters: CharacterSummary[] };
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
  if (!res.ok) {
    throw new Error(`Character creation failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { character: CharacterSummary };
  return body.character;
}

async function selectCharacter(baseUrl: string, token: string, characterId: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/characters/${characterId}/select`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Character select failed (${res.status}): ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// Stress traffic helpers
// ---------------------------------------------------------------------------

const COMMAND_INPUT_SELECTOR = 'input[aria-label="Command input"]';
const CONNECTED_COMMAND_INPUT_SELECTOR = `${COMMAND_INPUT_SELECTOR}:not([disabled])`;
const MOVEMENT_COMMANDS = ['north', 'south', 'east', 'west', 'up', 'down'] as const;
const MOB_TARGETS = ['rat', 'skeleton', 'goblin', 'spider', 'zombie'] as const;
const LOOT_COMMANDS = ['loot', ...MOB_TARGETS.map((target) => `loot ${target}`)] as const;
const TAKE_TARGETS = ['gold', 'potion', 'gem', 'key'] as const;
const STATE_COMMANDS = ['inventory', 'stats'] as const;
const CHAT_MESSAGES = [
  'These halls smell of old bones and fresh trouble.',
  'Keep your blades sharp and your torches dry.',
  'I hear skittering in the dark ahead.',
  'Another delve, another chance at glory.',
  'Mind the shadows — something is hunting here.',
  'The reliquary is lively tonight.',
] as const;

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
  const roll = Math.random();

  if (roll < 0.25) {
    return randomItem(MOVEMENT_COMMANDS);
  }

  if (roll < 0.5) {
    const verb = Math.random() < 0.8 ? 'attack' : 'kill';
    return `${verb} ${randomItem(MOB_TARGETS)}`;
  }

  if (roll < 0.65) {
    return randomItem(LOOT_COMMANDS);
  }

  if (roll < 0.75) {
    return 'look';
  }

  if (roll < 0.85) {
    return `say ${randomItem(CHAT_MESSAGES)} [lt-${userIndex}]`;
  }

  if (roll < 0.9) {
    return randomItem(STATE_COMMANDS);
  }

  if (roll < 0.95) {
    const verb = Math.random() < 0.8 ? 'take' : 'get';
    return `${verb} ${randomItem(TAKE_TARGETS)}`;
  }

  return 'who';
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
  context: BrowserContext | null;
  actionLoop?: Promise<void>;
  stopActions?: () => void;
  close: () => Promise<void>;
}

function startStressLoop(page: Page, user: VirtualUser, actionIntervalMs: number): StressLoopHandle {
  const controller = new AbortController();
  const input = page.locator(COMMAND_INPUT_SELECTOR);

  const runCommand = async (command: string): Promise<void> => {
    if (controller.signal.aborted) {
      return;
    }

    await input.fill(command);
    await input.press('Enter');
  };

  const done = (async () => {
    await runCommand('look');

    while (!controller.signal.aborted) {
      const shouldContinue = await waitWithAbort(nextActionDelay(actionIntervalMs), controller.signal);
      if (!shouldContinue) {
        break;
      }

      await runCommand(buildStressCommand(user.index));
    }
  })().catch((err) => {
    if (controller.signal.aborted) {
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

// ---------------------------------------------------------------------------
// Virtual user — one browser context holding one WebSocket connection
// ---------------------------------------------------------------------------

interface VirtualUserOptions {
  browser: Browser;
  baseUrl: string;
  index: number;
  sharedToken?: string;
  sharedPlayerId?: string;
  sharedUsername: string;
  stressEnabled: boolean;
  actionIntervalMs: number;
}

async function spawnVirtualUser(opts: VirtualUserOptions): Promise<VirtualUser> {
  const {
    browser,
    baseUrl,
    index,
    sharedToken,
    sharedPlayerId,
    sharedUsername,
    stressEnabled,
    actionIntervalMs,
  } = opts;

  const user: VirtualUser = {
    index,
    status: 'connecting',
    context: null,
    close: async () => {
      user.stopActions?.();
      if (user.context) {
        await user.context.close().catch(() => undefined);
        user.context = null;
      }
      await user.actionLoop?.catch(() => undefined);
      if (user.status !== 'failed') {
        user.status = 'closed';
      }
    },
  };

  try {
    // Resolve credentials — either use shared token or auto-register
    let token: string;
    let playerId: string;
    let username: string;

    if (sharedToken && sharedPlayerId) {
      token = sharedToken;
      playerId = sharedPlayerId;
      username = sharedUsername;
    } else {
      // AUTO mode: deterministic credentials per index so accounts are reusable
      username = `loadtest${index}`;
      const password = `Lt!loadtest${index}`;
      const auth = await loginOrRegister(baseUrl, username, password);
      token = auth.token;
      playerId = auth.playerId;
    }

    // Reuse existing character if available, otherwise create one
    const existingChars = await listCharacters(baseUrl, token);
    let character: CharacterSummary;
    if (existingChars.length > 0) {
      character = existingChars[0];
    } else {
      const alpha = 'abcdefghijklmnopqrstuvwxyz';
      const randAlpha = Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * 26)]).join('');
      const characterName = `Lt${randAlpha}${alpha[index % 26]}`;
      character = await createCharacter(baseUrl, token, characterName);
    }
    await selectCharacter(baseUrl, token, character.id);

    // Open a real browser context and inject auth into localStorage
    const context = await browser.newContext({ baseURL: baseUrl });
    user.context = context;
    const page = await context.newPage();

    // Land on root first so we can set localStorage for the origin
    await page.goto('/');
    await page.evaluate(
      ({ t, pid, uname }) => {
        localStorage.setItem('ellmud_token', t);
        localStorage.setItem('ellmud_playerId', pid);
        localStorage.setItem('ellmud_username', uname);
      },
      { t: token, pid: playerId, uname: username },
    );

    // Navigate to /zone — triggers the Colyseus WS join
    await page.goto('/zone');

    // Wait for the command input to appear (= live WS connection established)
    await page.waitForSelector(CONNECTED_COMMAND_INPUT_SELECTOR, {
      timeout: 30_000,
    });

    if (stressEnabled) {
      const stressLoop = startStressLoop(page, user, actionIntervalMs);
      user.stopActions = stressLoop.stop;
      user.actionLoop = stressLoop.done;
    }

    user.status = 'connected';
  } catch (err) {
    user.status = 'failed';
    user.error = err instanceof Error ? err.message : String(err);
    // Don't leave stale contexts around on failure
    await user.close();
  }

  return user;
}

// ---------------------------------------------------------------------------
// Reporter — prints a live status line every N seconds
// ---------------------------------------------------------------------------

function startReporter(users: VirtualUser[], intervalMs = 5_000): NodeJS.Timeout {
  return setInterval(() => {
    const connected = users.filter((u) => u.status === 'connected').length;
    const connecting = users.filter((u) => u.status === 'connecting').length;
    const failed = users.filter((u) => u.status === 'failed').length;
    const closed = users.filter((u) => u.status === 'closed').length;
    console.log(
      `[load-test] connections: ${connected} live | ${connecting} connecting | ${failed} failed | ${closed} closed  (total spawned: ${users.length})`,
    );
  }, intervalMs);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = parseArgs(process.argv);

  console.log(`[load-test] Target: ${config.url}`);
  console.log(`[load-test] Connections: ${config.connections} (ramp: ${config.rampRate}/s)`);
  console.log(
    `[load-test] Stress traffic: ${config.stress ? `enabled (${config.actionInterval}ms base interval)` : 'disabled'}`,
  );
  if (config.token) {
    console.log('[load-test] Auth mode: TOKEN (shared credentials)');
  } else {
    console.log('[load-test] Auth mode: AUTO (self-registering per connection)');
    console.log('[load-test] NOTE: Accounts use deterministic names (loadtest0, loadtest1, ...) and are reused across runs.');
  }

  const browser = await chromium.launch({ headless: true });
  const users: VirtualUser[] = [];
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[load-test] ${signal} received — closing ${users.length} connection(s)…`);
    if (reporterHandle) clearInterval(reporterHandle);
    await Promise.allSettled(users.map((u) => u.close()));
    await browser.close();
    const connected = users.filter((u) => u.status === 'connected').length;
    const failed = users.filter((u) => u.status === 'failed').length;
    console.log(`[load-test] Shutdown complete. ${connected} were live, ${failed} failed.`);
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  const reporterHandle = startReporter(users);

  // Ramp connections: spawn `rampRate` per second until we hit the target
  let spawned = 0;

  const ramp = async (): Promise<void> => {
    while (spawned < config.connections && !shuttingDown) {
      const batchSize = Math.min(config.rampRate, config.connections - spawned);
      const batch: Promise<VirtualUser>[] = [];

      for (let i = 0; i < batchSize; i += 1) {
        const idx = spawned++;
        batch.push(
          spawnVirtualUser({
            browser,
            baseUrl: config.url,
            index: idx,
            sharedToken: config.token,
            sharedPlayerId: config.playerId,
            sharedUsername: config.username,
            stressEnabled: config.stress,
            actionIntervalMs: config.actionInterval,
          }),
        );
      }

      const results = await Promise.allSettled(batch);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          users.push(result.value);
          if (result.value.status === 'connected') {
            console.log(`[load-test] User ${result.value.index} connected (${users.filter((u) => u.status === 'connected').length} live)`);
          } else {
            console.warn(`[load-test] User ${result.value.index} FAILED: ${result.value.error}`);
          }
        } else {
          console.warn(`[load-test] Spawn promise rejected: ${result.reason}`);
        }
      }

      if (spawned < config.connections && !shuttingDown) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }

    if (!shuttingDown) {
      const connected = users.filter((u) => u.status === 'connected').length;
      console.log(`[load-test] Ramp complete. ${connected}/${config.connections} connections live. Holding… (Ctrl+C to stop)`);
    }
  };

  await ramp();

  // Hold indefinitely until SIGINT/SIGTERM
  await new Promise<void>((resolve) => {
    if (shuttingDown) resolve();
    process.once('SIGINT', () => resolve());
    process.once('SIGTERM', () => resolve());
  });
}

main().catch((err) => {
  console.error('[load-test] Fatal error:', err);
  process.exit(1);
});
