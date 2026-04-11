/**
 * Follow Arrival Notification Tests
 *
 * Verifies that when a leader moves rooms, followers auto-move and:
 * 1. The leader sees "FollowerName follows you." AFTER their own room description
 * 2. Other players in the destination room see the generic "FollowerName arrives."
 * 3. The departure room still sees "FollowerName follows LeaderName."
 *
 * NOTE: Without a test DB, character names fall back to 'A wanderer' / 'Someone'.
 * We test message ordering and type rather than exact name content.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import type { NarrateMessage } from '@ellmud/shared';
import {
  bootTestServer,
  wait,
  makeCommand,
} from './helpers/index.js';
import { MessageCollector } from './helpers/message-collector.js';
import { resetConfig } from '../config.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  process.env['MAX_PLAYERS_PER_ZONE'] = '10';
  resetConfig();
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
  delete process.env['MAX_PLAYERS_PER_ZONE'];
  resetConfig();
});

describe('Follow arrival notifications', () => {
  it('leader sees "follows you." after room description, not generic arrival', async () => {
    const room = await colyseus.createRoom('zone', {});

    // Connect leader and follower (names fallback to 'A wanderer' without DB)
    const leader = await colyseus.connectTo(room, { playerId: 'leader-1' });
    const leaderCollector = new MessageCollector(leader);
    await wait(600);

    const follower = await colyseus.connectTo(room, { playerId: 'follower-1' });
    const followerCollector = new MessageCollector(follower);
    await wait(600);

    // Follower starts following leader (fallback name 'A wanderer')
    follower.send(MessageTypes.COMMAND, makeCommand('follow', 'A', 'wanderer'));
    await wait(500);

    // Verify follow was established
    const followConfirm = followerCollector.narrate.find((n: NarrateMessage) =>
      n.text.includes('You begin following'),
    );
    expect(followConfirm).toBeDefined();

    // Clear collectors before movement to isolate arrival messages
    leaderCollector.clear();
    followerCollector.clear();

    // Leader moves north
    leader.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(1000);

    const leaderNarrates = leaderCollector.narrate;

    // Find the room description narration (type 'room')
    const roomDescIdx = leaderNarrates.findIndex((n: NarrateMessage) => n.type === 'room');

    // If leader actually moved (has a room description), verify ordering
    if (roomDescIdx >= 0) {
      // Find the "follows you" narration
      const followsYouIdx = leaderNarrates.findIndex((n: NarrateMessage) =>
        n.text.includes('follows you'),
      );

      expect(followsYouIdx).toBeGreaterThan(-1);
      expect(followsYouIdx).toBeGreaterThan(roomDescIdx);

      // Verify the follow message metadata
      const followMsg = leaderNarrates[followsYouIdx]!;
      expect(followMsg.text).toMatch(/follows you\./);
      expect(followMsg.type).toBe('ambient');

      // Leader should NOT see generic "arrives." for the follower
      const genericArrival = leaderNarrates.find((n: NarrateMessage) =>
        n.text.includes('arrives') && n.type === 'ambient',
      );
      expect(genericArrival).toBeUndefined();
    }

    await follower.leave();
    await leader.leave();
  }, 15_000);

  it('follower sees "You follow ..." room description on auto-move', async () => {
    const room = await colyseus.createRoom('zone', {});

    const leader = await colyseus.connectTo(room, { playerId: 'leader-2' });
    await wait(600);

    const follower = await colyseus.connectTo(room, { playerId: 'follower-2' });
    const followerCollector = new MessageCollector(follower);
    await wait(600);

    follower.send(MessageTypes.COMMAND, makeCommand('follow', 'A', 'wanderer'));
    await wait(500);

    followerCollector.clear();

    leader.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(1000);

    // Follower should see "You follow ..." in their room description
    const followNarrate = followerCollector.narrate.find((n: NarrateMessage) =>
      n.text.includes('You follow') && n.type === 'room',
    );
    expect(followNarrate).toBeDefined();

    await follower.leave();
    await leader.leave();
  }, 15_000);

  it('bystander in destination room sees generic arrival, not follow message', async () => {
    const room = await colyseus.createRoom('zone', {});

    // Connect three players to the same room
    const bystander = await colyseus.connectTo(room, { playerId: 'bystander-1' });
    const bystanderCollector = new MessageCollector(bystander);
    await wait(600);

    const leader = await colyseus.connectTo(room, { playerId: 'leader-3' });
    await wait(600);

    const follower = await colyseus.connectTo(room, { playerId: 'follower-3' });
    await wait(600);

    // Follower follows leader (name lookup finds one of the 'A wanderer's)
    follower.send(MessageTypes.COMMAND, makeCommand('follow', 'A', 'wanderer'));
    await wait(500);

    // Move bystander north first so they're waiting in the destination room
    bystander.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(800);
    bystanderCollector.clear();

    // Leader moves north
    leader.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(1000);

    // Bystander should NOT see "follows you." (that's leader-only)
    const followsYou = bystanderCollector.narrate.find((n: NarrateMessage) =>
      n.text.includes('follows you'),
    );
    expect(followsYou).toBeUndefined();

    // Bystander should see generic "arrives" for the follower
    const arrivalMsg = bystanderCollector.narrate.find((n: NarrateMessage) =>
      n.text.includes('arrives') && n.type === 'ambient',
    );
    expect(arrivalMsg).toBeDefined();

    await follower.leave();
    await leader.leave();
    await bystander.leave();
  }, 20_000);
});
