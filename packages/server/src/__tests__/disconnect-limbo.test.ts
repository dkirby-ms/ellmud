/**
 * disconnect-limbo.test.ts — Disconnect limbo type contract (WI-8)
 *
 * Verifies that the shared RoomOccupantsMessage type supports the
 * `disconnected` flag on players, ensuring the server can broadcast
 * linkdead status to clients.
 */

import { describe, it, expect } from 'vitest';
import type { RoomOccupantsMessage } from '@ellmud/shared';

describe('RoomOccupantsMessage disconnect limbo', () => {
  it('supports disconnected field on players', () => {
    const msg: RoomOccupantsMessage = {
      creatures: [],
      players: [
        { id: '1', name: 'Linkdead', disconnected: true },
        { id: '2', name: 'Connected' },
      ],
    };

    expect(msg.players[0]!.disconnected).toBe(true);
    expect(msg.players[1]!.disconnected).toBeUndefined();
  });

  it('disconnected defaults to undefined when omitted', () => {
    const msg: RoomOccupantsMessage = {
      creatures: [],
      players: [{ id: '1', name: 'Normal' }],
    };

    expect(msg.players[0]!.disconnected).toBeUndefined();
  });

  it('includes creatures alongside disconnected players', () => {
    const msg: RoomOccupantsMessage = {
      creatures: [
        { id: 'c1', name: 'Goblin', type: 'goblin', aggressive: true },
      ],
      players: [
        { id: 'p1', name: 'AFK Ranger', disconnected: true },
        { id: 'p2', name: 'Active Mage' },
      ],
    };

    expect(msg.creatures).toHaveLength(1);
    expect(msg.players).toHaveLength(2);
    expect(msg.players[0]!.disconnected).toBe(true);
    expect(msg.players[1]!.disconnected).toBeUndefined();
  });
});
