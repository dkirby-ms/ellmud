/**
 * Group system tests (#403 Phase 3)
 *
 * Tests cover:
 * - GroupManager: form, add, remove, leave, disband, transfer leadership
 * - Group command handler: all subcommands, edge cases
 * - gsay: group-only message delivery
 * - Max group size enforcement
 * - Leader disconnect → disband
 * - Player death → group cleanup
 * - Review feedback fixes: #411, #412, #413
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult, type PlayerRef } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { GroupManager, MAX_GROUP_SIZE } from '../systems/GroupManager.js';
import type { Room, Direction } from '../generator/RoomGraph.js';
import { formatPlayerLines } from '../commands/handlers/player-display.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeRoom(id: string, overrides: Partial<Room> = {}): Room {
  return {
    id,
    name: `Room ${id}`,
    description: `A room called ${id}.`,
    exits: new Map<Direction, string>(),
    items: [],
    ...overrides,
  };
}

function makePlayer(sessionId: string, roomId: string): PlayerState {
  return new PlayerState(sessionId, roomId);
}

/** All players in the test, keyed by sessionId. */
let allPlayers: Map<string, { player: PlayerState; characterName: string }>;
let groupManager: GroupManager;

function registerPlayer(sessionId: string, characterName: string, roomId: string): PlayerState {
  const ps = makePlayer(sessionId, roomId);
  allPlayers.set(sessionId, { player: ps, characterName });
  return ps;
}

function buildCtx(
  overrides: Partial<CommandContext> & { player?: PlayerState; room?: Room } = {},
): CommandContext {
  const room = overrides.room ?? makeRoom('room-1');
  const player = overrides.player ?? makePlayer('player-1', room.id);
  return {
    player,
    room,
    args: [],
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
    groupManager,
    resolvePlayerByName: (name: string) => {
      const lower = name.toLowerCase();
      for (const [sid, data] of allPlayers) {
        if (data.characterName.toLowerCase() === lower) {
          return { sessionId: sid, player: data.player, characterName: data.characterName };
        }
      }
      return undefined;
    },
    resolvePlayerById: (sessionId: string) => {
      const data = allPlayers.get(sessionId);
      if (!data) return undefined;
      return { player: data.player, characterName: data.characterName };
    },
    ...overrides,
  };
}

function text(result: CommandResult): string {
  return result.narrations.map((n) => n.text).join('\n');
}

function narType(result: CommandResult): string {
  return result.narrations[0]?.type ?? '';
}

// ─── GroupManager Unit Tests ──────────────────────────────────────────────

