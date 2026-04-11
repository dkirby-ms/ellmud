/**
 * Container & Inventory E2E tests — validates item pickup, container
 * storage, and multi-player container exchange flows.
 *
 * Starting gear: Rusty Blade (equipped weapon), Tattered Leather
 * (equipped armour), Waterlogged Potion (inventory consumable).
 *
 * Container tests require a "Tattered Satchel" (or similar container)
 * to be obtainable in the starting area. The item definition exists in
 * the DB (015_container_properties.sql) but is not currently seeded
 * into any room loot or starter kit. These tests will fail until a
 * container acquisition path is added to the reliquary starting zone.
 */

import { test, expect } from '../src/fixtures/test-fixture.js';
import type { PlayerFixture } from '../src/fixtures/player-fixture.js';

// ── Helpers ──────────────────────────────────────────────────────────

/** Short pause for async game-state propagation. */
const SETTLE_MS = 500;

/**
 * Attempt to pick up a container from the room floor.
 * Returns true if the player successfully picked one up.
 */
async function tryPickUpContainer(
  player: PlayerFixture,
  containerName: string,
): Promise<boolean> {
  await player.sendCommand(`take ${containerName}`);
  try {
    await player.waitForMessage(
      new RegExp(`You pick up the ${containerName}`, 'i'),
      { timeout: 5_000 },
    );
    return true;
  } catch {
    return false;
  }
}

// ── Basic Item Flow ──────────────────────────────────────────────────

test.describe('Item Pickup & Drop', () => {
  test('player can drop an item and see it on the ground', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');

    // Alice starts with Waterlogged Potion in inventory
    await alice.sendCommand('i');
    await alice.waitForMessage(/Waterlogged Potion/i);

    // Drop the potion
    await alice.sendCommand('drop waterlogged potion');
    await alice.waitForMessage(/You drop the Waterlogged Potion/i);

    // Verify it appears on the ground via look
    await alice.sendCommand('look');
    await alice.waitForMessage(/Waterlogged Potion.*lies here/i, { timeout: 10_000 });
  });

  test('player can pick up a dropped item from the ground', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');

    // Drop then pick back up
    await alice.sendCommand('drop waterlogged potion');
    await alice.waitForMessage(/You drop the Waterlogged Potion/i);

    await alice.sendCommand('take waterlogged potion');
    await alice.waitForMessage(/You pick up the Waterlogged Potion/i);

    // Verify it's back in inventory
    await alice.sendCommand('i');
    await alice.waitForMessage(/Waterlogged Potion/i);
  });

  test('second player can pick up item dropped by first player', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Alice drops her potion
    await alice.sendCommand('drop waterlogged potion');
    await alice.waitForMessage(/You drop the Waterlogged Potion/i);

    // Bob should see it on the ground
    await bob.getPage().waitForTimeout(SETTLE_MS);
    await bob.sendCommand('look');
    await bob.waitForMessage(/Waterlogged Potion.*lies here/i, { timeout: 10_000 });

    // Bob picks it up
    await bob.sendCommand('take waterlogged potion');
    await bob.waitForMessage(/You pick up the Waterlogged Potion/i);

    // Bob verifies it's in his inventory
    await bob.sendCommand('i');
    await bob.waitForMessage(/Waterlogged Potion/i);

    // Alice should no longer see it on the ground
    await alice.sendCommand('look');
    const aliceMessages = await alice.getMessages();
    const recentLook = aliceMessages.slice(-15).join('\n');
    expect(recentLook).not.toMatch(/Waterlogged Potion.*lies here/i);
  });

  test('drop rejects items the player is not carrying', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');

    await alice.sendCommand('drop nonexistent widget');
    await alice.waitForMessage(/not carrying/i);
  });

  test('take rejects items not present in the room', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');

    await alice.sendCommand('take nonexistent widget');
    await alice.waitForMessage(/don't see/i);
  });
});

// ── Container Mechanics ──────────────────────────────────────────────

