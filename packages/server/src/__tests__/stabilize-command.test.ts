/**
 * Stabilize command handler tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleStabilize } from '../commands/handlers/stabilize.js';
import { DowningSystem, BANDAGE_ITEM_ID } from '../systems/DowningSystem.js';
import { PlayerState } from '../state/PlayerState.js';
import type { CommandContext } from '../commands/index.js';
import type { Room } from '../shard/RoomGraph.js';
import type { Item } from '../shard/RoomGraph.js';

const ROOM_ID = 'room-1';

const BANDAGE: Item = {
  id: BANDAGE_ITEM_ID,
  name: 'Bandage',
  weight: 0.5,
  description: 'A strip of clean cloth for binding wounds.',
};

function makeRoom(): Room {
  return {
    id: ROOM_ID,
    name: 'Test Room',
    description: 'A test room.',
    exits: new Map(),
    items: [],
  };
}

function makeContext(
  player: PlayerState,
  downingSystem: DowningSystem,
  args: string[] = [],
): CommandContext {
  return {
    player,
    room: makeRoom(),
    args,
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
    downingSystem,
  };
}

describe('stabilize command', () => {
  let downing: DowningSystem;
  let healer: PlayerState;

  beforeEach(() => {
    downing = new DowningSystem();
    healer = new PlayerState('healer', ROOM_ID);
    healer.addItem({ ...BANDAGE });
  });

  it('should reject when no downing system available', () => {
    const ctx = makeContext(healer, undefined as unknown as DowningSystem);
    ctx.downingSystem = undefined;
    const result = handleStabilize(ctx);
    expect(result.narrations[0]!.type).toBe('system');
  });

  it('should reject when stabilizer is downed', () => {
    downing.downPlayer('healer', 'Healer', ROOM_ID);
    const ctx = makeContext(healer, downing);
    const result = handleStabilize(ctx);
    expect(result.narrations[0]!.text).toContain('too injured');
  });

  it('should reject when no downed players in room', () => {
    const ctx = makeContext(healer, downing);
    const result = handleStabilize(ctx);
    expect(result.narrations[0]!.text).toContain('no one here');
  });

  it('should reject when player has no bandage', () => {
    downing.downPlayer('victim', 'Victim', ROOM_ID);
    const noBandageHealer = new PlayerState('healer', ROOM_ID);
    const ctx = makeContext(noBandageHealer, downing);
    const result = handleStabilize(ctx);
    expect(result.narrations[0]!.text).toContain('bandage');
  });

  it('should begin stabilization on first downed player (no args)', () => {
    downing.downPlayer('victim', 'Victim', ROOM_ID);
    const ctx = makeContext(healer, downing);
    const result = handleStabilize(ctx);
    expect(result.narrations[0]!.type).toBe('combat');
    expect(result.narrations[0]!.text).toContain('bandages');
    expect(downing.isChannelingStabilize('healer')).toBe(true);
  });

  it('should consume the bandage item', () => {
    downing.downPlayer('victim', 'Victim', ROOM_ID);
    const ctx = makeContext(healer, downing);
    handleStabilize(ctx);
    expect(healer.findItem(BANDAGE_ITEM_ID)).toBeNull();
  });

  it('should find target by name', () => {
    downing.downPlayer('v1', 'Brave Hero', ROOM_ID);
    downing.downPlayer('v2', 'Dark Rogue', ROOM_ID);
    const ctx = makeContext(healer, downing, ['dark']);
    const result = handleStabilize(ctx);
    expect(result.narrations[0]!.type).toBe('combat');
    // Should be channeling to v2 (Dark Rogue matched by 'dark')
    const channel = downing.getStabilizeChannel('healer');
    expect(channel).toBeDefined();
    expect(channel!.targetId).toBe('v2');
  });

  it('should reject invalid target name', () => {
    downing.downPlayer('victim', 'Victim', ROOM_ID);
    const ctx = makeContext(healer, downing, ['nobody']);
    const result = handleStabilize(ctx);
    expect(result.narrations[0]!.text).toContain("don't see");
  });

  it('should reject already-channeling healer', () => {
    downing.downPlayer('v1', 'Victim1', ROOM_ID);
    downing.downPlayer('v2', 'Victim2', ROOM_ID);
    const ctx1 = makeContext(healer, downing);
    handleStabilize(ctx1); // Start channeling on v1

    // Add another bandage for second attempt
    healer.addItem({ ...BANDAGE });
    const ctx2 = makeContext(healer, downing, ['victim2']);
    const result = handleStabilize(ctx2);
    expect(result.narrations[0]!.text).toContain('already stabilizing');
  });

  it('should not consume bandage on validation error', () => {
    // No one to stabilize — bandage should not be consumed
    const ctx = makeContext(healer, downing);
    handleStabilize(ctx);
    expect(healer.findItem(BANDAGE_ITEM_ID)).not.toBeNull();
  });

  it('should filter downed players to same room', () => {
    downing.downPlayer('far-away', 'FarPlayer', 'room-other');
    const ctx = makeContext(healer, downing);
    const result = handleStabilize(ctx);
    expect(result.narrations[0]!.text).toContain('no one here');
  });
});
