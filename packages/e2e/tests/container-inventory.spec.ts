/**
 * Container & Inventory E2E tests — validates item pickup, container
 * storage, and multi-player container exchange flows.
 *
 * Starting gear: Rusty Blade (equipped weapon), Tattered Leather
 * (equipped armour), Waterlogged Potion (inventory consumable).
 *
 * Container tests spawn a "Tattered Satchel" into the starting room
 * via the admin spawn API before each test.
 */

import { test, expect } from '../src/fixtures/test-fixture.js';
import { adminSpawnItem } from '../src/helpers/admin-api.js';

/** Short pause for async game-state propagation. */
const SETTLE_MS = 500;

/** The room where new characters spawn in the-reliquary zone. */
const STARTING_ROOM = 'reliquary-inn';

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
  test('player can put an item into a container', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    await adminSpawnItem('tattered_satchel', STARTING_ROOM);
    await alice.getPage().waitForTimeout(SETTLE_MS);

    await alice.sendCommand('take satchel');
    await alice.waitForMessage(/You pick up the.*Satchel/i);

    await alice.sendCommand('put waterlogged potion in satchel');
    await alice.waitForMessage(/You put Waterlogged Potion in.*Satchel/i);

    await alice.sendCommand('open satchel');
    await alice.waitForMessage(/You open the.*Satchel/i);
    await alice.waitForMessage(/Waterlogged Potion/i);
  });

  test('player can open an empty container', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    await adminSpawnItem('tattered_satchel', STARTING_ROOM);
    await alice.getPage().waitForTimeout(SETTLE_MS);

    await alice.sendCommand('take satchel');
    await alice.waitForMessage(/You pick up the.*Satchel/i);

    await alice.sendCommand('open satchel');
    await alice.waitForMessage(/You open the.*Satchel/i);
    await alice.waitForMessage(/\(empty\)/i);
    await alice.waitForMessage(/Slots:/i);
  });

  test('player can take an item from a container', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    await adminSpawnItem('tattered_satchel', STARTING_ROOM);
    await alice.getPage().waitForTimeout(SETTLE_MS);

    await alice.sendCommand('take satchel');
    await alice.waitForMessage(/You pick up the.*Satchel/i);

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

    // Spawn a satchel into the starting room via admin API
    await adminSpawnItem('tattered_satchel', STARTING_ROOM);
    await alice.getPage().waitForTimeout(SETTLE_MS);

    // Alice picks up the container
    await alice.sendCommand('take satchel');
    await alice.waitForMessage(/You pick up the.*Satchel/i);

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

    // Spawn a satchel into the starting room via admin API
    await adminSpawnItem('tattered_satchel', STARTING_ROOM);
    await alice.getPage().waitForTimeout(SETTLE_MS);

    // Alice sets up container with item
    await alice.sendCommand('take satchel');
    await alice.waitForMessage(/You pick up the.*Satchel/i);
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

    // ── Step 1: Spawn and pick up a container ──
    await adminSpawnItem('tattered_satchel', STARTING_ROOM);
    await alice.getPage().waitForTimeout(SETTLE_MS);
    await alice.sendCommand('take satchel');
    await alice.waitForMessage(/You pick up the.*Satchel/i);

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
