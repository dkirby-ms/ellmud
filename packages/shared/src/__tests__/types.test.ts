/**
 * Shared package tests — verify message types and constants are correctly exported.
 */
import { describe, it, expect } from 'vitest';
import {
  MessageTypes,
  type CommandMessage,
  type NarrateMessage,
  type RoomHeaderMessage,
  type ShardStateMessage,
  type ExtractionMessage,
  type RoomSwitchMessage,
  type NarrationType,
  type ShardState,
  type CombatAction,

  type GearTier,
  type ShardTier,
  type ShardModifier,
  type MessageTypeKey,
} from '../index.js';

describe('MessageTypes', () => {
  it('should export COMMAND type key', () => {
    expect(MessageTypes.COMMAND).toBe('cmd');
  });

  it('should export NARRATE type key', () => {
    expect(MessageTypes.NARRATE).toBe('narrate');
  });

  it('should export ROOM_HEADER type key', () => {
    expect(MessageTypes.ROOM_HEADER).toBe('room_header');
  });

  it('should export SHARD_STATE type key', () => {
    expect(MessageTypes.SHARD_STATE).toBe('shard_state');
  });

  it('should export EXTRACTION_STATE type key', () => {
    expect(MessageTypes.EXTRACTION_STATE).toBe('extraction_state');
  });

  it('should export STASH_UPDATE type key', () => {
    expect(MessageTypes.STASH_UPDATE).toBe('stash_update');
  });

  it('should export ROOM_SWITCH type key', () => {
    expect(MessageTypes.ROOM_SWITCH).toBe('room_switch');
  });

  it('should have exactly 25 message types', () => {
    const keys = Object.keys(MessageTypes);
    expect(keys).toHaveLength(25);
  });

  it('should have unique values for all message types', () => {
    const values = Object.values(MessageTypes);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('Message Type Shapes', () => {
  it('CommandMessage should accept verb and args', () => {
    const msg: CommandMessage = { verb: 'look', args: ['north'] };
    expect(msg.verb).toBe('look');
    expect(msg.args).toEqual(['north']);
  });

  it('NarrateMessage should accept text, type, and timestamp', () => {
    const msg: NarrateMessage = { text: 'hello', type: 'system', timestamp: 12345 };
    expect(msg.text).toBe('hello');
    expect(msg.type).toBe('system');
    expect(msg.timestamp).toBe(12345);
  });

  it('RoomHeaderMessage should accept roomName, exits, stability', () => {
    const msg: RoomHeaderMessage = {
      roomName: 'Test Room',
      exits: ['north', 'south'],
      stability: 0.75,
    };
    expect(msg.roomName).toBe('Test Room');
    expect(msg.exits).toEqual(['north', 'south']);
    expect(msg.stability).toBe(0.75);
  });

  it('ShardStateMessage should accept state and optional collapseTimer', () => {
    const msg: ShardStateMessage = { state: 'active', collapseTimer: 600 };
    expect(msg.state).toBe('active');
    expect(msg.collapseTimer).toBe(600);
  });

  it('ShardStateMessage should work without collapseTimer', () => {
    const msg: ShardStateMessage = { state: 'seeding' };
    expect(msg.state).toBe('seeding');
    expect(msg.collapseTimer).toBeUndefined();
  });

  it('ExtractionMessage should accept extraction state fields', () => {
    const msg: ExtractionMessage = {
      playerId: 'p1',
      state: 'started',
      ticksRemaining: 5,
      totalTicks: 10,
      narration: 'You begin channelling extraction.',
      timestamp: 12345,
    };
    expect(msg.playerId).toBe('p1');
    expect(msg.state).toBe('started');
    expect(msg.ticksRemaining).toBe(5);
  });

  it('RoomSwitchMessage should accept target, reason, and optional options', () => {
    const msg: RoomSwitchMessage = {
      target: 'shard',
      reason: 'enter_shard',
    };
    expect(msg.target).toBe('shard');
    expect(msg.reason).toBe('enter_shard');
    expect(msg.options).toBeUndefined();

    const msgWithOptions: RoomSwitchMessage = {
      target: 'zone:the-refuge',
      reason: 'extraction_complete',
      options: { roomId: 'room-123' },
    };
    expect(msgWithOptions.options).toEqual({ roomId: 'room-123' });
  });
});

describe('Type Enumerations', () => {
  it('NarrationType should allow all valid narration types', () => {
    const types: NarrationType[] = ['room', 'combat', 'system', 'speech', 'sound', 'trace'];
    expect(types).toHaveLength(6);
  });

  it('ShardState should allow all lifecycle states', () => {
    const states: ShardState[] = ['seeding', 'open', 'active', 'destabilising', 'collapse'];
    expect(states).toHaveLength(5);
  });

  it('CombatAction should allow all combat actions', () => {
    const actions: CombatAction[] = [
      'strike', 'heavy_strike', 'dodge', 'block', 'use_item', 'skill', 'flee', 'observe',
    ];
    expect(actions).toHaveLength(8);
  });

  it('GearTier should allow all gear tiers', () => {
    const tiers: GearTier[] = [
      'scrap', 'common', 'sturdy', 'refined', 'masterwork', 'anomalous',
    ];
    expect(tiers).toHaveLength(6);
  });

  it('ShardTier should allow tiers 1-3', () => {
    const tiers: ShardTier[] = [1, 2, 3];
    expect(tiers).toHaveLength(3);
  });

  it('ShardModifier should allow all modifier types', () => {
    const mods: ShardModifier[] = [
      'darkness', 'hunted', 'silent', 'echoing', 'bountiful',
    ];
    expect(mods).toHaveLength(5);
  });

  it('MessageTypeKey should be a union of message type values', () => {
    const key: MessageTypeKey = 'cmd';
    expect(key).toBe('cmd');
  });
});
