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
    await alice.waitForMessage(new RegExp(`${bob.name}.*is.*here`, 'i'), { timeout: 10_000 });

    // Bob sends `look` — should see Alice's character name in the room
    await bob.sendCommand('look');
    await bob.waitForMessage(new RegExp(`${alice.name}.*is.*here`, 'i'), { timeout: 10_000 });
  });

  /**
   * When Player A moves away, Player B sees a departure message.
   */
  test('departure message is broadcast to remaining player', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Alice moves down (reliquary-inn → reliquary-inn-lobby)
    await alice.sendCommand('go down');

    // Bob should see a departure message: "Alicexyz walks down."
    await bob.waitForMessage(new RegExp(`${alice.name} walks down`, 'i'), { timeout: 15_000 });
  });

  /**
   * When Player A returns, Player B sees an arrival message.
   */
  test('arrival message is broadcast when player returns', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Alice leaves the room
    await alice.sendCommand('go down');
    await bob.waitForMessage(new RegExp(`${alice.name} walks down`, 'i'), { timeout: 15_000 });

    // Alice comes back up (lobby → inn)
    await alice.sendCommand('go up');

    // Bob should see arrival: "Alicexyz arrives from the down."
    await bob.waitForMessage(new RegExp(`${alice.name} arrives from the down`, 'i'), { timeout: 15_000 });
  });

  /**
   * After Player A leaves, Player B no longer sees them in `look`.
   */
  test('player disappears from look after leaving', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Verify Alice is visible first
    await bob.sendCommand('look');
    await bob.waitForMessage(new RegExp(`${alice.name}.*is.*here`, 'i'), { timeout: 10_000 });

    // Alice moves away
    await alice.sendCommand('go down');
    await bob.waitForMessage(new RegExp(`${alice.name} walks down`, 'i'), { timeout: 15_000 });

    // Small pause to let occupant updates propagate
    await bob.getPage().waitForTimeout(1000);

    // Record message count before second look
    const messagesBefore = await bob.getMessages();
    const countBefore = messagesBefore.length;

    // Bob sends `look` — Alice should NOT be in the room
    await bob.sendCommand('look');

    // Wait for the look response to arrive (at least a few new messages)
    await bob.getPage().waitForFunction(
      (expectedMin: number) => {
        const log = document.querySelector('[role="log"][aria-label="Game narrative"]');
        return log ? log.querySelectorAll('div > *').length > expectedMin + 2 : false;
      },
      countBefore,
      { timeout: 10_000 },
    );

    // Check only messages from after the second look — Alice should not be present
    const allMessages = await bob.getMessages();
    const freshMessages = allMessages.slice(countBefore).join('\n');
    expect(freshMessages).not.toMatch(new RegExp(`${alice.name}.*is.*here`, 'i'));
  });
});
