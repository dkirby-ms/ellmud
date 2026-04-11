import { test, expect } from '../src/fixtures/test-fixture.js';

test.describe('Multiplayer connection & movement', () => {
  /**
   * Two players connect to the same room and can see each other via `look`.
   */
  test('two players see each other in the same room', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Both should have received room content on entry
    const aliceMessages = await alice.getMessages();
    expect(aliceMessages.length).toBeGreaterThan(0);
    const bobMessages = await bob.getMessages();
    expect(bobMessages.length).toBeGreaterThan(0);

    // Alice sends `look` — should see Bob's character name in the room
    await alice.sendCommand('look');
    await alice.waitForMessage(/Bob.*is here/i, { timeout: 10_000 });

    // Bob sends `look` — should see Alice's character name in the room
    await bob.sendCommand('look');
    await bob.waitForMessage(/Alice.*is here/i, { timeout: 10_000 });
  });

  /**
   * When Player A moves away, Player B sees a departure message.
   */
  test('departure message is broadcast to remaining player', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Alice moves north (reliquary-commons → reliquary-catwalk-junction)
    await alice.sendCommand('go north');

    // Bob should see a departure message: "Alice walks north."
    await bob.waitForMessage(/Alice walks north/i, { timeout: 15_000 });
  });

  /**
   * When Player A returns, Player B sees an arrival message.
   */
  test('arrival message is broadcast when player returns', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Alice leaves the room
    await alice.sendCommand('go north');
    await bob.waitForMessage(/Alice walks north/i, { timeout: 15_000 });

    // Alice comes back south (catwalk-junction → commons)
    await alice.sendCommand('go south');

    // Bob should see arrival: "Alice arrives from the north."
    await bob.waitForMessage(/Alice arrives from the north/i, { timeout: 15_000 });
  });

  /**
   * After Player A leaves, Player B no longer sees them in `look`.
   */
  test('player disappears from look after leaving', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Verify Alice is visible first
    await bob.sendCommand('look');
    await bob.waitForMessage(/Alice.*is here/i, { timeout: 10_000 });

    // Alice moves away
    await alice.sendCommand('go north');
    await bob.waitForMessage(/Alice walks north/i, { timeout: 15_000 });

    // Small pause to let occupant updates propagate
    await bob.getPage().waitForTimeout(1000);

    // Bob sends `look` — Alice should NOT be in the room
    await bob.sendCommand('look');

    // Wait for the room description to appear (Preservation Hall is the starting room)
    await bob.waitForMessage(/Preservation Hall|Exits:/i, { timeout: 10_000 });

    // Get all messages and check the most recent look output doesn't mention Alice
    const messages = await bob.getMessages();
    const lastMessages = messages.slice(-10).join('\n');
    expect(lastMessages).not.toMatch(/Alice.*is here/i);
  });
});