describe('GroupManager (#403 Phase 3)', () => {
  beforeEach(() => {
    groupManager = new GroupManager();
    allPlayers = new Map();
    GroupManager.resetIdCounter();
  });

  describe('formGroup', () => {
    it('creates a group from leader and followers', () => {
      const result = groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
        { sessionId: 'f2', characterName: 'Wulfgar' },
      ]);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.leaderId).toBe('leader');
        expect(result.members.size).toBe(3); // leader + 2 followers
        expect(result.members.has('leader')).toBe(true);
        expect(result.members.has('f1')).toBe(true);
        expect(result.members.has('f2')).toBe(true);
      }
    });

    it('rejects if leader is already in a group', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f2', characterName: 'Wulfgar' },
      ]);
      expect('error' in result).toBe(true);
    });

    it('rejects when no followers provided', () => {
      const result = groupManager.formGroup('leader', 'Bruenor', []);
      expect('error' in result).toBe(true);
    });

    it('filters out followers already in a group', () => {
      groupManager.formGroup('leader1', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.formGroup('leader2', 'Wulfgar', [
        { sessionId: 'f1', characterName: 'Drizzt' },
        { sessionId: 'f2', characterName: 'Regis' },
      ]);
      if (!('error' in result)) {
        expect(result.members.size).toBe(2); // leader2 + f2
        expect(result.members.has('f1')).toBe(false);
      }
    });

    it('enforces max group size', () => {
      const followers = Array.from({ length: MAX_GROUP_SIZE }, (_, i) => ({
        sessionId: `f${i}`,
        characterName: `Player${i}`,
      }));
      const result = groupManager.formGroup('leader', 'Bruenor', followers);
      expect('error' in result).toBe(true);
    });
  });

  describe('addMember', () => {
    it('adds a member to the group', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.addMember('leader', 'f2', 'Wulfgar');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.group.members.size).toBe(3);
      }
    });

    it('only leader can add', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.addMember('f1', 'f2', 'Wulfgar');
      expect(result.success).toBe(false);
    });

    it('rejects adding a player already in a group', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.addMember('leader', 'f1', 'Drizzt');
      expect(result.success).toBe(false);
    });

    it('rejects when group is full', () => {
      const followers = Array.from({ length: MAX_GROUP_SIZE - 1 }, (_, i) => ({
        sessionId: `f${i}`,
        characterName: `Player${i}`,
      }));
      groupManager.formGroup('leader', 'Bruenor', followers);
      const result = groupManager.addMember('leader', 'extra', 'ExtraPlayer');
      expect(result.success).toBe(false);
    });
  });

  describe('removeMember', () => {
    it('leader removes a member', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
        { sessionId: 'f2', characterName: 'Wulfgar' },
      ]);
      const result = groupManager.removeMember('leader', 'f1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.group.members.has('f1')).toBe(false);
        expect(result.removed.characterName).toBe('Drizzt');
      }
    });

    it('non-leader cannot remove others', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
        { sessionId: 'f2', characterName: 'Wulfgar' },
      ]);
      const result = groupManager.removeMember('f1', 'f2');
      expect(result.success).toBe(false);
    });

    it('leader cannot leave (must disband or transfer)', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.removeMember('leader', 'leader');
      expect(result.success).toBe(false);
    });

    it('auto-disbands when only leader remains', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      groupManager.removeMember('leader', 'f1');
      // Group should be disbanded — leader no longer in a group
      expect(groupManager.getGroup('leader')).toBeUndefined();
    });
  });

  describe('transferLeadership', () => {
    it('transfers leadership to another member', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.transferLeadership('leader', 'f1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.group.leaderId).toBe('f1');
        expect(result.newLeaderName).toBe('Drizzt');
      }
    });

    it('only leader can transfer', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.transferLeadership('f1', 'leader');
      expect(result.success).toBe(false);
    });

    it('cannot transfer to self', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.transferLeadership('leader', 'leader');
      expect(result.success).toBe(false);
    });

    it('cannot transfer to non-member', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.transferLeadership('leader', 'outsider');
      expect(result.success).toBe(false);
    });
  });

  describe('disbandGroup', () => {
    it('disbands and removes all member mappings', () => {
      const group = groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
        { sessionId: 'f2', characterName: 'Wulfgar' },
      ]);
      if (!('error' in group)) {
        const members = groupManager.disbandGroup(group.id);
        expect(members).not.toBeNull();
        expect(members!.length).toBe(3);
        expect(groupManager.getGroup('leader')).toBeUndefined();
        expect(groupManager.getGroup('f1')).toBeUndefined();
        expect(groupManager.getGroup('f2')).toBeUndefined();
      }
    });
  });

  describe('handlePlayerLeave', () => {
    it('disbands group when leader leaves', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
        { sessionId: 'f2', characterName: 'Wulfgar' },
      ]);
      const result = groupManager.handlePlayerLeave('leader');
      expect(result).not.toBeNull();
      expect(result!.disbanded).toBe(true);
      expect(result!.members.length).toBe(3);
    });

    it('removes regular member without disbanding', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
        { sessionId: 'f2', characterName: 'Wulfgar' },
      ]);
      const result = groupManager.handlePlayerLeave('f1');
      expect(result).not.toBeNull();
      expect(result!.disbanded).toBe(false);
      // Leader's group still exists
      expect(groupManager.getGroup('leader')).toBeDefined();
    });

    it('auto-disbands when member leave leaves only leader', () => {
      groupManager.formGroup('leader', 'Bruenor', [
        { sessionId: 'f1', characterName: 'Drizzt' },
      ]);
      const result = groupManager.handlePlayerLeave('f1');
      expect(result).not.toBeNull();
      expect(result!.disbanded).toBe(true);
    });

    it('returns null for players not in a group', () => {
      expect(groupManager.handlePlayerLeave('nobody')).toBeNull();
    });
  });
});

// ─── Group Command Handler Tests ──────────────────────────────────────────

