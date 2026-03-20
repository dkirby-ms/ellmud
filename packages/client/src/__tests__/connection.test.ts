/**
 * connection.test.ts — Verify message-only protocol.
 *
 * CRITICAL TEST: The connection module must NEVER subscribe to
 * room.state, room.onStateChange, or any Schema-related APIs.
 * We verify this by inspecting the source code and mocking Colyseus.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MessageTypes } from '@ellmud/shared';

// Read the connection source to verify no Schema subscriptions
const connectionSource = readFileSync(
  join(__dirname, '..', 'services', 'connection.ts'),
  'utf-8',
);

describe('Connection — message-only protocol enforcement', () => {
  it('must NOT reference room.state', () => {
    expect(connectionSource).not.toContain('room.state');
    expect(connectionSource).not.toContain('.state.');
  });

  it('must NOT subscribe to onStateChange', () => {
    expect(connectionSource).not.toContain('onStateChange');
  });

  it('must NOT reference Schema in code (comments OK)', () => {
    // Strip comments, then check for Schema usage in actual code
    const codeOnly = connectionSource
      .replace(/\/\*[\s\S]*?\*\//g, '')  // block comments
      .replace(/\/\/.*/g, '');            // line comments
    expect(codeOnly).not.toMatch(/from\s+['"]@colyseus\/schema['"]/);
    expect(codeOnly).not.toMatch(/\bSchema\b/);
  });

  it('subscribes to narrate, room_header, shard_state, combat_result, room_switch messages', () => {
    expect(connectionSource).toContain('MessageTypes.NARRATE');
    expect(connectionSource).toContain('MessageTypes.ROOM_HEADER');
    expect(connectionSource).toContain('MessageTypes.SHARD_STATE');
    expect(connectionSource).toContain('MessageTypes.COMBAT_RESULT');
    expect(connectionSource).toContain('MessageTypes.ROOM_SWITCH');
  });

  it('sends commands using MessageTypes.COMMAND', () => {
    expect(connectionSource).toContain('MessageTypes.COMMAND');
  });
});

// Mock Colyseus Client — shared mock so switchRoom can get a different return value
let mockJoinOrCreate = vi.fn();
const mockRoom = {
  onMessage: vi.fn(),
  onError: vi.fn(),
  onLeave: vi.fn(),
  send: vi.fn(),
  leave: vi.fn(),
};
mockJoinOrCreate.mockResolvedValue(mockRoom);

vi.mock('@colyseus/sdk', () => {
  return {
    Client: class MockClient {
      joinOrCreate = (...args: unknown[]) => mockJoinOrCreate(...args);
    },
    Room: class MockRoom {},
  };
});

describe('Connection — runtime behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module-level client singleton
  });

  it('connect() subscribes to all 5 message types + error + leave', async () => {
    // Dynamic import to get the module after mocks are set up
    const { connect, resetClient } = await import('../services/connection.js');
    resetClient();

    const handlers = {
      onNarrate: vi.fn(),
      onRoomHeader: vi.fn(),
      onShardState: vi.fn(),
      onCombatResult: vi.fn(),
      onRoomSwitch: vi.fn(),
      onError: vi.fn(),
      onLeave: vi.fn(),
    };

    const room = await connect('test-token', 'refuge', handlers);

    // 5 message subscriptions
    expect(mockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.NARRATE, handlers.onNarrate);
    expect(mockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.ROOM_HEADER, handlers.onRoomHeader);
    expect(mockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.SHARD_STATE, handlers.onShardState);
    expect(mockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.COMBAT_RESULT, handlers.onCombatResult);
    expect(mockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.ROOM_SWITCH, handlers.onRoomSwitch);

    // Error and leave handlers
    expect(mockRoom.onError).toHaveBeenCalledTimes(1);
    expect(mockRoom.onLeave).toHaveBeenCalledTimes(1);

    expect(room).toBe(mockRoom);
  });

  it('sendRawCommand() parses input into verb and args', async () => {
    const { sendRawCommand } = await import('../services/connection.js');

    sendRawCommand(mockRoom as any, 'go north');
    expect(mockRoom.send).toHaveBeenCalledWith(MessageTypes.COMMAND, {
      verb: 'go',
      args: ['north'],
    });
  });

  it('sendRawCommand() ignores empty input', async () => {
    const { sendRawCommand } = await import('../services/connection.js');
    mockRoom.send.mockClear();

    sendRawCommand(mockRoom as any, '   ');
    expect(mockRoom.send).not.toHaveBeenCalled();
  });

  it('switchRoom() leaves current room and joins target with re-registered handlers', async () => {
    const { switchRoom, resetClient } = await import('../services/connection.js');
    resetClient();

    const newMockRoom = {
      onMessage: vi.fn(),
      onError: vi.fn(),
      onLeave: vi.fn(),
      send: vi.fn(),
      leave: vi.fn(),
    };

    // Configure the shared mock to return the new room for the next joinOrCreate
    mockJoinOrCreate.mockResolvedValueOnce(newMockRoom);

    const currentRoom = {
      leave: vi.fn().mockResolvedValue(undefined),
    };

    const handlers = {
      onNarrate: vi.fn(),
      onRoomHeader: vi.fn(),
      onShardState: vi.fn(),
      onCombatResult: vi.fn(),
      onRoomSwitch: vi.fn(),
      onError: vi.fn(),
      onLeave: vi.fn(),
    };

    const result = await switchRoom(currentRoom as any, 'shard', 'test-token', handlers);

    // Should have left the current room
    expect(currentRoom.leave).toHaveBeenCalled();

    // Should have registered all 5 message handlers on the new room
    expect(newMockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.NARRATE, handlers.onNarrate);
    expect(newMockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.ROOM_HEADER, handlers.onRoomHeader);
    expect(newMockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.SHARD_STATE, handlers.onShardState);
    expect(newMockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.COMBAT_RESULT, handlers.onCombatResult);
    expect(newMockRoom.onMessage).toHaveBeenCalledWith(MessageTypes.ROOM_SWITCH, handlers.onRoomSwitch);
    expect(newMockRoom.onError).toHaveBeenCalledTimes(1);
    expect(newMockRoom.onLeave).toHaveBeenCalledTimes(1);

    expect(result).toBe(newMockRoom);
  });
});
