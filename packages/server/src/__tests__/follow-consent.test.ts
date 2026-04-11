/**
 * Follow & Consent system tests (#403 Phase 1 + Phase 2)
 *
 * Tests cover:
 * - follow/unfollow basic flow
 * - auto-follow on movement
 * - follow target disconnect cleanup
 * - consent/unconsent flow
 * - edge cases: double follow, follow nonexistent, consent self, etc.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult, type PlayerRef } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Room, Direction } from '../generator/RoomGraph.js';

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
    ...overrides,
  };
}

function text(result: CommandResult): string {
  return result.narrations.map((n) => n.text).join('\n');
}

function narType(result: CommandResult): string {
  return result.narrations[0]?.type ?? '';
}

// ─── Follow (Phase 1) ─────────────────────────────────────────────────────

describe('follow command (#403 Phase 1)', () => {
  let follower: PlayerState;
  let room1: Room;

  beforeEach(() => {
    room1 = makeRoom('room-1');
    makePlayer('leader-1', 'room-1'); // leader exists in room
    follower = makePlayer('follower-1', 'room-1');
  });

  it('starts following a player in the same room', () => {
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'leader-1', name: 'Bruenor', anon: false, posture: 'standing' },
    ];
    const ctx = buildCtx({
      player: follower,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
      otherPlayersInRoom: ['leader-1'],
      characterName: 'Drizzt',
    });

    const result = handleCommand('follow', ctx);

    expect(text(result)).toContain('You begin following Bruenor');
    expect(narType(result)).toBe('room');
    expect(follower.followingPlayerId).toBe('leader-1');
  });

  it('shows room event when following', () => {
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'leader-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player: follower,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
      otherPlayersInRoom: ['leader-1'],
      characterName: 'Drizzt',
    });

    const result = handleCommand('follow', ctx) as CommandResult & { _roomEvent?: string };
    expect(result._roomEvent).toContain('Drizzt begins following Bruenor');
  });

  it('emits _followStarted metadata', () => {
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'leader-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player: follower,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
      otherPlayersInRoom: ['leader-1'],
      characterName: 'Drizzt',
    });

    const result = handleCommand('follow', ctx) as CommandResult & { _followStarted?: { followerId: string; leaderId: string } };
    expect(result._followStarted).toEqual({ followerId: 'follower-1', leaderId: 'leader-1' });
  });

  it('rejects follow with no arguments', () => {
    const ctx = buildCtx({ player: follower, room: room1, args: [] });
    const result = handleCommand('follow', ctx);
    expect(text(result)).toContain('Follow whom?');
    expect(narType(result)).toBe('system');
  });

  it('rejects following a player not in the room', () => {
    const ctx = buildCtx({
      player: follower,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo: [],
    });
    const result = handleCommand('follow', ctx);
    expect(text(result)).toContain(`don't see`);
  });

  it('rejects following the same player twice', () => {
    follower.startFollowing('leader-1');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'leader-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player: follower,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
      otherPlayersInRoom: ['leader-1'],
    });

    const result = handleCommand('follow', ctx);
    expect(text(result)).toContain('already following Bruenor');
  });

  it('rejects following when already following someone else', () => {
    follower.startFollowing('other-player');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'leader-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player: follower,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
      otherPlayersInRoom: ['leader-1'],
    });

    const result = handleCommand('follow', ctx);
    expect(text(result)).toContain('already following someone');
  });

  it('shows follow status when no args and already following', () => {
    follower.startFollowing('leader-1');
    const ctx = buildCtx({ player: follower, room: room1, args: [] });
    const result = handleCommand('follow', ctx);
    expect(text(result)).toContain('currently following');
  });

  it('case-insensitive player name match', () => {
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'leader-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player: follower,
      room: room1,
      args: ['bruenor'],
      otherPlayerInfo,
      otherPlayersInRoom: ['leader-1'],
    });

    const result = handleCommand('follow', ctx);
    expect(text(result)).toContain('You begin following Bruenor');
    expect(follower.followingPlayerId).toBe('leader-1');
  });
});

// ─── Unfollow ─────────────────────────────────────────────────────────────

describe('unfollow command (#403 Phase 1)', () => {
  let follower: PlayerState;
  let room1: Room;

  beforeEach(() => {
    room1 = makeRoom('room-1');
    follower = makePlayer('follower-1', 'room-1');
  });

  it('stops following the current leader', () => {
    follower.startFollowing('leader-1');
    const ctx = buildCtx({
      player: follower,
      room: room1,
      characterName: 'Drizzt',
    });

    const result = handleCommand('unfollow', ctx);
    expect(text(result)).toContain('You stop following');
    expect(narType(result)).toBe('room');
    expect(follower.followingPlayerId).toBeNull();
  });

  it('shows room event when unfollowing', () => {
    follower.startFollowing('leader-1');
    const ctx = buildCtx({
      player: follower,
      room: room1,
      characterName: 'Drizzt',
    });

    const result = handleCommand('unfollow', ctx) as CommandResult & { _roomEvent?: string };
    expect(result._roomEvent).toContain('Drizzt stops following');
  });

  it('emits _followStopped metadata', () => {
    follower.startFollowing('leader-1');
    const ctx = buildCtx({
      player: follower,
      room: room1,
      characterName: 'Drizzt',
    });

    const result = handleCommand('unfollow', ctx) as CommandResult & { _followStopped?: { followerId: string; leaderId: string } };
    expect(result._followStopped).toEqual({ followerId: 'follower-1', leaderId: 'leader-1' });
  });

  it('rejects unfollow when not following anyone', () => {
    const ctx = buildCtx({ player: follower, room: room1 });
    const result = handleCommand('unfollow', ctx);
    expect(text(result)).toContain(`aren't following anyone`);
    expect(narType(result)).toBe('system');
  });
});

// ─── PlayerState Follow Helpers ───────────────────────────────────────────

describe('PlayerState follow helpers (#403)', () => {
  it('startFollowing sets followingPlayerId', () => {
    const ps = makePlayer('p1', 'room-1');
    expect(ps.startFollowing('leader')).toBe(true);
    expect(ps.followingPlayerId).toBe('leader');
  });

  it('startFollowing returns false if already following', () => {
    const ps = makePlayer('p1', 'room-1');
    ps.startFollowing('leader');
    expect(ps.startFollowing('another')).toBe(false);
    expect(ps.followingPlayerId).toBe('leader');
  });

  it('stopFollowing clears and returns leader ID', () => {
    const ps = makePlayer('p1', 'room-1');
    ps.startFollowing('leader');
    const prev = ps.stopFollowing();
    expect(prev).toBe('leader');
    expect(ps.followingPlayerId).toBeNull();
  });

  it('stopFollowing returns null when not following', () => {
    const ps = makePlayer('p1', 'room-1');
    expect(ps.stopFollowing()).toBeNull();
  });

  it('addFollower/removeFollower manages followers set', () => {
    const ps = makePlayer('leader', 'room-1');
    ps.addFollower('f1');
    ps.addFollower('f2');
    expect(ps.followers.size).toBe(2);
    expect(ps.followers.has('f1')).toBe(true);
    ps.removeFollower('f1');
    expect(ps.followers.size).toBe(1);
    expect(ps.followers.has('f1')).toBe(false);
  });

  it('followers set starts empty', () => {
    const ps = makePlayer('p1', 'room-1');
    expect(ps.followers.size).toBe(0);
  });

  it('consent set starts empty', () => {
    const ps = makePlayer('p1', 'room-1');
    expect(ps.consentedPlayers.size).toBe(0);
  });
});

// ─── Follow display in look ───────────────────────────────────────────────

describe('follow display in look command (#403)', () => {
  it('shows "following X" in room description when a player is following another', () => {
    const room = makeRoom('room-1');
    const viewer = makePlayer('viewer', 'room-1');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'follower-1', name: 'Drizzt', anon: false, posture: 'standing', followingPlayerId: 'leader-1' },
      { sessionId: 'leader-1', name: 'Bruenor', anon: false, posture: 'standing' },
    ];
    const ctx = buildCtx({
      player: viewer,
      room,
      otherPlayerInfo,
      otherPlayersInRoom: ['follower-1', 'leader-1'],
    });

    const result = handleCommand('look', ctx);
    expect(text(result)).toContain('Drizzt is standing here, following Bruenor.');
  });

  it('shows "following someone" when leader is the viewer', () => {
    const room = makeRoom('room-1');
    const viewer = makePlayer('leader-1', 'room-1');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'follower-1', name: 'Drizzt', anon: false, posture: 'standing', followingPlayerId: 'leader-1' },
    ];
    const ctx = buildCtx({
      player: viewer,
      room,
      otherPlayerInfo,
      otherPlayersInRoom: ['follower-1'],
      characterName: 'Bruenor',
    });

    const result = handleCommand('look', ctx);
    expect(text(result)).toContain('Drizzt is standing here, following Bruenor.');
  });

  it('shows normal description when player is not following anyone', () => {
    const room = makeRoom('room-1');
    const viewer = makePlayer('viewer', 'room-1');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'other', name: 'Bruenor', anon: false, posture: 'standing' },
    ];
    const ctx = buildCtx({
      player: viewer,
      room,
      otherPlayerInfo,
      otherPlayersInRoom: ['other'],
    });

    const result = handleCommand('look', ctx);
    expect(text(result)).toContain('Bruenor is standing here.');
    expect(text(result)).not.toContain('following');
  });
});

// ─── Consent (Phase 2) ───────────────────────────────────────────────────

describe('consent command (#403 Phase 2)', () => {
  let player: PlayerState;
  let room1: Room;

  beforeEach(() => {
    room1 = makeRoom('room-1');
    player = makePlayer('player-1', 'room-1');
  });

  it('grants consent to a player in the same room', () => {
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'target-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
    });

    const result = handleCommand('consent', ctx);
    expect(text(result)).toContain('You grant consent to Bruenor');
    expect(player.consentedPlayers.has('target-1')).toBe(true);
  });

  it('shows status when no args and no consents', () => {
    const ctx = buildCtx({ player, room: room1, args: [] });
    const result = handleCommand('consent', ctx);
    expect(text(result)).toContain(`haven't granted consent`);
  });

  it('shows count when no args and has consents', () => {
    player.consentedPlayers.add('someone');
    const ctx = buildCtx({ player, room: room1, args: [] });
    const result = handleCommand('consent', ctx);
    expect(text(result)).toContain('1 player(s)');
  });

  it('rejects consent to self', () => {
    const otherPlayerInfo: PlayerRef[] = [];
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Me'],
      otherPlayerInfo,
      resolvePlayerByName: (name: string) => {
        if (name.toLowerCase() === 'me') return { sessionId: 'player-1', player, characterName: 'Me' };
        return undefined;
      },
    });

    const result = handleCommand('consent', ctx);
    expect(text(result)).toContain(`don't need to consent to yourself`);
  });

  it('rejects consent to nonexistent player', () => {
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Nobody'],
      otherPlayerInfo: [],
      resolvePlayerByName: () => undefined,
    });

    const result = handleCommand('consent', ctx);
    expect(text(result)).toContain('No player named');
  });

  it('rejects duplicate consent', () => {
    player.consentedPlayers.add('target-1');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'target-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
    });

    const result = handleCommand('consent', ctx);
    expect(text(result)).toContain('already granted consent');
  });

  it('grants consent via zone-wide resolvePlayerByName', () => {
    const target = makePlayer('target-1', 'room-2');
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo: [],
      resolvePlayerByName: (name: string) => {
        if (name.toLowerCase() === 'bruenor') return { sessionId: 'target-1', player: target, characterName: 'Bruenor' };
        return undefined;
      },
    });

    const result = handleCommand('consent', ctx);
    expect(text(result)).toContain('You grant consent to Bruenor');
    expect(player.consentedPlayers.has('target-1')).toBe(true);
  });
});

// ─── Unconsent / Revoke ─────────────────────────────────────────────────

describe('unconsent/revoke command (#403 Phase 2)', () => {
  let player: PlayerState;
  let room1: Room;

  beforeEach(() => {
    room1 = makeRoom('room-1');
    player = makePlayer('player-1', 'room-1');
  });

  it('revokes consent from a player', () => {
    player.consentedPlayers.add('target-1');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'target-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
    });

    const result = handleCommand('unconsent', ctx);
    expect(text(result)).toContain('You revoke consent from Bruenor');
    expect(player.consentedPlayers.has('target-1')).toBe(false);
  });

  it('revoke command is an alias for unconsent', () => {
    player.consentedPlayers.add('target-1');
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'target-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
    });

    const result = handleCommand('revoke', ctx);
    expect(text(result)).toContain('You revoke consent from Bruenor');
    expect(player.consentedPlayers.has('target-1')).toBe(false);
  });

  it('rejects unconsent with no args', () => {
    const ctx = buildCtx({ player, room: room1, args: [] });
    const result = handleCommand('unconsent', ctx);
    expect(text(result)).toContain('Revoke consent from whom?');
  });

  it('rejects unconsent for player without consent', () => {
    const otherPlayerInfo: PlayerRef[] = [
      { sessionId: 'target-1', name: 'Bruenor', anon: false },
    ];
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Bruenor'],
      otherPlayerInfo,
    });

    const result = handleCommand('unconsent', ctx);
    expect(text(result)).toContain(`haven't granted consent`);
  });

  it('rejects unconsent for nonexistent player', () => {
    const ctx = buildCtx({
      player,
      room: room1,
      args: ['Nobody'],
      otherPlayerInfo: [],
      resolvePlayerByName: () => undefined,
    });

    const result = handleCommand('unconsent', ctx);
    expect(text(result)).toContain('No player named');
  });
});

// ─── Follow + Movement Integration ────────────────────────────────────────

describe('follow + go movement integration (#403)', () => {
  it('go command shows follow status in target room player list', () => {
    const room1 = makeRoom('room-1', { exits: new Map([['north', 'room-2']]) });
    const room2 = makeRoom('room-2');
    const mover = makePlayer('mover', 'room-1');

    const playersInRoom2: PlayerRef[] = [
      { sessionId: 'follower-1', name: 'Drizzt', anon: false, posture: 'standing', followingPlayerId: 'leader-1' },
      { sessionId: 'leader-1', name: 'Bruenor', anon: false, posture: 'standing' },
    ];

    const ctx = buildCtx({
      player: mover,
      room: room1,
      args: ['north'],
      resolveRoom: (id: string) => id === 'room-2' ? room2 : undefined,
      resolvePlayersInRoom: (roomId: string) => roomId === 'room-2' ? playersInRoom2 : [],
    });

    const result = handleCommand('go', ctx);
    expect(text(result)).toContain('Drizzt is standing here, following Bruenor.');
  });
});

// ─── PlayerState Consent Reset ────────────────────────────────────────────

describe('consent/follow session scoping (#403)', () => {
  it('new PlayerState has empty consent and follow state', () => {
    const ps = makePlayer('p1', 'room-1');
    expect(ps.consentedPlayers.size).toBe(0);
    expect(ps.followingPlayerId).toBeNull();
    expect(ps.followers.size).toBe(0);
  });
});
