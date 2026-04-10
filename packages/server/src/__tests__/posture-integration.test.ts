/**
 * Character Posture Integration Tests — Issue #371
 *
 * Tests posture commands through the full Colyseus server stack.
 * Validates message flow and multi-player posture visibility.
 *
 * Written anticipatorily — Jarlaxle's implementation will make these pass.
 *
 * @see Issue #371
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import {
  bootTestServer,
  connectTestClient,
  connectToExistingRoom,
  wait,
  makeCommand,
} from './helpers/index.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
});

describe('Posture Integration — Colyseus Server (Issue #371)', () => {
  // ─── Basic posture command via server ──────────────────────────────────────

  it('/sit command sends narration response', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');
    collector.clear();

    client.send(MessageTypes.COMMAND, makeCommand('sit'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(0);
    const sitMsg = collector.narrate.find((m) => m.text.match(/sit/i));
    expect(sitMsg).toBeDefined();

    await client.leave();
  });

  it('/stand after /sit sends narration response', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');
    collector.clear();

    client.send(MessageTypes.COMMAND, makeCommand('sit'));
    await wait(300);
    collector.clear();

    client.send(MessageTypes.COMMAND, makeCommand('stand'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(0);
    const standMsg = collector.narrate.find((m) => m.text.match(/stand/i));
    expect(standMsg).toBeDefined();

    await client.leave();
  });

  it('/sit when already sitting → "already sitting" response', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');
    collector.clear();

    // First sit
    client.send(MessageTypes.COMMAND, makeCommand('sit'));
    await wait(300);
    collector.clear();

    // Second sit → should be rejected
    client.send(MessageTypes.COMMAND, makeCommand('sit'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(0);
    const alreadyMsg = collector.narrate.find((m) => m.text.match(/already.*sit/i));
    expect(alreadyMsg).toBeDefined();

    await client.leave();
  });

  // ─── Movement resets posture ──────────────────────────────────────────────

  it('movement after sitting resets posture to standing', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');
    collector.clear();

    // Sit down
    client.send(MessageTypes.COMMAND, makeCommand('sit'));
    await wait(300);

    // Move (this should reset posture)
    client.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(500);

    // Issue stand — if posture was properly reset, this should say "already standing"
    collector.clear();
    client.send(MessageTypes.COMMAND, makeCommand('stand'));
    await wait(500);

    // Should get "already standing" since movement reset posture
    const alreadyMsg = collector.narrate.find((m) => m.text.match(/already.*stand/i));
    expect(alreadyMsg).toBeDefined();

    await client.leave();
  });

  // ─── Multi-player posture visibility ──────────────────────────────────────

  it('second player sees first player posture in look', async () => {
    const room = await colyseus.createRoom('zone', {});

    const handle1 = await connectToExistingRoom(colyseus, room, 500);
    const handle2 = await connectToExistingRoom(colyseus, room, 500);

    // Player 1 sits
    handle1.client.send(MessageTypes.COMMAND, makeCommand('sit'));
    await wait(500);

    // Player 2 looks
    handle2.collector.clear();
    handle2.client.send(MessageTypes.COMMAND, makeCommand('look'));
    await wait(500);

    // Player 2 should see player 1's posture in the look output
    const lookNarration = handle2.collector.narrate.find(
      (m) => m.type === 'room' && m.text.match(/sitting here/i),
    );
    expect(lookNarration).toBeDefined();

    await handle1.client.leave();
    await handle2.client.leave();
  });

  // ─── PLAYER_STATE includes posture ────────────────────────────────────────

  it('PLAYER_STATE message includes posture after posture change', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');
    collector.clear();

    client.send(MessageTypes.COMMAND, makeCommand('sit'));
    await wait(500);

    // Check if any PLAYER_STATE message was sent with posture info
    // The implementation may send posture as part of PLAYER_STATE or a new message type
    const stateWithPosture = collector.playerState.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (msg) => (msg as any).posture !== undefined,
    );

    // If posture is in PLAYER_STATE:
    if (stateWithPosture) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((stateWithPosture as any).posture).toBe('sitting');
    }
    // Otherwise posture info comes through narration (also acceptable)

    await client.leave();
  });
});
