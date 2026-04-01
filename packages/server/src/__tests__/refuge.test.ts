/**
 * Zone-mode ZoneRoom tests — verify multi-player behavior and welcome messages.
 * (Migrated from RefugeRoom tests — ZoneRoom with zoneSlug replaces RefugeRoom.)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import {
  bootTestServer,
  wait,
  makeCommand,
} from './helpers/index.js';
import { MessageCollector } from './helpers/message-collector.js';

describe('Zone ZoneRoom Multi-Player (the-refuge)', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  it('should send welcome narration to each player individually', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });

    const client1 = await colyseus.connectTo(room);
    const collector1 = new MessageCollector(client1);
    await wait(500);

    const client2 = await colyseus.connectTo(room);
    const collector2 = new MessageCollector(client2);
    await wait(500);

    // Both players should have received welcome messages
    expect(collector1.narrate.length).toBeGreaterThan(0);
    expect(collector2.narrate.length).toBeGreaterThan(0);

    // Welcome messages should be system type
    expect(collector1.narrateByType('system').length).toBeGreaterThan(0);
    expect(collector2.narrateByType('system').length).toBeGreaterThan(0);

    await client1.leave();
    await client2.leave();
  });

  it('should send room header to each player on join', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });

    const client1 = await colyseus.connectTo(room);
    const collector1 = new MessageCollector(client1);
    await wait(500);

    const client2 = await colyseus.connectTo(room);
    const collector2 = new MessageCollector(client2);
    await wait(500);

    // Both should receive room_header
    expect(collector1.roomHeader.length).toBeGreaterThan(0);
    expect(collector2.roomHeader.length).toBeGreaterThan(0);

    // Room header should be The Hearth (entry room of the-refuge zone)
    expect(collector1.roomHeader[0]!.roomName).toContain('Hearth');
    expect(collector2.roomHeader[0]!.roomName).toContain('Hearth');

    // Zone rooms are always stable
    expect(collector1.roomHeader[0]!.stability).toBe(1.0);

    // Hearth should have exits
    expect(collector1.roomHeader[0]!.exits.length).toBeGreaterThan(0);

    await client1.leave();
    await client2.leave();
  });

  it('should handle three or more concurrent players', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });

    const clients: Array<Awaited<ReturnType<typeof colyseus.connectTo>>> = [];
    const collectors: MessageCollector[] = [];

    for (let i = 0; i < 3; i++) {
      const client = await colyseus.connectTo(room);
      const collector = new MessageCollector(client);
      clients.push(client);
      collectors.push(collector);
      await wait(200);
    }

    // All three should have received messages
    for (const collector of collectors) {
      expect(collector.narrate.length).toBeGreaterThan(0);
      expect(collector.roomHeader.length).toBeGreaterThan(0);
    }

    for (const client of clients) {
      await client.leave();
    }
  });

  it.todo('should handle board command in refuge zone', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });
    const client = await colyseus.connectTo(room);
    const collector = new MessageCollector(client);
    await wait(500);

    // Navigate to the expedition board room (west from hearth)
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    const initialCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('board'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(initialCount);
    const newMessages = collector.narrate.slice(initialCount);
    const response = newMessages.find(m => m.text.includes('Expedition Board'));
    expect(response).toBeDefined();
    expect(response!.text).toContain('Tier');
    expect(response!.text).toContain('enter <zone-id>');

    await client.leave();
  });

  it.todo('should send ROOM_SWITCH message when "enter zone" command is used', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });
    const client = await colyseus.connectTo(room);
    const collector = new MessageCollector(client);
    await wait(500);

    // Navigate to the expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', 'zone'));
    await wait(500);

    // Should receive a ROOM_SWITCH message targeting 'zone'
    expect(collector.roomSwitch.length).toBe(1);
    expect(collector.roomSwitch[0]!.target).toBe('zone');
    expect(collector.roomSwitch[0]!.reason).toBe('enter_zone');
    expect(collector.roomSwitch[0]!.options?.roomId).toBeDefined();

    // Should also receive transition narration
    const transitionMsg = collector.narrate.find((m) => m.text.includes('rift'));
    expect(transitionMsg).toBeDefined();

    await client.leave();
  });

  it.todo('should send ROOM_SWITCH for bare "enter" command (defaults to zone)', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });
    const client = await colyseus.connectTo(room);
    const collector = new MessageCollector(client);
    await wait(500);

    // Navigate to the expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter'));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(1);
    expect(collector.roomSwitch[0]!.target).toBe('zone');
    expect(collector.roomSwitch[0]!.options?.roomId).toBeDefined();

    await client.leave();
  });

  it.todo('should send ROOM_SWITCH when entering a specific zone id', async () => {
    const zone = await colyseus.createRoom('zone', { openDelayMs: 0 });
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });
    const client = await colyseus.connectTo(room);
    const collector = new MessageCollector(client);
    await wait(500);

    // Navigate to the expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', zone.roomId));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(1);
    expect(collector.roomSwitch[0]!.options?.roomId).toBe(zone.roomId);

    await client.leave();
  });

  it.todo('should reject "enter" with unknown target', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });
    const client = await colyseus.connectTo(room);
    const collector = new MessageCollector(client);
    await wait(500);

    // Navigate to the expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    const initialCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('enter', 'tavern'));
    await wait(500);

    // Should NOT send ROOM_SWITCH
    expect(collector.roomSwitch.length).toBe(0);

    // Should narrate the error (search by content, not position — ambient narration may arrive after)
    expect(collector.narrate.length).toBeGreaterThan(initialCount);
    const newMessages = collector.narrate.slice(initialCount);
    const errorMsg = newMessages.find(m => m.text.includes('No zone with id'));
    expect(errorMsg, 'Expected a system narration containing "No zone with id"').toBeTruthy();
    expect(errorMsg!.text).toContain('tavern');
    expect(errorMsg!.type).toBe('system');

    await client.leave();
  });

  it('should handle unknown commands gracefully', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });
    const client = await colyseus.connectTo(room);
    const collector = new MessageCollector(client);
    await wait(500);

    const initialCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('dance'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(initialCount);
    const newMessages = collector.narrate.slice(initialCount);
    const response = newMessages.find(m => m.text.includes('dance'));
    expect(response, 'Expected a system narration containing "dance"').toBeTruthy();
    expect(response!.type).toBe('system');

    await client.leave();
  });
});
