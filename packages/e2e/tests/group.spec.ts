import { test } from '../src/fixtures/test-fixture.js';

test.describe('Group system', () => {
  /**
   * Group add requires consent or follow — a leader cannot add a player
   * who has not followed or consented to them.
   */
  test('group add fails without consent or follow', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const charlie = await createPlayer('Charlie');
    const bob = await createPlayer('Bob');

    // Charlie follows Alice so she can form a group
    await charlie.sendCommand(`follow ${alice.name}`);
    await charlie.waitForMessage(new RegExp(`You begin following ${alice.name}`, 'i'));

    // Alice forms a group with Charlie
    await alice.sendCommand('group form');
    await alice.waitForMessage(new RegExp(`You form a group with: ${charlie.name}`, 'i'));

    // Alice tries to add Bob — who hasn't followed or consented
    await alice.sendCommand(`group add ${bob.name}`);
    await alice.waitForMessage(/must be following you or have consented/i);
  });

  /**
   * Full group formation: Player B follows Player A → A forms group → both are members.
   * Group event is broadcast to followers when the group is formed.
   */
  test('group formation via follow', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Bob follows Alice
    await bob.sendCommand(`follow ${alice.name}`);
    await bob.waitForMessage(new RegExp(`You begin following ${alice.name}`, 'i'));

    // Alice forms the group
    await alice.sendCommand('group form');
    await alice.waitForMessage(new RegExp(`You form a group with: ${bob.name}`, 'i'));

    // Bob should see notification that the group was formed
    await bob.waitForMessage(/formed a group/i, { timeout: 10_000 });
  });

  /**
   * gsay — group chat: sender sees "[Group] You say:", other members
   * receive "[Group] <SenderName> says: <message>".
   */
  test('gsay delivers message to group members', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Form group
    await bob.sendCommand(`follow ${alice.name}`);
    await bob.waitForMessage(new RegExp(`You begin following ${alice.name}`, 'i'));
    await alice.sendCommand('group form');
    await alice.waitForMessage(new RegExp(`You form a group with: ${bob.name}`, 'i'));

    // Alice sends a group message
    await alice.sendCommand('gsay hello everyone');
    await alice.waitForMessage(/\[Group\] You say: hello everyone/i);

    // Bob should receive the group message
    await bob.waitForMessage(new RegExp(`\\[Group\\] ${alice.name} says: hello everyone`, 'i'), { timeout: 10_000 });
  });

  /**
   * Group status: `group` (no args) shows leader, loot sharing, and all members.
   */
  test('group status shows members and info', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Form group
    await bob.sendCommand(`follow ${alice.name}`);
    await bob.waitForMessage(new RegExp(`You begin following ${alice.name}`, 'i'));
    await alice.sendCommand('group form');
    await alice.waitForMessage(new RegExp(`You form a group with: ${bob.name}`, 'i'));

    // Check group status
    await alice.sendCommand('group');
    await alice.waitForMessage(new RegExp(`Leader: ${alice.name}`, 'i'));
    await alice.waitForMessage(/Loot Sharing:/i);
    await alice.waitForMessage(new RegExp(bob.name, 'i'));
  });

  /**
   * Group share toggle: leader turns loot sharing on, then verifies
   * the status reflects the change.
   */
  test('group share toggle changes loot sharing status', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Form group
    await bob.sendCommand(`follow ${alice.name}`);
    await bob.waitForMessage(new RegExp(`You begin following ${alice.name}`, 'i'));
    await alice.sendCommand('group form');
    await alice.waitForMessage(new RegExp(`You form a group with: ${bob.name}`, 'i'));

    // Toggle loot sharing on
    await alice.sendCommand('group share on');
    await alice.waitForMessage(/loot sharing ON/i);

    // Verify via group status
    await alice.sendCommand('group');
    await alice.waitForMessage(/Loot Sharing: ON/i);
  });

  /**
   * Group leave: a member leaves the group, receives confirmation,
   * and the remaining leader sees a departure notification.
   */
  test('group leave — member departs and leader is notified', async ({ createPlayer }) => {
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');

    // Form group
    await bob.sendCommand(`follow ${alice.name}`);
    await bob.waitForMessage(new RegExp(`You begin following ${alice.name}`, 'i'));
    await alice.sendCommand('group form');
    await alice.waitForMessage(new RegExp(`You form a group with: ${bob.name}`, 'i'));

    // Bob leaves the group
    await bob.sendCommand('group leave');
    await bob.waitForMessage(/You leave the group/i);

    // Alice should see notification that Bob left
    await alice.waitForMessage(new RegExp(`${bob.name} has left the group`, 'i'), { timeout: 10_000 });
  });
});
