# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages/e2e/tests/connection.spec.ts >> Connection smoke test >> player can connect and see a room description
- Location: packages/e2e/tests/connection.spec.ts:4:7

# Error details

```
Error: Server exited with code 1
```

# Test source

```ts
  1   | /**
  2   |  * Manages the game server lifecycle for E2E tests.
  3   |  *
  4   |  * Starts a fresh server process before each test and tears it down after,
  5   |  * ensuring tests get clean game state (no leftover items, players, etc.).
  6   |  */
  7   | 
  8   | import { type ChildProcess, spawn } from 'node:child_process';
  9   | import { setTimeout as sleep } from 'node:timers/promises';
  10  | import path from 'node:path';
  11  | 
  12  | const SERVER_PORT = 2567;
  13  | const SERVER_READY_PATTERN = /Colyseus server listening/;
  14  | const SERVER_START_TIMEOUT = 30_000;
  15  | 
  16  | export class ServerManager {
  17  |   private process: ChildProcess | null = null;
  18  | 
  19  |   /** Start the game server and wait until it's ready. */
  20  |   async start(): Promise<void> {
  21  |     await this.stop(); // Ensure no leftover process
  22  | 
  23  |     // Playwright cwd is packages/e2e — resolve up to repo root
  24  |     const repoRoot = path.resolve(process.cwd(), '..', '..');
  25  | 
  26  |     this.process = spawn('npx', ['tsx', 'packages/server/src/index.ts'], {
  27  |       cwd: repoRoot,
  28  |       env: {
  29  |         ...process.env,
  30  |         ALLOW_LOCAL_AUTH: 'true',
  31  |         ADMIN_TOKEN: 'ellmud-admin-dev',
  32  |         PORT: String(SERVER_PORT),
  33  |       },
  34  |       stdio: ['ignore', 'pipe', 'pipe'],
  35  |       detached: true,
  36  |     });
  37  | 
  38  |     // Wait for the server ready message
  39  |     await new Promise<void>((resolve, reject) => {
  40  |       const timeout = setTimeout(() => {
  41  |         reject(new Error(`Server did not start within ${SERVER_START_TIMEOUT}ms`));
  42  |       }, SERVER_START_TIMEOUT);
  43  | 
  44  |       const onData = (chunk: Buffer) => {
  45  |         const text = chunk.toString();
  46  |         if (SERVER_READY_PATTERN.test(text)) {
  47  |           clearTimeout(timeout);
  48  |           resolve();
  49  |         }
  50  |       };
  51  | 
  52  |       this.process!.stdout?.on('data', onData);
  53  |       this.process!.stderr?.on('data', onData);
  54  | 
  55  |       this.process!.on('error', (err) => {
  56  |         clearTimeout(timeout);
  57  |         reject(err);
  58  |       });
  59  | 
  60  |       this.process!.on('exit', (code) => {
  61  |         clearTimeout(timeout);
  62  |         if (code !== null && code !== 0) {
> 63  |           reject(new Error(`Server exited with code ${code}`));
      |                  ^ Error: Server exited with code 1
  64  |         }
  65  |       });
  66  |     });
  67  | 
  68  |     // Brief settle for WebSocket listeners to be fully ready
  69  |     await sleep(500);
  70  |   }
  71  | 
  72  |   /** Stop the game server and wait for cleanup. */
  73  |   async stop(): Promise<void> {
  74  |     if (!this.process) return;
  75  | 
  76  |     const proc = this.process;
  77  |     this.process = null;
  78  | 
  79  |     // Kill the process group to clean up child processes (tsx spawns node)
  80  |     try {
  81  |       if (proc.pid) {
  82  |         process.kill(-proc.pid, 'SIGTERM');
  83  |       }
  84  |     } catch {
  85  |       // Process may have already exited
  86  |     }
  87  | 
  88  |     // Wait for the process to exit
  89  |     await new Promise<void>((resolve) => {
  90  |       const timeout = setTimeout(() => {
  91  |         // Force kill if graceful shutdown takes too long
  92  |         try {
  93  |           if (proc.pid) process.kill(-proc.pid, 'SIGKILL');
  94  |         } catch { /* already dead */ }
  95  |         resolve();
  96  |       }, 5_000);
  97  | 
  98  |       proc.on('exit', () => {
  99  |         clearTimeout(timeout);
  100 |         resolve();
  101 |       });
  102 | 
  103 |       // If it already exited, resolve immediately
  104 |       if (proc.exitCode !== null) {
  105 |         clearTimeout(timeout);
  106 |         resolve();
  107 |       }
  108 |     });
  109 | 
  110 |     // Brief pause for port release
  111 |     await sleep(300);
  112 |   }
  113 | }
  114 | 
```