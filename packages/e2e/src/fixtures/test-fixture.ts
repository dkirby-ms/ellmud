import { test as base } from '@playwright/test';
import { PlayerFixture } from './player-fixture.js';

/**
 * Extended Playwright test fixture that provides a `createPlayer()` factory.
 *
 * Each call to `createPlayer(name)` spins up a fully-connected player:
 *   1. Registers a unique account (local auth)
 *   2. Injects the auth token into the browser context
 *   3. Creates a character in the-reliquary
 *   4. Navigates to /zone and waits for the WebSocket connection
 *
 * All players are cleaned up automatically after the test.
 */
export const test = base.extend<{
  createPlayer: (name: string, zone?: string) => Promise<PlayerFixture>;
}>({
  createPlayer: async ({ browser }, use) => {
    const players: PlayerFixture[] = [];

    await use(async (name: string, zone = 'the-reliquary') => {
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const username = `test_${name}_${suffix}`;
      const password = 'testpass123';

      const player = new PlayerFixture(browser, name);
      await player.register(username, password);
      await player.login();
      await player.createCharacter(name, zone);
      await player.enterZone();
      players.push(player);
      return player;
    });

    // Cleanup all players after the test
    for (const p of players) {
      await p.cleanup();
    }
  },
});

export { expect } from '@playwright/test';
