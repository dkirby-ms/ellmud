/**
 * Manages the game server lifecycle for E2E tests.
 *
 * Starts a fresh server process before each test and tears it down after,
 * ensuring tests get clean game state (no leftover items, players, etc.).
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const SERVER_PORT = 2567;
const SERVER_READY_PATTERN = /Colyseus server listening/;
const SERVER_START_TIMEOUT = 30_000;

export class ServerManager {
  private process: ChildProcess | null = null;

  /** Start the game server and wait until it's ready. */
  async start(): Promise<void> {
    await this.stop(); // Ensure no leftover process

    // Playwright cwd is packages/e2e — resolve up to repo root
    const repoRoot = path.resolve(process.cwd(), '..', '..');

    this.process = spawn('npx', ['tsx', 'packages/server/src/index.ts'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ALLOW_LOCAL_AUTH: 'true',
        ADMIN_TOKEN: 'ellmud-admin-dev',
        PORT: String(SERVER_PORT),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    // Wait for the server ready message
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Server did not start within ${SERVER_START_TIMEOUT}ms`));
      }, SERVER_START_TIMEOUT);

      const onData = (chunk: Buffer) => {
        const text = chunk.toString();
        if (SERVER_READY_PATTERN.test(text)) {
          clearTimeout(timeout);
          resolve();
        }
      };

      this.process!.stdout?.on('data', onData);
      this.process!.stderr?.on('data', onData);

      this.process!.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.process!.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== null && code !== 0) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });

    // Brief settle for WebSocket listeners to be fully ready
    await sleep(500);
  }

  /** Stop the game server and wait for cleanup. */
  async stop(): Promise<void> {
    if (!this.process) return;

    const proc = this.process;
    this.process = null;

    // Kill the process group to clean up child processes (tsx spawns node)
    try {
      if (proc.pid) {
        process.kill(-proc.pid, 'SIGTERM');
      }
    } catch {
      // Process may have already exited
    }

    // Wait for the process to exit
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown takes too long
        try {
          if (proc.pid) process.kill(-proc.pid, 'SIGKILL');
        } catch { /* already dead */ }
        resolve();
      }, 5_000);

      proc.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      // If it already exited, resolve immediately
      if (proc.exitCode !== null) {
        clearTimeout(timeout);
        resolve();
      }
    });

    // Brief pause for port release
    await sleep(300);
  }
}