describe('group command (#403 Phase 3)', () => {
  let leader: PlayerState;
  let follower1: PlayerState;
  let follower2: PlayerState;
  let room1: Room;

  beforeEach(() => {
    groupManager = new GroupManager();
    allPlayers = new Map();
    GroupManager.resetIdCounter();
    room1 = makeRoom('room-1');
    leader = registerPlayer('leader', 'Bruenor', 'room-1');
    follower1 = registerPlayer('f1', 'Drizzt', 'room-1');
    follower2 = registerPlayer('f2', 'Wulfgar', 'room-1');
  });

  describe('group form', () => {
    it('forms a group from followers', () => {
      // Set up follow relationships
      leader.addFollower('f1');
      leader.addFollower('f2');
      follower1.startFollowing('leader');
      follower2.startFollowing('leader');

      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
        { sessionId: 'f2', name: 'Wulfgar', anon: false },
      ];

      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1', 'f2'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('You form a group with');
      expect(text(result)).toContain('Drizzt');
      expect(text(result)).toContain('Wulfgar');
      expect(narType(result)).toBe('room');
      expect(leader.groupId).not.toBeNull();
    });

    it('rejects form with no followers', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('no followers');
    });

    it('rejects form when already in a group', () => {
      leader.addFollower('f1');
      follower1.startFollowing('leader');

      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
      ];

      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1'],
        characterName: 'Bruenor',
      });

      handleCommand('group', ctx); // First form succeeds
      const result = handleCommand('group', ctx); // Second should fail
      expect(text(result)).toContain('already in a group');
    });
  });

  describe('group add', () => {
    beforeEach(() => {
      // Form initial group
      leader.addFollower('f1');
      follower1.startFollowing('leader');
      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
      ];
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1'],
        characterName: 'Bruenor',
      });
      handleCommand('group', ctx);
    });

    it('adds a player who is following the leader', () => {
      leader.addFollower('f2');
      follower2.startFollowing('leader');

      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
        { sessionId: 'f2', name: 'Wulfgar', anon: false },
      ];

      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['add', 'Wulfgar'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1', 'f2'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('You add Wulfgar to the group');
      expect(follower2.groupId).not.toBeNull();
    });

    it('adds a player who has consented to the leader', () => {
      follower2.consentedPlayers.add('leader');

      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
        { sessionId: 'f2', name: 'Wulfgar', anon: false },
      ];

      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['add', 'Wulfgar'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1', 'f2'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('You add Wulfgar to the group');
    });

    it('rejects adding a player without follow or consent', () => {
      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
        { sessionId: 'f2', name: 'Wulfgar', anon: false },
      ];

      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['add', 'Wulfgar'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1', 'f2'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('must be following you or have consented');
    });

    it('rejects add with no args', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['add'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('Add whom?');
    });

    it('non-leader cannot add', () => {
      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f2', name: 'Wulfgar', anon: false },
      ];

      const ctx = buildCtx({
        player: follower1,
        room: room1,
        args: ['add', 'Wulfgar'],
        otherPlayerInfo,
        characterName: 'Drizzt',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('Only the group leader');
    });
  });

  describe('group remove / kick', () => {
    beforeEach(() => {
      leader.addFollower('f1');
      leader.addFollower('f2');
      follower1.startFollowing('leader');
      follower2.startFollowing('leader');
      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
        { sessionId: 'f2', name: 'Wulfgar', anon: false },
      ];
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1', 'f2'],
        characterName: 'Bruenor',
      });
      handleCommand('group', ctx);
    });

    it('leader removes a member', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['remove', 'Drizzt'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('You remove Drizzt from the group');
      expect(follower1.groupId).toBeNull();
    });

    it('kick is an alias for remove', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['kick', 'Drizzt'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('You remove Drizzt from the group');
    });

    it('non-leader cannot kick', () => {
      const ctx = buildCtx({
        player: follower1,
        room: room1,
        args: ['remove', 'Wulfgar'],
        characterName: 'Drizzt',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('Only the group leader');
    });
  });

  describe('group leave', () => {
    beforeEach(() => {
      leader.addFollower('f1');
      leader.addFollower('f2');
      follower1.startFollowing('leader');
      follower2.startFollowing('leader');
      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
        { sessionId: 'f2', name: 'Wulfgar', anon: false },
      ];
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1', 'f2'],
        characterName: 'Bruenor',
      });
      handleCommand('group', ctx);
    });

    it('member leaves the group', () => {
      const ctx = buildCtx({
        player: follower1,
        room: room1,
        args: ['leave'],
        characterName: 'Drizzt',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('You leave the group');
      expect(follower1.groupId).toBeNull();
    });

    it('leader cannot leave (must disband)', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['leave'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('leader cannot leave');
    });
  });

  describe('group disband', () => {
    beforeEach(() => {
      leader.addFollower('f1');
      follower1.startFollowing('leader');
      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
      ];
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1'],
        characterName: 'Bruenor',
      });
      handleCommand('group', ctx);
    });

    it('leader disbands the group', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['disband'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('You disband the group');
      expect(leader.groupId).toBeNull();
      expect(follower1.groupId).toBeNull();
    });

    it('non-leader cannot disband', () => {
      const ctx = buildCtx({
        player: follower1,
        room: room1,
        args: ['disband'],
        characterName: 'Drizzt',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('Only the group leader');
    });
  });

  describe('group leader (transfer)', () => {
    beforeEach(() => {
      leader.addFollower('f1');
      follower1.startFollowing('leader');
      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
      ];
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1'],
        characterName: 'Bruenor',
      });
      handleCommand('group', ctx);
    });

    it('transfers leadership to another member', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['leader', 'Drizzt'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('You transfer group leadership to Drizzt');
    });

    it('non-leader cannot transfer', () => {
      const ctx = buildCtx({
        player: follower1,
        room: room1,
        args: ['leader', 'Bruenor'],
        characterName: 'Drizzt',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('Only the group leader');
    });

    it('rejects transfer to non-member', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['leader', 'Wulfgar'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('not in your group');
    });
  });

  describe('group (show info)', () => {
    it('shows group info when in a group', () => {
      leader.addFollower('f1');
      follower1.startFollowing('leader');
      const otherPlayerInfo: PlayerRef[] = [
        { sessionId: 'f1', name: 'Drizzt', anon: false },
      ];
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['form'],
        otherPlayerInfo,
        otherPlayersInRoom: ['f1'],
        characterName: 'Bruenor',
      });
      handleCommand('group', ctx);

      const infoCtx = buildCtx({
        player: leader,
        room: room1,
        args: [],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', infoCtx);
      expect(text(result)).toContain('Group');
      expect(text(result)).toContain('Leader: Bruenor');
      expect(text(result)).toContain('Drizzt');
      expect(text(result)).toContain('Members (2)');
    });

    it('shows not-in-group message when not grouped', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: [],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('not in a group');
    });
  });

  describe('unknown subcommand', () => {
    it('shows error for unknown subcommand', () => {
      const ctx = buildCtx({
        player: leader,
        room: room1,
        args: ['dance'],
        characterName: 'Bruenor',
      });

      const result = handleCommand('group', ctx);
      expect(text(result)).toContain('Unknown group command');
    });
  });
});

