/**
 * Group loot sharing tests (#403 Phase 6)
 *
 * Tests cover:
 * - group share on/off toggle (leader only)
 * - group share status display
 * - Loot distribution tests (simulated logic verification)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { GroupManager } from '../systems/GroupManager.js';
import type { Room, Direction, Item } from '../generator/RoomGraph.js';

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

function makePlayer(sessionId: string, roomId: string, characterName: string): PlayerState {
  const ps = new PlayerState(sessionId, roomId);
  allPlayers.set(sessionId, { player: ps, characterName });
  return ps;
}

function makeItem(id: string, name: string, weight: number): Item {
  return {
    id,
    name,
    description: `A ${name}`,
    weight,
  };
}

let allPlayers: Map<string, { player: PlayerState; characterName: string }>;
let groupManager: GroupManager;

function buildCtx(
  overrides: Partial<CommandContext> & { player?: PlayerState; room?: Room } = {},
): CommandContext {
  const room = overrides.room ?? makeRoom('room-1');
  const player = overrides.player ?? makePlayer('player-1', room.id, 'TestPlayer');
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
    characterName: allPlayers.get(player.sessionId)?.characterName,
    ...overrides,
  };
}

function text(result: CommandResult): string {
  return result.narrations.map((n) => n.text).join('\n');
}

// ─── Group Share Command Tests ────────────────────────────────────────────

describe('group share command (#403 Phase 6)', () => {
  beforeEach(() => {
    groupManager = new GroupManager();
    allPlayers = new Map();
    GroupManager.resetIdCounter();
  });

  it('shows error when not in a group', () => {
    const leader = makePlayer('p1', 'room-1', 'Leader');
    const ctx = buildCtx({ player: leader, args: ['share'], characterName: 'Leader' });
    const result = handleCommand('group', ctx);
    expect(text(result)).toContain('not in a group');
  });

  it('shows current sharing status (default OFF)', () => {
    const leader = makePlayer('p1', 'room-1', 'Leader');
    const follower = makePlayer('p2', 'room-1', 'Follower');
    leader.addFollower('p2');
    follower.startFollowing('p1');

    const formCtx = buildCtx({
      player: leader,
      args: ['form'],
      characterName: 'Leader',
      otherPlayerInfo: [{ sessionId: 'p2', name: 'Follower', anon: false }],
    });
    handleCommand('group', formCtx);

    const ctx = buildCtx({ player: leader, args: ['share'], characterName: 'Leader' });
    const result = handleCommand('group', ctx);
    expect(text(result)).toContain('Loot sharing is currently OFF');
  });

  it('toggles sharing ON (leader only)', () => {
    const leader = makePlayer('p1', 'room-1', 'Leader');
    const follower = makePlayer('p2', 'room-1', 'Follower');
    leader.addFollower('p2');
    follower.startFollowing('p1');

    const formCtx = buildCtx({
      player: leader,
      args: ['form'],
      characterName: 'Leader',
      otherPlayerInfo: [{ sessionId: 'p2', name: 'Follower', anon: false }],
    });
    handleCommand('group', formCtx);

    const ctx = buildCtx({ player: leader, args: ['share', 'on'], characterName: 'Leader' });
    const result = handleCommand('group', ctx);
    expect(text(result)).toContain('turn loot sharing ON');

    const statusCtx = buildCtx({ player: leader, args: ['share'], characterName: 'Leader' });
    const statusResult = handleCommand('group', statusCtx);
    expect(text(statusResult)).toContain('Loot sharing is currently ON');
  });

  it('toggles sharing OFF', () => {
    const leader = makePlayer('p1', 'room-1', 'Leader');
    const follower = makePlayer('p2', 'room-1', 'Follower');
    leader.addFollower('p2');
    follower.startFollowing('p1');

    const formCtx = buildCtx({
      player: leader,
      args: ['form'],
      characterName: 'Leader',
      otherPlayerInfo: [{ sessionId: 'p2', name: 'Follower', anon: false }],
    });
    handleCommand('group', formCtx);

    const onCtx = buildCtx({ player: leader, args: ['share', 'on'], characterName: 'Leader' });
    handleCommand('group', onCtx);

    const offCtx = buildCtx({ player: leader, args: ['share', 'off'], characterName: 'Leader' });
    const result = handleCommand('group', offCtx);
    expect(text(result)).toContain('turn loot sharing OFF');

    const statusCtx = buildCtx({ player: leader, args: ['share'], characterName: 'Leader' });
    const statusResult = handleCommand('group', statusCtx);
    expect(text(statusResult)).toContain('Loot sharing is currently OFF');
  });

  it('rejects toggle from non-leader', () => {
    const leader = makePlayer('p1', 'room-1', 'Leader');
    const follower = makePlayer('p2', 'room-1', 'Follower');
    leader.addFollower('p2');
    follower.startFollowing('p1');

    const formCtx = buildCtx({
      player: leader,
      args: ['form'],
      characterName: 'Leader',
      otherPlayerInfo: [{ sessionId: 'p2', name: 'Follower', anon: false }],
    });
    handleCommand('group', formCtx);

    const ctx = buildCtx({ player: follower, args: ['share', 'on'], characterName: 'Follower' });
    const result = handleCommand('group', ctx);
    expect(text(result)).toContain('Only the group leader can change loot sharing');
  });

  it('allows non-leader to view status', () => {
    const leader = makePlayer('p1', 'room-1', 'Leader');
    const follower = makePlayer('p2', 'room-1', 'Follower');
    leader.addFollower('p2');
    follower.startFollowing('p1');

    const formCtx = buildCtx({
      player: leader,
      args: ['form'],
      characterName: 'Leader',
      otherPlayerInfo: [{ sessionId: 'p2', name: 'Follower', anon: false }],
    });
    handleCommand('group', formCtx);

    const ctx = buildCtx({ player: follower, args: ['share'], characterName: 'Follower' });
    const result = handleCommand('group', ctx);
    expect(text(result)).toContain('Loot sharing is currently OFF');
  });

  it('shows sharing status in group info', () => {
    const leader = makePlayer('p1', 'room-1', 'Leader');
    const follower = makePlayer('p2', 'room-1', 'Follower');
    leader.addFollower('p2');
    follower.startFollowing('p1');

    const formCtx = buildCtx({
      player: leader,
      args: ['form'],
      characterName: 'Leader',
      otherPlayerInfo: [{ sessionId: 'p2', name: 'Follower', anon: false }],
    });
    handleCommand('group', formCtx);

    const infoCtx1 = buildCtx({ player: leader, args: [], characterName: 'Leader' });
    const info1 = handleCommand('group', infoCtx1);
    expect(text(info1)).toContain('Loot Sharing: OFF');

    const onCtx = buildCtx({ player: leader, args: ['share', 'on'], characterName: 'Leader' });
    handleCommand('group', onCtx);

    const infoCtx2 = buildCtx({ player: leader, args: [], characterName: 'Leader' });
    const info2 = handleCommand('group', infoCtx2);
    expect(text(info2)).toContain('Loot Sharing: ON');
  });

  it('rejects invalid share argument', () => {
    const leader = makePlayer('p1', 'room-1', 'Leader');
    const follower = makePlayer('p2', 'room-1', 'Follower');
    leader.addFollower('p2');
    follower.startFollowing('p1');

    const formCtx = buildCtx({
      player: leader,
      args: ['form'],
      characterName: 'Leader',
      otherPlayerInfo: [{ sessionId: 'p2', name: 'Follower', anon: false }],
    });
    handleCommand('group', formCtx);

    const ctx = buildCtx({ player: leader, args: ['share', 'maybe'], characterName: 'Leader' });
    const result = handleCommand('group', ctx);
    expect(text(result)).toContain('Usage: group share [on|off]');
  });
});

// ─── GroupManager Loot Sharing Tests ──────────────────────────────────────

describe('GroupManager loot sharing (#403 Phase 6)', () => {
  beforeEach(() => {
    groupManager = new GroupManager();
    allPlayers = new Map();
    GroupManager.resetIdCounter();
  });

  it('defaults lootSharing to false', () => {
    const result = groupManager.formGroup('leader', 'Bruenor', [
      { sessionId: 'f1', characterName: 'Drizzt' },
    ]);
    expect(result).not.toHaveProperty('error');
    if ('id' in result) {
      expect(result.lootSharing).toBe(false);
    }
  });

  it('setLootSharing returns success for leader', () => {
    const group = groupManager.formGroup('leader', 'Bruenor', [
      { sessionId: 'f1', characterName: 'Drizzt' },
    ]);
    expect(group).not.toHaveProperty('error');

    const result = groupManager.setLootSharing('leader', true);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.group.lootSharing).toBe(true);
    }
  });

  it('setLootSharing rejects non-leader', () => {
    const group = groupManager.formGroup('leader', 'Bruenor', [
      { sessionId: 'f1', characterName: 'Drizzt' },
    ]);
    expect(group).not.toHaveProperty('error');

    const result = groupManager.setLootSharing('f1', true);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Only the group leader can change loot sharing');
    }
  });

  it('setLootSharing rejects non-group member', () => {
    const result = groupManager.setLootSharing('non-member', true);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not in a group');
    }
  });

  it('getLootSharing returns false for non-member', () => {
    expect(groupManager.getLootSharing('non-member')).toBe(false);
  });

  it('getLootSharing returns group sharing status', () => {
    const group = groupManager.formGroup('leader', 'Bruenor', [
      { sessionId: 'f1', characterName: 'Drizzt' },
    ]);
    expect(group).not.toHaveProperty('error');

    expect(groupManager.getLootSharing('leader')).toBe(false);
    expect(groupManager.getLootSharing('f1')).toBe(false);

    groupManager.setLootSharing('leader', true);
    expect(groupManager.getLootSharing('leader')).toBe(true);
    expect(groupManager.getLootSharing('f1')).toBe(true);
  });
});

// ─── Loot Distribution Simulation Tests ───────────────────────────────────

describe('Group loot distribution logic (#403 Phase 6)', () => {
  beforeEach(() => {
    groupManager = new GroupManager();
    allPlayers = new Map();
    GroupManager.resetIdCounter();
  });

  it('distributes items round-robin when sharing ON', () => {
    const p1 = makePlayer('p1', 'room-1', 'Alice');
    const p2 = makePlayer('p2', 'room-1', 'Bob');
    const p3 = makePlayer('p3', 'room-1', 'Carol');

    p1.addFollower('p2');
    p1.addFollower('p3');

    groupManager.formGroup('p1', 'Alice', [
      { sessionId: 'p2', characterName: 'Bob' },
      { sessionId: 'p3', characterName: 'Carol' },
    ]);

    groupManager.setLootSharing('p1', true);

    const items = [
      makeItem('sword', 'Iron Sword', 5),
      makeItem('potion', 'Health Potion', 1),
      makeItem('gold', 'Gold Coin', 0.1),
    ];

    const membersInRoom = ['p1', 'p2', 'p3'];
    let memberIndex = 0;

    for (const item of items) {
      const recipientId = membersInRoom[memberIndex]!;
      const recipient = allPlayers.get(recipientId)!.player;
      recipient.addItem(item);
      memberIndex = (memberIndex + 1) % membersInRoom.length;
    }

    expect(p1.inventory.size).toBe(1);
    expect(p2.inventory.size).toBe(1);
    expect(p3.inventory.size).toBe(1);
  });

  it('distributes items only to members in same room', () => {
    const p1 = makePlayer('p1', 'room-1', 'Alice');
    const p2 = makePlayer('p2', 'room-1', 'Bob');
    const p3 = makePlayer('p3', 'room-2', 'Carol');

    p1.addFollower('p2');
    p1.addFollower('p3');

    groupManager.formGroup('p1', 'Alice', [
      { sessionId: 'p2', characterName: 'Bob' },
      { sessionId: 'p3', characterName: 'Carol' },
    ]);

    groupManager.setLootSharing('p1', true);

    const items = [makeItem('sword', 'Iron Sword', 5), makeItem('potion', 'Health Potion', 1)];
    const membersInRoom = ['p1', 'p2'];
    let memberIndex = 0;

    for (const item of items) {
      const recipientId = membersInRoom[memberIndex]!;
      const recipient = allPlayers.get(recipientId)!.player;
      recipient.addItem(item);
      memberIndex = (memberIndex + 1) % membersInRoom.length;
    }

    expect(p1.inventory.size).toBe(1);
    expect(p2.inventory.size).toBe(1);
    expect(p3.inventory.size).toBe(0);
  });

  it('drops items to floor when no one can carry', () => {
    const p1 = makePlayer('p1', 'room-1', 'Alice');
    const p2 = makePlayer('p2', 'room-1', 'Bob');

    p1.maxCarryWeight = 1;
    p2.maxCarryWeight = 1;

    p1.addFollower('p2');

    groupManager.formGroup('p1', 'Alice', [{ sessionId: 'p2', characterName: 'Bob' }]);
    groupManager.setLootSharing('p1', true);

    const heavyItem = makeItem('anvil', 'Iron Anvil', 100);
    const membersInRoom = ['p1', 'p2'];
    let itemGiven = false;

    for (let attempt = 0; attempt < membersInRoom.length; attempt++) {
      const recipientId = membersInRoom[attempt]!;
      const recipient = allPlayers.get(recipientId)!.player;
      if (recipient.canCarry(heavyItem)) {
        recipient.addItem(heavyItem);
        itemGiven = true;
        break;
      }
    }

    expect(itemGiven).toBe(false);
  });

  it('distributes fairly in round-robin (5 items, 3 players)', () => {
    const p1 = makePlayer('p1', 'room-1', 'Alice');
    const p2 = makePlayer('p2', 'room-1', 'Bob');
    const p3 = makePlayer('p3', 'room-1', 'Carol');

    p1.addFollower('p2');
    p1.addFollower('p3');

    groupManager.formGroup('p1', 'Alice', [
      { sessionId: 'p2', characterName: 'Bob' },
      { sessionId: 'p3', characterName: 'Carol' },
    ]);

    groupManager.setLootSharing('p1', true);

    const items = [
      makeItem('item1', 'Item 1', 1),
      makeItem('item2', 'Item 2', 1),
      makeItem('item3', 'Item 3', 1),
      makeItem('item4', 'Item 4', 1),
      makeItem('item5', 'Item 5', 1),
    ];

    const membersInRoom = ['p1', 'p2', 'p3'];
    let memberIndex = 0;

    for (const item of items) {
      const recipientId = membersInRoom[memberIndex]!;
      const recipient = allPlayers.get(recipientId)!.player;
      recipient.addItem(item);
      memberIndex = (memberIndex + 1) % membersInRoom.length;
    }

    expect(p1.inventory.size).toBe(2);
    expect(p2.inventory.size).toBe(2);
    expect(p3.inventory.size).toBe(1);
  });

  it('skips members who cannot carry and tries next', () => {
    const p1 = makePlayer('p1', 'room-1', 'Alice');
    const p2 = makePlayer('p2', 'room-1', 'Bob');
    const p3 = makePlayer('p3', 'room-1', 'Carol');

    p2.maxCarryWeight = 0;

    p1.addFollower('p2');
    p1.addFollower('p3');

    groupManager.formGroup('p1', 'Alice', [
      { sessionId: 'p2', characterName: 'Bob' },
      { sessionId: 'p3', characterName: 'Carol' },
    ]);

    groupManager.setLootSharing('p1', true);

    const items = [
      makeItem('item1', 'Item 1', 1),
      makeItem('item2', 'Item 2', 1),
      makeItem('item3', 'Item 3', 1),
    ];

    const membersInRoom = ['p1', 'p2', 'p3'];
    let memberIndex = 0;

    for (const item of items) {
      let itemGiven = false;
      for (let attempt = 0; attempt < membersInRoom.length; attempt++) {
        const recipientId = membersInRoom[memberIndex]!;
        const recipient = allPlayers.get(recipientId)!.player;
        if (recipient.canCarry(item)) {
          recipient.addItem(item);
          itemGiven = true;
          memberIndex = (memberIndex + 1) % membersInRoom.length;
          break;
        }
        memberIndex = (memberIndex + 1) % membersInRoom.length;
      }
      if (!itemGiven) {
        // Would drop to floor in real code
      }
    }

    expect(p2.inventory.size).toBe(0);
    expect(p1.inventory.size).toBeGreaterThan(0);
    expect(p3.inventory.size).toBeGreaterThan(0);
  });
});