test.describe('Container Mechanics', () => {
  /**
   * Helper: sets up a player with a Tattered Satchel container.
   * Attempts to pick one up from the room. If unavailable, the test
   * will fail with a descriptive assertion error.
   */
  async function ensurePlayerHasContainer(player: PlayerFixture): Promise<void> {
    const found = await tryPickUpContainer(player, 'satchel');
    if (!found) {
      // Last resort: check if already in inventory
      await player.sendCommand('i');
      try {
        await player.waitForMessage(/Satchel/i, { timeout: 3_000 });
        return; // already have one
      } catch {
        // Fail with clear message about prerequisites
        expect(found, 'Container test requires a Tattered Satchel in the starting room. ' +
          'Seed a container into the reliquary-inn room or update the starter kit.').toBeTruthy();
      }
    }
  }

  test('player can put an item into a container', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    await ensurePlayerHasContainer(alice);

    // Alice has Waterlogged Potion + Tattered Satchel in inventory
    await alice.sendCommand('put waterlogged potion in satchel');
    await alice.waitForMessage(/You put Waterlogged Potion in.*Satchel/i);

    // Verify via open
    await alice.sendCommand('open satchel');
    await alice.waitForMessage(/You open the.*Satchel/i);
    await alice.waitForMessage(/Waterlogged Potion/i);
  });

  test('player can open an empty container', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    await ensurePlayerHasContainer(alice);

    await alice.sendCommand('open satchel');
    await alice.waitForMessage(/You open the.*Satchel/i);
    await alice.waitForMessage(/\(empty\)/i);
    await alice.waitForMessage(/Slots:/i);
  });

  test('player can take an item from a container', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    await ensurePlayerHasContainer(alice);

    // Put item in container first
    await alice.sendCommand('put waterlogged potion in satchel');
    await alice.waitForMessage(/You put Waterlogged Potion in.*Satchel/i);

    // Take item back out
    await alice.sendCommand('take waterlogged potion from satchel');
    await alice.waitForMessage(/You take Waterlogged Potion from.*Satchel/i);

    // Verify item is back in inventory
    await alice.sendCommand('i');
    await alice.waitForMessage(/Waterlogged Potion/i);

    // Verify container is now empty
    await alice.sendCommand('open satchel');
    await alice.waitForMessage(/\(empty\)/i);
  });

  test('non-container item rejects put command', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');

    // Try to put potion "in" the rusty blade (which is equipped, but
    // even if unequipped it's not a container)
    await alice.sendCommand('put waterlogged potion in rusty blade');
    // Either "not carrying" (because equipped) or "not a container"
    await alice.waitForMessage(/not a container|not carrying/i);
  });
});

// ── Multi-Player Container Exchange ──────────────────────────────────

