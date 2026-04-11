import { test, expect } from '../src/fixtures/test-fixture.js';

test.describe('Connection smoke test', () => {
  test('player can connect and see a room description', async ({ createPlayer }) => {
    const player = await createPlayer('Smoketest');

    // After enterZone(), the player should see narrative content
    // (room header, description, or system message confirming connection).
    const messages = await player.getMessages();
    expect(messages.length).toBeGreaterThan(0);
  });

  test('player can send "look" command and see room output', async ({ createPlayer }) => {
    const player = await createPlayer('Looker');

    // Send the look command
    await player.sendCommand('look');

    // Wait for any room description text to appear.
    // The-reliquary is the starting zone — we expect some descriptive text.
    await player.waitForMessage(/.+/, { timeout: 10_000 });

    const messages = await player.getMessages();
    expect(messages.length).toBeGreaterThan(0);

    // At least one message should have meaningful content (not just whitespace)
    const hasContent = messages.some((m) => m.length > 10);
    expect(hasContent).toBe(true);
  });
});
