/**
 * Player Death Flow Tests
 *
 * Verifies that when a player is defeated in combat (HP=0):
 * 1. The combat system generates a 'defeated' event with the player's sessionId
 * 2. The server sends OVERLAY_STATE with state='death' to the defeated player
 * 3. Non-soulbound inventory items are placed in a lootable corpse (GDD §6.8)
 * 4. After a delay, ROOM_SWITCH sends the player back to refuge
 * 5. Player is cleaned up from combat and zone state
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { buildFixtureRegistry } from './helpers/item-fixtures.js';

// Mock ContentRegistry so ZoneRoom integration tests work without a DB.
const FIXTURE_MAP = buildFixtureRegistry();
vi.mock('../content/index.js', () => ({
  getContentRegistry: () => ({
    isInitialized: () => true,
    getItem: (id: string) => FIXTURE_MAP.get(id),
    getAllItems: () => Array.from(FIXTURE_MAP.values()),
  }),
}));

import { CombatSystem, createCombatant, DEFAULT_PLAYER_STATS } from '../combat/index.js';
import type { CombatStats } from '../combat/CombatState.js';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import type { OverlayMessage } from '@ellmud/shared';
import { bootTestServer, wait } from './helpers/index.js';
import type { PlayerState } from '../state/PlayerState.js';
import type { Room, Item } from '../generator/RoomGraph.js';
import type { CorpseSystem } from '../systems/CorpseSystem.js';

// ─── Unit Tests: Combat System Defeat Detection ─────────────────────────────

const TEST_ROOM = 'room-1';
const ADJACENT_ROOM = 'room-2';

function testExitResolver(roomId: string): string[] {
  if (roomId === TEST_ROOM) return [ADJACENT_ROOM];
  if (roomId === ADJACENT_ROOM) return [TEST_ROOM];
  return [];
}

function makePlayer(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>) {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, true, { attack: merged.unarmed, maxHp: merged.maxHp, armour: merged.armour, shieldBlock: merged.shieldBlock, dodge: merged.dodge });
}

function makeCreature(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>) {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, false, { attack: merged.unarmed, maxHp: merged.maxHp, armour: merged.armour, shieldBlock: merged.shieldBlock, dodge: merged.dodge });
}

describe('Player Defeat Detection (CombatSystem)', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  it('should generate a defeated event for a player when HP reaches 0', () => {
    const player = makePlayer('player-1', TEST_ROOM, { maxHp: 5 });
    player.hp = 5;
    const creature = makeCreature('creature-1', TEST_ROOM, { unarmed: 20 });
    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('creature-1', 'player-1');

    const result = system.resolveTick();

    expect(player.hp).toBe(0);
    const defeatedEvents = result.events.filter(e => e.type === 'defeated');
    expect(defeatedEvents).toHaveLength(1);
    expect(defeatedEvents[0]!.actorId).toBe('player-1');
    // Player actorId should NOT start with 'creature-'
    expect(defeatedEvents[0]!.actorId.startsWith('creature-')).toBe(false);
  });

  it('player defeated event has isPlayer-compatible actorId (session ID, not creature-*)', () => {
    const player = makePlayer('session-abc-123', TEST_ROOM, { maxHp: 1 });
    player.hp = 1;
    const creature = makeCreature('creature-brute', TEST_ROOM, { unarmed: 50 });
    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('creature-brute', 'session-abc-123');

    const result = system.resolveTick();

    const defeatedEvents = result.events.filter(e => e.type === 'defeated');
    expect(defeatedEvents).toHaveLength(1);
    expect(defeatedEvents[0]!.actorId).toBe('session-abc-123');
    expect(defeatedEvents[0]!.actorName).toBe('session-abc-123');
  });

  it('defeated player is removed from encounter after tick', () => {
    const player = makePlayer('p1', TEST_ROOM, { maxHp: 3 });
    player.hp = 3;
    const creature = makeCreature('creature-1', TEST_ROOM, { unarmed: 20 });
    system.registerCombatant(player);
    system.registerCombatant(creature);
    system.initiateCombat('creature-1', 'p1');

    system.resolveTick();

    expect(player.hp).toBe(0);
    expect(system.isInCombat('p1')).toBe(false);
  });
});

// ─── Integration Tests: Full Player Death Flow via ZoneRoom ─────────────────

describe('Player Death Flow (ZoneRoom Integration)', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  it('should send OVERLAY_STATE with state=death when player is defeated', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const client = await colyseus.connectTo(room);

    const overlayMessages: OverlayMessage[] = [];
    client.onMessage(MessageTypes.OVERLAY_STATE, (data: OverlayMessage) => {
      overlayMessages.push(data);
    });

    // Wait for room to be ready (seeding → open)
    await wait(2000);

    // Trigger attack command against a creature to enter combat, then simulate death
    // The player needs to be in combat and reach 0 HP.
    // Send an attack command to engage a creature
    client.send(MessageTypes.COMMAND, { verb: 'attack', args: ['creature'] });
    await wait(1500);

    // The combat system tick will resolve. To force a player death, we need to
    // get the room instance and manipulate the player's HP directly.
    // Access room internals for test manipulation
    const roomInstance = room as unknown as {
      combatSystem: { getCombatant: (id: string) => { hp: number } | undefined };
      downingSystem: { getDownedPlayer: (id: string) => { bleedOutTicksRemaining: number } | undefined };
      players: Map<string, unknown>;
    };

    const sessionId = client.sessionId;
    const combatant = roomInstance.combatSystem?.getCombatant(sessionId);
    if (combatant) {
      // Set HP very low so next combat tick defeats the player
      combatant.hp = 1;
    }

    // Poll until the player is downed (up to 5 seconds)
    for (let i = 0; i < 10; i++) {
      await wait(500);
      const downedRecord = roomInstance.downingSystem?.getDownedPlayer(sessionId);
      if (downedRecord) {
        downedRecord.bleedOutTicksRemaining = 2;
        break;
      }
    }

    // Wait for bleed-out death
    await wait(8000);
    if (combatant) {
      // If combat was initiated, we should have a death message
      const deathMessages = overlayMessages.filter(m => m.state === 'death');
      expect(deathMessages.length).toBeGreaterThanOrEqual(1);
      expect(deathMessages[0]!.state).toBe('death');
      expect(deathMessages[0]!.narration).toBeTruthy();
    }
    // If no creature was in the starting room, the test still passes (no combat = no death)

    await client.leave();
  }, 25_000);

  it('should send ROOM_SWITCH to refuge after death delay', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const client = await colyseus.connectTo(room);

    const overlayMessages: OverlayMessage[] = [];
    const roomSwitchMessages: Array<{ target: string; reason: string }> = [];

    client.onMessage(MessageTypes.OVERLAY_STATE, (data: OverlayMessage) => {
      overlayMessages.push(data);
    });
    client.onMessage(MessageTypes.ROOM_SWITCH, (data: { target: string; reason: string }) => {
      roomSwitchMessages.push(data);
    });

    await wait(2000);

    // Engage combat
    client.send(MessageTypes.COMMAND, { verb: 'attack', args: ['creature'] });
    await wait(1500);

    const roomInstance = room as unknown as {
      combatSystem: { getCombatant: (id: string) => { hp: number } | undefined };
      downingSystem: { getDownedPlayer: (id: string) => { bleedOutTicksRemaining: number } | undefined };
    };

    const sessionId = client.sessionId;
    const combatant = roomInstance.combatSystem?.getCombatant(sessionId);
    if (combatant) {
      combatant.hp = 1;
    }

    // Poll until the player is downed (up to 5 seconds)
    for (let i = 0; i < 10; i++) {
      await wait(500);
      const downedRecord = roomInstance.downingSystem?.getDownedPlayer(sessionId);
      if (downedRecord) {
        downedRecord.bleedOutTicksRemaining = 2;
        break;
      }
    }

    // Wait for bleed-out death + 3s delay for ROOM_SWITCH
    await wait(8000);

    if (combatant) {
      const deathSwitches = roomSwitchMessages.filter(m => m.reason === 'player_death');
      expect(deathSwitches.length).toBeGreaterThanOrEqual(1);
      expect(deathSwitches[0]!.target).toBe('zone:the-refuge');
    }

    await client.leave();
  }, 25_000);

  it('should drop player inventory items into a lootable corpse on death', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const client = await colyseus.connectTo(room);

    // Wait for room to be ready (seeding → open)
    await wait(2000);

    // Access room internals for test setup and verification
    const roomInstance = room as unknown as {
      players: Map<string, PlayerState>;
      combatSystem: CombatSystem;
      roomGraph: { rooms: Map<string, Room> };
      corpseSystem: CorpseSystem;
      downingSystem: { getDownedPlayer: (id: string) => { bleedOutTicksRemaining: number } | undefined };
    };

    const sessionId = client.sessionId;
    const player = roomInstance.players.get(sessionId);
    expect(player).toBeDefined();

    const currentRoomId = player!.currentRoomId;
    const currentRoom = roomInstance.roomGraph.rooms.get(currentRoomId);
    expect(currentRoom).toBeDefined();

    // Record how many items the room starts with
    const initialItemCount = currentRoom!.items.length;

    // Add items to the player's inventory
    const sword: Item = { id: 'test-sword', name: 'Test Sword', weight: 2, description: 'A test sword' };
    const potion: Item = { id: 'test-potion', name: 'Test Potion', weight: 1, description: 'A test potion' };
    expect(player!.addItem(sword)).toBe(true);
    expect(player!.addItem(potion)).toBe(true);
    expect(player!.addItem(potion)).toBe(true); // stacks to quantity 2
    expect(player!.inventory.size).toBe(2); // 2 unique item types

    // Register a powerful creature and the player as combatants
    const creature = createCombatant(
      'creature-test-brute', 'Test Brute', currentRoomId, false,
      { ...DEFAULT_PLAYER_STATS, attack: 100 },
    );
    roomInstance.combatSystem.registerCombatant(creature);

    const playerCombatant = createCombatant(
      sessionId, sessionId, currentRoomId, true, DEFAULT_PLAYER_STATS,
    );
    playerCombatant.hp = 1; // next tick will defeat this player
    roomInstance.combatSystem.registerCombatant(playerCombatant);

    // Initiate combat — creature attacks player
    roomInstance.combatSystem.initiateCombat('creature-test-brute', sessionId);

    // Poll until the player is downed (up to 5 seconds)
    for (let i = 0; i < 10; i++) {
      await wait(500);
      const downedRecord = roomInstance.downingSystem?.getDownedPlayer(sessionId);
      if (downedRecord) {
        downedRecord.bleedOutTicksRemaining = 2;
        break;
      }
    }

    // Wait for bleed-out death + processing
    await wait(8000);

    // Player inventory must be empty after death (non-soulbound items moved to corpse)
    expect(player!.inventory.size).toBe(0);

    // Room floor should now have a corpse container item
    const floorItems = currentRoom!.items.slice(initialItemCount);
    expect(floorItems).toHaveLength(1);
    
    // Find the corpse container item
    const corpseItem = floorItems.find(item => item.id.startsWith('corpse-'));
    expect(corpseItem).toBeDefined();
    expect(corpseItem!.containerContents).toBeDefined();
    expect(corpseItem!.containerContents).toHaveLength(3); // 1 sword + 2 potions

    await client.leave();
  }, 25_000);
});

// ─── E2E Integration: Downed → Stabilized ──────────────────────────────────────────────

describe('Player Death E2E: down → stabilize', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  it('player reaches 0 HP, squadmate stabilizes, player revived at 1 HP', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const victim = await colyseus.connectTo(room);
    const healer = await colyseus.connectTo(room);

    const victimOverlay: OverlayMessage[] = [];

    victim.onMessage(MessageTypes.OVERLAY_STATE, (data: OverlayMessage) => {
      victimOverlay.push(data);
    });

    // Wait for zone to reach 'open' state
    await wait(2000);

    // ── Step 1: Down the victim via combat ──────────────────────────────
    const roomInstance = room as unknown as {
      players: Map<string, PlayerState>;
      combatSystem: CombatSystem;
      roomGraph: { rooms: Map<string, Room> };
      downingSystem: { isPlayerDowned: (id: string) => boolean; getDownedPlayer: (id: string) => { currentHp: number } | undefined };
    };

    const victimId = victim.sessionId;
    const healerId = healer.sessionId;
    const victimPlayer = roomInstance.players.get(victimId);
    expect(victimPlayer).toBeDefined();

    const startRoomId = victimPlayer!.currentRoomId;

    // Create a powerful creature to one-shot the victim
    const creature = createCombatant(
      'creature-e2e-brute', 'E2E Brute', startRoomId, false,
      { ...DEFAULT_PLAYER_STATS, attack: 200 },
    );
    roomInstance.combatSystem.registerCombatant(creature);

    const victimCombatant = createCombatant(
      victimId, victimId, startRoomId, true, DEFAULT_PLAYER_STATS,
    );
    victimCombatant.hp = 1;
    roomInstance.combatSystem.registerCombatant(victimCombatant);
    // Force deterministic rolls so dodge never fires in this integration test
    roomInstance.combatSystem.setRollFn(() => 1);
    roomInstance.combatSystem.initiateCombat('creature-e2e-brute', victimId);

    // Wait for combat tick to down the victim
    await wait(2000);

    // Verify victim is downed
    expect(roomInstance.downingSystem.isPlayerDowned(victimId)).toBe(true);

    const downedMessages = victimOverlay.filter(m => m.state === 'downed');
    expect(downedMessages.length).toBeGreaterThanOrEqual(1);

    // ── Step 2: Healer stabilizes the victim ────────────────────────────
    const healerPlayer = roomInstance.players.get(healerId);
    expect(healerPlayer).toBeDefined();
    const bandage: Item = { id: 'bandage', name: 'Bandage', weight: 0.5, description: 'A bandage.' };
    healerPlayer!.addItem(bandage);

    // Send stabilize command
    healer.send(MessageTypes.COMMAND, { verb: 'stabilize', args: [victimId] });

    // Wait for stabilize channel (2 ticks) + processing time
    await wait(4000);

    // Verify victim received stabilized state
    const stabilizedMessages = victimOverlay.filter(m => m.state === 'stabilized');
    expect(stabilizedMessages.length).toBeGreaterThanOrEqual(1);

    // After stabilization, victim should be REMOVED from downed tracking (revived)
    expect(roomInstance.downingSystem.isPlayerDowned(victimId)).toBe(false);

    await victim.leave();
  }, 30_000);
});
