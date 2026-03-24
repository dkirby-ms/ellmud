"use strict";
/**
 * connection.test.ts — Verify message-only protocol.
 *
 * CRITICAL TEST: The connection module must NEVER subscribe to
 * room.state, room.onStateChange, or any Schema-related APIs.
 * We verify this by inspecting the source code and mocking Colyseus.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs_1 = require("fs");
const path_1 = require("path");
const shared_1 = require("@ellmud/shared");
// Read the connection source to verify no Schema subscriptions
const connectionSource = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '..', 'services', 'connection.ts'), 'utf-8');
(0, vitest_1.describe)('Connection — message-only protocol enforcement', () => {
    (0, vitest_1.it)('must NOT reference room.state', () => {
        (0, vitest_1.expect)(connectionSource).not.toContain('room.state');
        (0, vitest_1.expect)(connectionSource).not.toContain('.state.');
    });
    (0, vitest_1.it)('must NOT subscribe to onStateChange', () => {
        (0, vitest_1.expect)(connectionSource).not.toContain('onStateChange');
    });
    (0, vitest_1.it)('must NOT reference Schema in code (comments OK)', () => {
        // Strip comments, then check for Schema usage in actual code
        const codeOnly = connectionSource
            .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
            .replace(/\/\/.*/g, ''); // line comments
        (0, vitest_1.expect)(codeOnly).not.toMatch(/from\s+['"]@colyseus\/schema['"]/);
        (0, vitest_1.expect)(codeOnly).not.toMatch(/\bSchema\b/);
    });
    (0, vitest_1.it)('subscribes to narrate, room_header, shard_state, combat_result, room_switch messages', () => {
        (0, vitest_1.expect)(connectionSource).toContain('MessageTypes.NARRATE');
        (0, vitest_1.expect)(connectionSource).toContain('MessageTypes.ROOM_HEADER');
        (0, vitest_1.expect)(connectionSource).toContain('MessageTypes.SHARD_STATE');
        (0, vitest_1.expect)(connectionSource).toContain('MessageTypes.COMBAT_RESULT');
        (0, vitest_1.expect)(connectionSource).toContain('MessageTypes.ROOM_SWITCH');
    });
    (0, vitest_1.it)('sends commands using MessageTypes.COMMAND', () => {
        (0, vitest_1.expect)(connectionSource).toContain('MessageTypes.COMMAND');
    });
});
// Mock Colyseus Client — shared mock so switchRoom can get a different return value
const mockJoinOrCreate = vitest_1.vi.fn();
const mockJoinById = vitest_1.vi.fn();
const mockRoom = {
    onMessage: vitest_1.vi.fn(),
    onError: vitest_1.vi.fn(),
    onLeave: vitest_1.vi.fn(),
    send: vitest_1.vi.fn(),
    leave: vitest_1.vi.fn(),
};
mockJoinOrCreate.mockResolvedValue(mockRoom);
mockJoinById.mockResolvedValue(mockRoom);
vitest_1.vi.mock('@colyseus/sdk', () => {
    return {
        Client: class MockClient {
            joinOrCreate = (...args) => mockJoinOrCreate(...args);
            joinById = (...args) => mockJoinById(...args);
        },
        Room: class MockRoom {
        },
    };
});
(0, vitest_1.describe)('Connection — runtime behavior', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Reset the module-level client singleton
    });
    (0, vitest_1.it)('connect() subscribes to all 5 message types + error + leave', async () => {
        // Dynamic import to get the module after mocks are set up
        const { connect, resetClient } = await import('../services/connection.js');
        resetClient();
        const handlers = {
            onNarrate: vitest_1.vi.fn(),
            onRoomHeader: vitest_1.vi.fn(),
            onShardState: vitest_1.vi.fn(),
            onCombatResult: vitest_1.vi.fn(),
            onRoomSwitch: vitest_1.vi.fn(),
            onError: vitest_1.vi.fn(),
            onLeave: vitest_1.vi.fn(),
        };
        const room = await connect('test-token', 'refuge', handlers);
        // 5 message subscriptions
        (0, vitest_1.expect)(mockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.NARRATE, handlers.onNarrate);
        (0, vitest_1.expect)(mockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.ROOM_HEADER, handlers.onRoomHeader);
        (0, vitest_1.expect)(mockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.SHARD_STATE, handlers.onShardState);
        (0, vitest_1.expect)(mockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.COMBAT_RESULT, handlers.onCombatResult);
        (0, vitest_1.expect)(mockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.ROOM_SWITCH, handlers.onRoomSwitch);
        // Error and leave handlers
        (0, vitest_1.expect)(mockRoom.onError).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(mockRoom.onLeave).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(room).toBe(mockRoom);
    });
    (0, vitest_1.it)('sendRawCommand() parses input into verb and args', async () => {
        const { sendRawCommand } = await import('../services/connection.js');
        sendRawCommand(mockRoom, 'go north');
        (0, vitest_1.expect)(mockRoom.send).toHaveBeenCalledWith(shared_1.MessageTypes.COMMAND, {
            verb: 'go',
            args: ['north'],
        });
    });
    (0, vitest_1.it)('sendRawCommand() ignores empty input', async () => {
        const { sendRawCommand } = await import('../services/connection.js');
        mockRoom.send.mockClear();
        sendRawCommand(mockRoom, '   ');
        (0, vitest_1.expect)(mockRoom.send).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('switchRoom() leaves current room and joins target with re-registered handlers', async () => {
        const { switchRoom, resetClient } = await import('../services/connection.js');
        resetClient();
        const newMockRoom = {
            onMessage: vitest_1.vi.fn(),
            onError: vitest_1.vi.fn(),
            onLeave: vitest_1.vi.fn(),
            send: vitest_1.vi.fn(),
            leave: vitest_1.vi.fn(),
        };
        // Configure the shared mock to return the new room for the next joinOrCreate
        mockJoinOrCreate.mockResolvedValueOnce(newMockRoom);
        const currentRoom = {
            leave: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        const handlers = {
            onNarrate: vitest_1.vi.fn(),
            onRoomHeader: vitest_1.vi.fn(),
            onShardState: vitest_1.vi.fn(),
            onCombatResult: vitest_1.vi.fn(),
            onRoomSwitch: vitest_1.vi.fn(),
            onError: vitest_1.vi.fn(),
            onLeave: vitest_1.vi.fn(),
        };
        const result = await switchRoom(currentRoom, 'shard', 'test-token', handlers);
        // Should have left the current room
        (0, vitest_1.expect)(currentRoom.leave).toHaveBeenCalled();
        // Should have registered all 5 message handlers on the new room
        (0, vitest_1.expect)(newMockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.NARRATE, handlers.onNarrate);
        (0, vitest_1.expect)(newMockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.ROOM_HEADER, handlers.onRoomHeader);
        (0, vitest_1.expect)(newMockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.SHARD_STATE, handlers.onShardState);
        (0, vitest_1.expect)(newMockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.COMBAT_RESULT, handlers.onCombatResult);
        (0, vitest_1.expect)(newMockRoom.onMessage).toHaveBeenCalledWith(shared_1.MessageTypes.ROOM_SWITCH, handlers.onRoomSwitch);
        (0, vitest_1.expect)(newMockRoom.onError).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(newMockRoom.onLeave).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(result).toBe(newMockRoom);
    });
    (0, vitest_1.it)('switchRoom() joins by id when roomId is provided', async () => {
        const { switchRoom, resetClient } = await import('../services/connection.js');
        resetClient();
        const newMockRoom = {
            onMessage: vitest_1.vi.fn(),
            onError: vitest_1.vi.fn(),
            onLeave: vitest_1.vi.fn(),
            send: vitest_1.vi.fn(),
            leave: vitest_1.vi.fn(),
        };
        mockJoinById.mockResolvedValueOnce(newMockRoom);
        const currentRoom = {
            leave: vitest_1.vi.fn().mockResolvedValue(undefined),
        };
        const handlers = {
            onNarrate: vitest_1.vi.fn(),
            onRoomHeader: vitest_1.vi.fn(),
            onShardState: vitest_1.vi.fn(),
            onCombatResult: vitest_1.vi.fn(),
            onRoomSwitch: vitest_1.vi.fn(),
            onError: vitest_1.vi.fn(),
            onLeave: vitest_1.vi.fn(),
        };
        const result = await switchRoom(currentRoom, 'shard', 'test-token', handlers, { roomId: 'room-123', biome: 'flooded_crypt', tier: 1 });
        (0, vitest_1.expect)(mockJoinById).toHaveBeenCalledWith('room-123', {
            token: 'test-token',
            biome: 'flooded_crypt',
            tier: 1,
        });
        (0, vitest_1.expect)(result).toBe(newMockRoom);
    });
});
//# sourceMappingURL=connection.test.js.map