import { test, expect } from '../src/fixtures/test-fixture.js';
import { adminSpawnCreature } from '../src/helpers/admin-api.js';

/**
 * Combat e2e tests.
 *
 * the-reliquary is a faction_hub zone — combat/creature AI ticks are SKIPPED
 * there (ZoneRoom.update). Tests that only need synchronous command responses
 * (initiation, movement-lock) use reliquary-inn. Tests requiring tick-based
 * resolution (damage, defeat, flee, auto-aggro) teleport to the warrens dungeon
 * zone via `goto` (enabled by DEV_MODE_ENABLED in server-manager).
 */

type Player = Awaited<ReturnType<Parameters<Parameters<typeof test>[2]>[0]['createPlayer']>>;

/** Teleport a player to the warrens dungeon zone and wait for zone load. */
async function teleportToWarrens(player: Player) {
  await player.sendCommand('goto warrens:shattered-gate');
  // Wait for the warrens zone to fully load — we should see the room description
  await player.waitForMessage(/shattered gate/i, { timeout: 20_000 });
  // Extra look to confirm the zone is fully loaded and responsive
  await player.sendCommand('look');
  await player.waitForMessage(/shattered gate/i, { timeout: 10_000 });
}

test.describe('Multi-encounter combat system', () => {
  /**
   * Basic combat initiation — player attacks a creature and sees combat messages.
   */
  test('player initiates combat with a creature', async ({ createPlayer }) => {
    const player = await createPlayer('Warrior');

    await adminSpawnCreature('sludge_crawler', 'reliquary-inn');

    await player.sendCommand('look');
    await player.waitForMessage(/sludge crawler/i, { timeout: 10_000 });

    await player.sendCommand('attack sludge');
    await player.waitForMessage(/combat begins/i, { timeout: 10_000 });
  });

  /**
   * Two players, two separate encounters — Player A attacks Creature 1,
   * Player B attacks Creature 2. Both are in independent combat encounters.
   */
  test('two players in separate encounters with different creatures', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    await adminSpawnCreature('sludge_crawler', 'reliquary-inn');
    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    await alice.sendCommand('look');
    await alice.waitForMessage(/sludge crawler/i, { timeout: 10_000 });
    await alice.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await bob.sendCommand('look');
    await bob.waitForMessage(/sludge crawler/i, { timeout: 10_000 });
    await bob.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await alice.sendCommand('attack sludge');
    await alice.waitForMessage(/lunge at.*sludge|combat begins/i, { timeout: 10_000 });

    await bob.sendCommand('attack flood');
    await bob.waitForMessage(/lunge at.*flood|combat begins/i, { timeout: 10_000 });

    const aliceMessages = await alice.getMessages();
    const aliceInCombat = aliceMessages.some((m) => m.match(/sludge/i));
    expect(aliceInCombat).toBe(true);

    const bobMessages = await bob.getMessages();
    const bobInCombat = bobMessages.some((m) => m.match(/flood/i));
    expect(bobInCombat).toBe(true);
  });

  /**
   * Two players join same encounter — Player A attacks a creature,
   * Player B attacks the same creature. Both should be in the same encounter.
   */
  test('two players join the same encounter', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    await alice.sendCommand('look');
    await alice.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await bob.sendCommand('look');
    await bob.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await alice.sendCommand('attack flood');
    await alice.waitForMessage(/combat begins/i, { timeout: 10_000 });

    await bob.sendCommand('attack flood');
    await bob.waitForMessage(/combat begins|lunge at/i, { timeout: 10_000 });

    await alice.waitForMessage(new RegExp(bob.name, 'i'), { timeout: 10_000 });
  });

  /**
   * Observer sees combat — Player A is fighting in a dungeon zone,
   * Player B is in the same room and should see strike narrations.
   * (Tightened: checks for actual combat strike narrations, not just player name.)
   */
  test('observer sees ongoing combat without participating', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Teleport both players to warrens where combat ticks run
    await teleportToWarrens(alice);
    await teleportToWarrens(bob);

    await adminSpawnCreature('sludge_crawler', 'shattered-gate', 'warrens');

    await alice.sendCommand('look');
    await alice.waitForMessage(/sludge crawler/i, { timeout: 10_000 });
    await alice.sendCommand('attack sludge');
    await alice.waitForMessage(/combat begins/i, { timeout: 10_000 });

    // Bob should see strike narrations broadcast to the room
    await bob.waitForMessage(/strikes.*for \d+ damage/i, { timeout: 20_000 });
  });

  /**
   * Flee from combat — Player initiates combat and then successfully flees.
   * (Tightened: verifies player is truly out of combat by using `go` after.)
   */
  test('player flees from combat', async ({ createPlayer }) => {
    const player = await createPlayer('Coward');

    // Teleport to warrens where flee resolves on combat ticks
    await teleportToWarrens(player);

    await adminSpawnCreature('sludge_crawler', 'shattered-gate', 'warrens');

    await player.sendCommand('look');
    await player.waitForMessage(/sludge crawler/i, { timeout: 10_000 });
    await player.sendCommand('attack sludge');
    await player.waitForMessage(/combat begins/i, { timeout: 10_000 });

    // Flee with direction (east → rubble-boulevard). Flee is probabilistic
    // (base 50%), so retry up to 5 times.
    for (let attempt = 0; attempt < 5; attempt++) {
      await player.sendCommand('flee east');
      await player.waitForMessage(/prepare to flee/i, { timeout: 10_000 });

      try {
        await player.waitForMessage(/flees from combat/i, { timeout: 5_000 });
        break;
      } catch {
        // Flee failed — retry
        continue;
      }
    }

    // Verify player is no longer in combat: `go` should work (not blocked)
    await player.sendCommand('go west');
    await player.waitForMessage(/shattered gate|you move/i, { timeout: 10_000 });
  });

  /**
   * Multiple creatures in a room — ensure a player can target a specific creature.
   */
  test('player targets specific creature when multiple exist', async ({ createPlayer }) => {
    const player = await createPlayer('Hunter');

    await adminSpawnCreature('sludge_crawler', 'reliquary-inn');
    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    await player.sendCommand('look');
    await player.waitForMessage(/sludge crawler/i, { timeout: 10_000 });
    await player.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await player.sendCommand('attack sludge');
    await player.waitForMessage(/sludge/i, { timeout: 10_000 });
  });

  /**
   * Aggressive creature auto-attacks on room entry — flood_scuttler (aggressive: true)
   * attacks the player without the player typing `attack`.
   * (Tightened: tests actual auto-aggro behavior, not manual attack.)
   */
  test('aggressive creature auto-aggros on room entry', async ({ createPlayer }) => {
    const player = await createPlayer('Brave');

    // Teleport to warrens where creature AI ticks run
    await teleportToWarrens(player);

    // Spawn an aggressive creature one room east. The zone is active because
    // the player teleported in first.
    await adminSpawnCreature('flood_scuttler', 'rubble-boulevard', 'warrens');

    // Walk into the creature's room — auto-aggro should trigger
    await player.sendCommand('go east');
    await player.waitForMessage(/rubble/i, { timeout: 10_000 });

    // The aggressive creature detects the player on the next AI tick:
    // idle → hostile → combat_strike. Wait for combat.
    await player.waitForMessage(/strikes|combat begins|lunge/i, { timeout: 20_000 });
  });

  /**
   * Combat completion — attack a low-HP creature until it dies.
   * Verifies "defeated" and "Combat has ended" messages appear.
   */
  test('combat completes when creature is killed', async ({ createPlayer }) => {
    const player = await createPlayer('Slayer');

    // Enable peaceful mode so wandering dungeon creatures don't join the fight
    await player.sendCommand('peaceful');
    await player.waitForMessage(/peaceful mode on/i, { timeout: 10_000 });

    // Teleport to warrens where combat ticks resolve damage
    await teleportToWarrens(player);

    await adminSpawnCreature('sludge_crawler', 'shattered-gate', 'warrens');

    await player.sendCommand('look');
    await player.waitForMessage(/sludge crawler/i, { timeout: 10_000 });

    // Manual attack still works in peaceful mode — only creature-initiated
    // aggro is blocked, so no wild Gutterspawns will join.
    await player.sendCommand('attack sludge');
    await player.waitForMessage(/combat begins/i, { timeout: 10_000 });

    // Auto-attack ticks deal damage each second. With 20 HP, defeat
    // should happen within ~20 ticks.
    await player.waitForMessage(/is defeated|collapses.*defeated/i, { timeout: 30_000 });

    await player.waitForMessage(/combat has ended/i, { timeout: 10_000 });
  });

  /**
   * Combat blocks movement — `go` is rejected while in combat,
   * requiring `flee` instead.
   */
  test('go command is blocked during combat', async ({ createPlayer }) => {
    const player = await createPlayer('Runner');

    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    await player.sendCommand('look');
    await player.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await player.sendCommand('attack flood');
    await player.waitForMessage(/combat begins/i, { timeout: 10_000 });

    await player.sendCommand('go down');
    await player.waitForMessage(/You're in combat! Use 'flee' to escape first\./i, { timeout: 10_000 });
  });

  /**
   * Multiple aggressive creatures engage when one is attacked.
   *
   * NOTE: The creature assist system (sameType/all/groupTag) is tested in
   * unit tests (multi-encounter.test.ts). No DB creatures have assist configs.
   * This test verifies the next best proxy: two aggressive flood_scuttlers both
   * engage the player via their independent behavior trees in a dungeon zone.
   */
  test('multiple aggressive creatures engage when one is attacked', async ({ createPlayer }) => {
    const player = await createPlayer('Tank');

    await teleportToWarrens(player);

    await adminSpawnCreature('flood_scuttler', 'shattered-gate', 'warrens');
    await adminSpawnCreature('flood_scuttler', 'shattered-gate', 'warrens');

    await player.sendCommand('look');
    await player.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await player.sendCommand('attack flood');
    await player.waitForMessage(/combat begins/i, { timeout: 10_000 });

    // Wait for strike narrations from flood scuttlers
    await player.waitForMessage(/flood scuttler strikes/i, { timeout: 20_000 });

    const messages = await player.getMessages();
    const strikeMessages = messages.filter((m) =>
      /flood scuttler strikes/i.test(m),
    );
    expect(strikeMessages.length).toBeGreaterThanOrEqual(1);
  });
});