test.describe('Container Exchange Between Players', () => {
  test('player drops container with items, other player picks it up and finds items inside', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Alice picks up a container
    await ensurePlayerHasContainerForExchange(alice);

    // Alice puts her potion into the container
    await alice.sendCommand('put waterlogged potion in satchel');
    await alice.waitForMessage(/You put Waterlogged Potion in.*Satchel/i);

    // Alice drops the container on the ground
    await alice.sendCommand('drop satchel');
    await alice.waitForMessage(/You drop the.*Satchel/i);

    // Bob should see the container on the ground
    await bob.getPage().waitForTimeout(SETTLE_MS);
    await bob.sendCommand('look');
    await bob.waitForMessage(/Satchel.*lies here/i, { timeout: 10_000 });

    // Bob picks up the container
    await bob.sendCommand('take satchel');
    await bob.waitForMessage(/You pick up the.*Satchel/i);

    // Bob opens the container — should find Alice's potion inside
    await bob.sendCommand('open satchel');
    await bob.waitForMessage(/You open the.*Satchel/i);
    await bob.waitForMessage(/Waterlogged Potion/i);
  });

  test('player takes item from a container received from another player', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Alice sets up container with item
    await ensurePlayerHasContainerForExchange(alice);
    await alice.sendCommand('put waterlogged potion in satchel');
    await alice.waitForMessage(/You put Waterlogged Potion in.*Satchel/i);

    // Alice drops container for Bob
    await alice.sendCommand('drop satchel');
    await alice.waitForMessage(/You drop the.*Satchel/i);

    // Bob picks up the container
    await bob.getPage().waitForTimeout(SETTLE_MS);
    await bob.sendCommand('take satchel');
    await bob.waitForMessage(/You pick up the.*Satchel/i);

    // Bob takes the potion out of the container
    await bob.sendCommand('take waterlogged potion from satchel');
    await bob.waitForMessage(/You take Waterlogged Potion from.*Satchel/i);

    // Verify Bob now has the potion in inventory
    await bob.sendCommand('i');
    await bob.waitForMessage(/Waterlogged Potion/i);

    // Verify the container is now empty
    await bob.sendCommand('open satchel');
    await bob.waitForMessage(/\(empty\)/i);
  });

  test('full container exchange flow — pick up, store, drop, other player retrieves', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // ── Step 1: Alice gets a container ──
    await ensurePlayerHasContainerForExchange(alice);

    // ── Step 2: Alice drops her potion on the ground ──
    await alice.sendCommand('drop waterlogged potion');
    await alice.waitForMessage(/You drop the Waterlogged Potion/i);

    // ── Step 3: Alice picks the potion back up from the ground ──
    await alice.sendCommand('take waterlogged potion');
    await alice.waitForMessage(/You pick up the Waterlogged Potion/i);

    // ── Step 4: Alice puts the potion into the container ──
    await alice.sendCommand('put waterlogged potion in satchel');
    await alice.waitForMessage(/You put Waterlogged Potion in.*Satchel/i);

    // ── Step 5: Alice verifies the container holds the item ──
    await alice.sendCommand('open satchel');
    await alice.waitForMessage(/Waterlogged Potion/i);

    // ── Step 6: Alice drops the loaded container on the ground ──
    await alice.sendCommand('drop satchel');
    await alice.waitForMessage(/You drop the.*Satchel/i);

    // ── Step 7: Bob sees the container on the ground ──
    await bob.getPage().waitForTimeout(SETTLE_MS);
    await bob.sendCommand('look');
    await bob.waitForMessage(/Satchel.*lies here/i, { timeout: 10_000 });

    // ── Step 8: Bob picks up the container ──
    await bob.sendCommand('take satchel');
    await bob.waitForMessage(/You pick up the.*Satchel/i);

    // ── Step 9: Bob opens the container and finds the potion ──
    await bob.sendCommand('open satchel');
    await bob.waitForMessage(/You open the.*Satchel/i);
    await bob.waitForMessage(/Waterlogged Potion/i);

    // ── Step 10: Bob takes the potion from the container ──
    await bob.sendCommand('take waterlogged potion from satchel');
    await bob.waitForMessage(/You take Waterlogged Potion from.*Satchel/i);

    // ── Step 11: Verify final state ──
    // Bob has the potion in inventory
    await bob.sendCommand('i');
    await bob.waitForMessage(/Waterlogged Potion/i);

    // Bob's container is now empty
    await bob.sendCommand('open satchel');
    await bob.waitForMessage(/\(empty\)/i);

    // Alice's inventory should no longer have the potion or satchel
    await alice.sendCommand('i');
    const aliceInventory = await alice.getMessages();
    const recentAlice = aliceInventory.slice(-10).join('\n');
    expect(recentAlice).not.toMatch(/Waterlogged Potion/i);
  });
});

// ── Exchange Helper ──────────────────────────────────────────────────

/**
 * Ensure the player has a Tattered Satchel for exchange tests.
 * Same logic as ensurePlayerHasContainer in the Container Mechanics
 * describe block, but available to the exchange tests.
 */
async function ensurePlayerHasContainerForExchange(player: PlayerFixture): Promise<void> {
  const found = await tryPickUpContainer(player, 'satchel');
  if (!found) {
    await player.sendCommand('i');
    try {
      await player.waitForMessage(/Satchel/i, { timeout: 3_000 });
      return;
    } catch {
      expect(found, 'Container exchange test requires a Tattered Satchel in the starting room. ' +
        'Seed a container into the reliquary-inn room or update the starter kit.').toBeTruthy();
    }
  }
}