// ─── gsay Command Tests ──────────────────────────────────────────────────

describe('gsay command (#403 Phase 3)', () => {
  let leader: PlayerState;
  let follower1: PlayerState;
  let room1: Room;

  beforeEach(() => {
    groupManager = new GroupManager();
    allPlayers = new Map();
    GroupManager.resetIdCounter();
    room1 = makeRoom('room-1');
    leader = registerPlayer('leader', 'Bruenor', 'room-1');
    follower1 = registerPlayer('f1', 'Drizzt', 'room-1');

    // Form a group
    leader.addFollower('f1');
    follower1.startFollowing('leader');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'f1', name: 'Drizzt', anon: false },
    ];
    const ctx = buildCtx({
      player: leader,
      room: room1,
      args: ['form'],
      otherPlayerInfo,
      otherPlayersInRoom: ['f1'],
      characterName: 'Bruenor',
    });
    handleCommand('group', ctx);
  });

  it('sends a message to the group', () => {
    const ctx = buildCtx({
      player: leader,
      room: room1,
      args: ['Hello', 'everyone'],
      characterName: 'Bruenor',
    });

    const result = handleCommand('gsay', ctx);
    expect(text(result)).toContain('[Group] You say: Hello everyone');
    expect(narType(result)).toBe('speech');
  });

  it('emits _gsay metadata with member IDs', () => {
    const ctx = buildCtx({
      player: leader,
      room: room1,
      args: ['Hi'],
      characterName: 'Bruenor',
    });

    const result = handleCommand('gsay', ctx) as CommandResult & {
      _gsay?: { memberIds: string[]; senderName: string; message: string };
    };
    expect(result._gsay).toBeDefined();
    expect(result._gsay!.memberIds).toContain('leader');
    expect(result._gsay!.memberIds).toContain('f1');
    expect(result._gsay!.senderName).toBe('Bruenor');
    expect(result._gsay!.message).toBe('Hi');
  });

  it('rejects gsay when not in a group', () => {
    const outsider = registerPlayer('outsider', 'Regis', 'room-1');
    const ctx = buildCtx({
      player: outsider,
      room: room1,
      args: ['Hello'],
      characterName: 'Regis',
    });

    const result = handleCommand('gsay', ctx);
    expect(text(result)).toContain('not in a group');
  });

  it('rejects gsay with no message', () => {
    const ctx = buildCtx({
      player: leader,
      room: room1,
      args: [],
      characterName: 'Bruenor',
    });

    const result = handleCommand('gsay', ctx);
    expect(text(result)).toContain('Say what');
  });
});

