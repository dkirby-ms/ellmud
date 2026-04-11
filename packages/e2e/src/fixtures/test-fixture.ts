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
      // Username must be 3-20 chars (server validation)
      const rand = Math.random().toString(36).slice(2, 8);
      const username = `t_${name.slice(0, 6)}_${rand}`.slice(0, 20);
      const password = 'testpass123';

      // Character names must be alpha-only, 2-24 chars, capital first + lowercase rest.
      // Append a random alpha suffix to avoid cross-test collisions with linkdead characters.
      const suffix = Array.from({ length: 4 }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26)),
      ).join('');
      const charName = `${name}${suffix}`.slice(0, 24);

      const player = new PlayerFixture(browser, charName);
      await player.register(username, password);
      await player.login();
      await player.createCharacter(charName, zone);
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
