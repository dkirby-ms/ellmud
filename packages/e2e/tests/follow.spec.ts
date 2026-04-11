import { test, expect } from '../src/fixtures/test-fixture.js';

test.describe('Follow & consent system', () => {
  /**
   * Follow succeeds when both players are in the same room.
   * (Consent is a separate system for group membership, not required for follow.)
   */
  test('follow flow — player follows another in the same room', async ({ createPlayer }) => {
    // Leader must be in the room for follower to see them
    const _leader = await createPlayer('Leader');
    const follower = await createPlayer('Follower');

    // Follower follows leader
    await follower.sendCommand('follow Leader');
    await follower.waitForMessage(/You begin following Leader/i);
  });

  /**
   * Consent grant + revoke flow: Player A consents Player B, then revokes.
   */
  test('consent grant and revoke flow', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    // Bob must exist in the room for consent resolution
    const _bob = await createPlayer('Bob');

    // Alice grants consent to Bob
    await alice.sendCommand('consent Bob');
    await alice.waitForMessage(/You grant consent to Bob/i);

    // Alice revokes consent from Bob
    await alice.sendCommand('revoke Bob');
    await alice.waitForMessage(/You revoke consent from Bob/i);
  });

  /**
   * When a leader moves, followers auto-move with them.
   * Leader sees "X follows you." and follower sees "You follow Leader."
   */
  test('auto-follow on movement — follower moves with leader', async ({ createPlayer }) => {
    const leader = await createPlayer('Leader');
    const follower = await createPlayer('Follower');

    // Follower starts following leader
    await follower.sendCommand('follow Leader');
    await follower.waitForMessage(/You begin following Leader/i);

    // Leader moves north (reliquary-commons → reliquary-catwalk-junction)
    await leader.sendCommand('go north');

    // Leader sees follower arrival notification
    await leader.waitForMessage(/Follower follows you/i, { timeout: 15_000 });

    // Follower sees "You follow Leader." and the new room
    await follower.waitForMessage(/You follow Leader/i, { timeout: 15_000 });

    // Verify both are in the same new room — follower sends look
    await follower.sendCommand('look');
    await follower.waitForMessage(/Leader.*is here/i, { timeout: 10_000 });
  });

  /**
   * After unfollowing, the follower stays behind when the leader moves.
   */
  test('unfollow — follower stays behind when leader moves', async ({ createPlayer }) => {
    const leader = await createPlayer('Leader');
    const follower = await createPlayer('Follower');

    // Follower follows, then unfollows
    await follower.sendCommand('follow Leader');
    await follower.waitForMessage(/You begin following Leader/i);

    await follower.sendCommand('unfollow');
    await follower.waitForMessage(/You stop following/i);

    // Leader moves north
    await leader.sendCommand('go north');

    // Follower should see leader's departure, NOT auto-follow
    await follower.waitForMessage(/Leader walks north/i, { timeout: 15_000 });

    // Small pause for state to settle
    await follower.getPage().waitForTimeout(1000);

    // Follower sends look — should NOT see leader in the room
    await follower.sendCommand('look');
    await follower.waitForMessage(/Preservation Hall|Exits:/i, { timeout: 10_000 });
    const messages = await follower.getMessages();
    const recentMessages = messages.slice(-10).join('\n');
    expect(recentMessages).not.toMatch(/Leader.*is here/i);
  });

  /**
   * Revoking consent from a player works and is confirmed.
   * Also tests that unconsent rejects if no prior consent exists.
   */
  test('revoke rejects when no consent granted', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    await createPlayer('Bob');

    // Try to revoke consent from Bob without having granted it
    await alice.sendCommand('revoke Bob');
    await alice.waitForMessage(/haven't granted consent/i);
  });
});