// ─── Review Feedback: #411 — Shared player display helper ────────────────

describe('formatPlayerLines shared helper (#411)', () => {
  it('formats player with posture', () => {
    const players: PlayerRef[] = [
      { sessionId: 'p1', name: 'Bruenor', anon: false, posture: 'sitting' },
    ];
    const lines = formatPlayerLines(players, 'viewer');
    expect(lines).toEqual(['Bruenor is sitting here.']);
  });

  it('formats player following another', () => {
    const players: PlayerRef[] = [
      { sessionId: 'p1', name: 'Drizzt', anon: false, posture: 'standing', followingPlayerId: 'p2' },
      { sessionId: 'p2', name: 'Bruenor', anon: false, posture: 'standing' },
    ];
    const lines = formatPlayerLines(players, 'viewer');
    expect(lines[0]).toContain('Drizzt is standing here, following Bruenor.');
  });

  it('resolves leader as viewer character name', () => {
    const players: PlayerRef[] = [
      { sessionId: 'p1', name: 'Drizzt', anon: false, posture: 'standing', followingPlayerId: 'viewer' },
    ];
    const lines = formatPlayerLines(players, 'viewer', 'Bruenor');
    expect(lines[0]).toContain('following Bruenor');
  });

  it('skips anon players', () => {
    const players: PlayerRef[] = [
      { sessionId: 'p1', name: 'Hidden', anon: true, posture: 'standing' },
    ];
    const lines = formatPlayerLines(players, 'viewer');
    expect(lines).toEqual([]);
  });

  it('falls back to "someone" when leader not found', () => {
    const players: PlayerRef[] = [
      { sessionId: 'p1', name: 'Drizzt', anon: false, posture: 'standing', followingPlayerId: 'unknown-id' },
    ];
    const lines = formatPlayerLines(players, 'viewer');
    expect(lines[0]).toContain('following someone');
  });
});

// ─── Review Feedback: #412 — moveFollowers skips downed ──────────────────
// (This is integration-level; tested at the ZoneRoom level.
//  Here we unit-test the PlayerState + GroupManager interactions.)

describe('PlayerState group fields (#403 Phase 3)', () => {
  it('groupId starts as null', () => {
    const ps = new PlayerState('p1', 'room-1');
    expect(ps.groupId).toBeNull();
  });

  it('groupId can be set and cleared', () => {
    const ps = new PlayerState('p1', 'room-1');
    ps.groupId = 'group-1';
    expect(ps.groupId).toBe('group-1');
    ps.groupId = null;
    expect(ps.groupId).toBeNull();
  });
});

// ─── Max group size edge case ────────────────────────────────────────────

describe('max group size (#403 Phase 3)', () => {
  beforeEach(() => {
    groupManager = new GroupManager();
    allPlayers = new Map();
    GroupManager.resetIdCounter();
  });

  it('enforces 20-player maximum', () => {
    expect(MAX_GROUP_SIZE).toBe(20);
  });

  it('allows exactly MAX_GROUP_SIZE members', () => {
    const followers = Array.from({ length: MAX_GROUP_SIZE - 1 }, (_, i) => ({
      sessionId: `f${i}`,
      characterName: `Player${i}`,
    }));
    const result = groupManager.formGroup('leader', 'Leader', followers);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.members.size).toBe(MAX_GROUP_SIZE);
    }
  });

  it('rejects MAX_GROUP_SIZE + 1 via addMember', () => {
    const followers = Array.from({ length: MAX_GROUP_SIZE - 1 }, (_, i) => ({
      sessionId: `f${i}`,
      characterName: `Player${i}`,
    }));
    groupManager.formGroup('leader', 'Leader', followers);
    const result = groupManager.addMember('leader', 'extra', 'ExtraPlayer');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('full');
    }
  });
});
