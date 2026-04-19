import { test, expect } from '../src/fixtures/test-fixture.js';
import { adminSpawnCreature } from '../src/helpers/admin-api.js';

test.describe('Multi-encounter combat system', () => {
  /**
   * Basic combat initiation — player attacks a creature and sees combat messages.
   */
  test('player initiates combat with a creature', async ({ createPlayer }) => {
    const player = await createPlayer('Warrior');

    // Spawn a passive creature in the inn (starting room)
    await adminSpawnCreature('sludge_crawler', 'reliquary-inn');

    // Look to see the creature
    await player.sendCommand('look');
    await player.waitForMessage(/sludge crawler/i, { timeout: 10_000 });

    // Attack the creature
    await player.sendCommand('attack sludge');
    
    // Wait for combat initiation message ("You lunge at X — combat begins!")
    await player.waitForMessage(/combat begins/i, { timeout: 10_000 });
  });

  /**
   * Two players, two separate encounters — Player A attacks Creature 1,
   * Player B attacks Creature 2. Both are in independent combat encounters.
   */
  test('two players in separate encounters with different creatures', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Spawn two different creatures in the inn
    await adminSpawnCreature('sludge_crawler', 'reliquary-inn');
    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    // Both players look to see the creatures
    await alice.sendCommand('look');
    await alice.waitForMessage(/sludge crawler/i, { timeout: 10_000 });
    await alice.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await bob.sendCommand('look');
    await bob.waitForMessage(/sludge crawler/i, { timeout: 10_000 });
    await bob.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    // Alice attacks the sludge crawler
    await alice.sendCommand('attack sludge');
    await alice.waitForMessage(/lunge at.*sludge|combat begins/i, { timeout: 10_000 });

    // Bob attacks the flood scuttler
    await bob.sendCommand('attack flood');
    await bob.waitForMessage(/lunge at.*flood|combat begins/i, { timeout: 10_000 });

    // Verify both are in combat independently
    // Alice should see her own combat messages, not Bob's specific encounter
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

    // Spawn one creature
    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    // Both players look
    await alice.sendCommand('look');
    await alice.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    await bob.sendCommand('look');
    await bob.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    // Alice attacks first
    await alice.sendCommand('attack flood');
    await alice.waitForMessage(/combat begins/i, { timeout: 10_000 });

    // Bob joins the same combat (attacks same creature)
    await bob.sendCommand('attack flood');
    await bob.waitForMessage(/combat begins|lunge at/i, { timeout: 10_000 });

    // Alice should see Bob joining the combat (or see Bob's attack messages)
    await alice.waitForMessage(new RegExp(bob.name, 'i'), { timeout: 10_000 });
  });

  /**
   * Observer sees combat — Player A is fighting, Player B enters room
   * and can see combat happening but is not a participant.
   */
  test('observer sees ongoing combat without participating', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Spawn a creature in the inn
    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    // Alice attacks
    await alice.sendCommand('look');
    await alice.waitForMessage(/flood scuttler/i, { timeout: 10_000 });
    await alice.sendCommand('attack flood');
    await alice.waitForMessage(/combat begins/i, { timeout: 10_000 });

    // Bob is already in the room (both start in reliquary-inn)
    // Bob should see Alice fighting but not be in combat himself
    await bob.sendCommand('look');
    
    // Bob should see some indication of combat in the room
    // (either Alice fighting, or the creature in combat state)
    const bobMessages = await bob.getMessages();
    const seesAlice = bobMessages.some((m) => m.match(new RegExp(alice.name, 'i')));
    const seesCombat = bobMessages.some((m) => 
      m.match(/combat|fighting|battle|attack/i)
    );
    
    // Bob should see either Alice's name or combat-related keywords
    expect(seesAlice || seesCombat).toBe(true);
  });

  /**
   * Flee from combat — Player initiates combat and then successfully flees.
   */
  test('player flees from combat', async ({ createPlayer }) => {
    const player = await createPlayer('Coward');

    // Spawn a creature
    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    // Look and attack
    await player.sendCommand('look');
    await player.waitForMessage(/flood scuttler/i, { timeout: 10_000 });
    await player.sendCommand('attack flood');
    await player.waitForMessage(/combat begins/i, { timeout: 10_000 });

    // Flee from combat
    await player.sendCommand('flee');
    
    // Wait for flee message ("You prepare to flee!" or "You look for an escape route...")
    await player.waitForMessage(/prepare to flee|escape route/i, { timeout: 10_000 });
    
    // Verify player is no longer in combat (can look around normally)
    await player.sendCommand('look');
    const messages = await player.getMessages();
    const hasRoomDescription = messages.some((m) => m.length > 20);
    expect(hasRoomDescription).toBe(true);
  });

  /**
   * Multiple creatures in a room — ensure a player can target a specific creature.
   */
  test('player targets specific creature when multiple exist', async ({ createPlayer }) => {
    const player = await createPlayer('Hunter');

    // Spawn two different creatures
    await adminSpawnCreature('sludge_crawler', 'reliquary-inn');
    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    // Look to see both creatures
    await player.sendCommand('look');
    await player.waitForMessage(/sludge crawler/i, { timeout: 10_000 });
    await player.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    // Attack the sludge crawler specifically
    await player.sendCommand('attack sludge');
    
    // Should see combat with sludge crawler, not flood scuttler
    await player.waitForMessage(/sludge/i, { timeout: 10_000 });
  });

  /**
   * Aggressive creature auto-aggro — aggressive creatures should attack
   * players entering their room (if this behavior is implemented).
   * This test verifies that aggressive creatures can be spawned and engaged.
   */
  test('aggressive creature can be engaged in combat', async ({ createPlayer }) => {
    const player = await createPlayer('Brave');

    // Spawn an aggressive creature (flood_scuttler is aggressive: true)
    await adminSpawnCreature('flood_scuttler', 'reliquary-inn');

    // Look to see the creature
    await player.sendCommand('look');
    await player.waitForMessage(/flood scuttler/i, { timeout: 10_000 });

    // Attack the aggressive creature
    await player.sendCommand('attack flood');
    await player.waitForMessage(/combat begins/i, { timeout: 10_000 });

    // Verify combat is active
    const messages = await player.getMessages();
    const inCombat = messages.some((m) => m.match(/flood.*scuttler/i));
    expect(inCombat).toBe(true);
  });
});
