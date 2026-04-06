/**
 * Death & Spawn Routing Tests — Issue #238.
 *
 * Verifies that:
 * 1. Players with a faction respawn at their faction stronghold on death
 * 2. Players without a faction fall back to the Refuge
 * 3. Death narration mentions the correct hub zone name
 * 4. Death penalty debuff is applied on respawn
 * 5. resolvePlayerHubName returns correct display names
 * 6. Spawn zone API returns correct zone target for faction members
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes, DEATH_PENALTY_DEFAULTS } from '@ellmud/shared';
import type { OverlayMessage, RoomSwitchMessage } from '@ellmud/shared';
import { bootTestServer, wait } from './helpers/index.js';
import type { PlayerState } from '../state/PlayerState.js';
import { CombatSystem, createCombatant, DEFAULT_PLAYER_STATS } from '../combat/index.js';

import { InMemoryFactionRepository } from '../faction/FactionRepository.js';
import {
  resolvePlayerHubTarget,
  resolvePlayerHubName,
  resolvePlayerHubSlug,
  FACTION_SLUGS,
  FACTION_STRONGHOLD_MAP,
  HUB_DISPLAY_NAMES,
  DEFAULT_HUB_SLUG,
} from '../zones/stronghold.js';

// ─── Unit Tests: resolvePlayerHubName ────────────────────────────────────────

describe('resolvePlayerHubName', () => {
  it.each(FACTION_SLUGS)('returns correct display name for %s', (slug) => {
    const expectedSlug = FACTION_STRONGHOLD_MAP[slug];
    expect(resolvePlayerHubName(slug)).toBe(HUB_DISPLAY_NAMES[expectedSlug]);
  });

  it('returns Refuge display name for undefined faction', () => {
    expect(resolvePlayerHubName(undefined)).toBe(HUB_DISPLAY_NAMES[DEFAULT_HUB_SLUG]);
  });

  it('returns Refuge display name for unknown faction', () => {
    expect(resolvePlayerHubName('unknown-faction')).toBe(HUB_DISPLAY_NAMES[DEFAULT_HUB_SLUG]);
  });
});

// ─── Integration: Faction-Based Death Routing ────────────────────────────────

describe('Faction-Based Death Routing (ZoneRoom Integration)', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  it('player with kindari faction routes to zone:the-reliquary on death', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const client = await colyseus.connectTo(room);

    const overlayMessages: OverlayMessage[] = [];
    const roomSwitchMessages: RoomSwitchMessage[] = [];

    client.onMessage(MessageTypes.OVERLAY_STATE, (data: OverlayMessage) => {
      overlayMessages.push(data);
    });
    client.onMessage(MessageTypes.ROOM_SWITCH, (data: RoomSwitchMessage) => {
      roomSwitchMessages.push(data);
    });

    await wait(2000);

    // Inject faction data: player belongs to kindari
    const roomInstance = room as unknown as {
      players: Map<string, PlayerState>;
      combatSystem: CombatSystem;
      playerFactionSlugs: Map<string, string>;
    };

    const sessionId = client.sessionId;
    roomInstance.playerFactionSlugs.set(sessionId, 'kindari');

    // Register combatants and trigger death
    const player = roomInstance.players.get(sessionId);
    expect(player).toBeDefined();
    const roomId = player!.currentRoomId;

    const creature = createCombatant(
      'creature-death-test', 'Death Brute', roomId, false,
      { ...DEFAULT_PLAYER_STATS, attack: 200 },
    );
    roomInstance.combatSystem.registerCombatant(creature);

    const playerCombatant = createCombatant(
      sessionId, sessionId, roomId, true, DEFAULT_PLAYER_STATS,
    );
    playerCombatant.hp = 1;
    roomInstance.combatSystem.registerCombatant(playerCombatant);
    roomInstance.combatSystem.initiateCombat('creature-death-test', sessionId);

    // Wait for defeat → downed → bleed-out → death → 3s delay for ROOM_SWITCH
    await wait(16_000);

    // Verify ROOM_SWITCH targets the kindari stronghold
    const deathSwitches = roomSwitchMessages.filter(m => m.reason === 'player_death');
    expect(deathSwitches.length).toBeGreaterThanOrEqual(1);
    expect(deathSwitches[0]!.target).toBe(resolvePlayerHubTarget('kindari'));

    // Verify narration mentions the hub display name
    const deathOverlays = overlayMessages.filter(m => m.state === 'death');
    expect(deathOverlays.length).toBeGreaterThanOrEqual(1);
    expect(deathOverlays[0]!.narration).toContain(resolvePlayerHubName('kindari'));

    await client.leave();
  }, 25_000);

  it('player with veil faction routes to zone:the-bloom-observatory on death', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const client = await colyseus.connectTo(room);

    const roomSwitchMessages: RoomSwitchMessage[] = [];
    client.onMessage(MessageTypes.ROOM_SWITCH, (data: RoomSwitchMessage) => {
      roomSwitchMessages.push(data);
    });

    await wait(2000);

    const roomInstance = room as unknown as {
      players: Map<string, PlayerState>;
      combatSystem: CombatSystem;
      playerFactionSlugs: Map<string, string>;
    };

    const sessionId = client.sessionId;
    roomInstance.playerFactionSlugs.set(sessionId, 'bloom-tenders');

    const player = roomInstance.players.get(sessionId);
    expect(player).toBeDefined();
    const roomId = player!.currentRoomId;

    const creature = createCombatant(
      'creature-veil-test', 'Veil Brute', roomId, false,
      { ...DEFAULT_PLAYER_STATS, attack: 200 },
    );
    roomInstance.combatSystem.registerCombatant(creature);

    const playerCombatant = createCombatant(
      sessionId, sessionId, roomId, true, DEFAULT_PLAYER_STATS,
    );
    playerCombatant.hp = 1;
    roomInstance.combatSystem.registerCombatant(playerCombatant);
    roomInstance.combatSystem.initiateCombat('creature-veil-test', sessionId);

    await wait(16_000);

    const deathSwitches = roomSwitchMessages.filter(m => m.reason === 'player_death');
    expect(deathSwitches.length).toBeGreaterThanOrEqual(1);
    expect(deathSwitches[0]!.target).toBe(resolvePlayerHubTarget('bloom-tenders'));

    await client.leave();
  }, 25_000);

  it('player with no faction falls back to zone:the-refuge on death', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const client = await colyseus.connectTo(room);

    const overlayMessages: OverlayMessage[] = [];
    const roomSwitchMessages: RoomSwitchMessage[] = [];

    client.onMessage(MessageTypes.OVERLAY_STATE, (data: OverlayMessage) => {
      overlayMessages.push(data);
    });
    client.onMessage(MessageTypes.ROOM_SWITCH, (data: RoomSwitchMessage) => {
      roomSwitchMessages.push(data);
    });

    await wait(2000);

    const roomInstance = room as unknown as {
      players: Map<string, PlayerState>;
      combatSystem: CombatSystem;
      playerFactionSlugs: Map<string, string>;
    };

    const sessionId = client.sessionId;
    // No faction set — playerFactionSlugs.get(sessionId) returns undefined

    const player = roomInstance.players.get(sessionId);
    expect(player).toBeDefined();
    const roomId = player!.currentRoomId;

    const creature = createCombatant(
      'creature-nofaction-test', 'Nofaction Brute', roomId, false,
      { ...DEFAULT_PLAYER_STATS, attack: 200 },
    );
    roomInstance.combatSystem.registerCombatant(creature);

    const playerCombatant = createCombatant(
      sessionId, sessionId, roomId, true, DEFAULT_PLAYER_STATS,
    );
    playerCombatant.hp = 1;
    roomInstance.combatSystem.registerCombatant(playerCombatant);
    roomInstance.combatSystem.initiateCombat('creature-nofaction-test', sessionId);

    await wait(16_000);

    // Verify fallback to Refuge
    const deathSwitches = roomSwitchMessages.filter(m => m.reason === 'player_death');
    expect(deathSwitches.length).toBeGreaterThanOrEqual(1);
    expect(deathSwitches[0]!.target).toBe(resolvePlayerHubTarget(undefined));

    // Verify narration mentions The Refuge
    const deathOverlays = overlayMessages.filter(m => m.state === 'death');
    expect(deathOverlays.length).toBeGreaterThanOrEqual(1);
    expect(deathOverlays[0]!.narration).toContain(resolvePlayerHubName(undefined));

    await client.leave();
  }, 25_000);

  it('death penalty debuff is applied to player state on death', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const client = await colyseus.connectTo(room);

    await wait(2000);

    const roomInstance = room as unknown as {
      players: Map<string, PlayerState>;
      combatSystem: CombatSystem;
    };

    const sessionId = client.sessionId;
    const player = roomInstance.players.get(sessionId);
    expect(player).toBeDefined();

    // Before death: no penalty
    expect(player!.deathPenalty).toBeNull();

    const roomId = player!.currentRoomId;
    const creature = createCombatant(
      'creature-penalty-test', 'Penalty Brute', roomId, false,
      { ...DEFAULT_PLAYER_STATS, attack: 200 },
    );
    roomInstance.combatSystem.registerCombatant(creature);

    const playerCombatant = createCombatant(
      sessionId, sessionId, roomId, true, DEFAULT_PLAYER_STATS,
    );
    playerCombatant.hp = 1;
    roomInstance.combatSystem.registerCombatant(playerCombatant);
    roomInstance.combatSystem.initiateCombat('creature-penalty-test', sessionId);

    // Wait for defeat → downed → bleed-out → death (but before ROOM_SWITCH cleans up)
    await wait(13_000);

    // After death, before room switch cleanup: death penalty should be set
    if (roomInstance.players.has(sessionId)) {
      const postDeathPlayer = roomInstance.players.get(sessionId)!;
      expect(postDeathPlayer.deathPenalty).not.toBeNull();
      expect(postDeathPlayer.deathPenalty!.durationMs).toBe(DEATH_PENALTY_DEFAULTS.durationMs);
      expect(postDeathPlayer.deathPenalty!.attackPenalty).toBe(DEATH_PENALTY_DEFAULTS.attackPenalty);
      expect(postDeathPlayer.deathPenalty!.defencePenalty).toBe(DEATH_PENALTY_DEFAULTS.defencePenalty);
    }

    await wait(5000);
    await client.leave();
  }, 25_000);

  it('scarlet faction routes to zone:the-carrion-court on death', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, openDelayMs: 0 });
    const client = await colyseus.connectTo(room);

    const roomSwitchMessages: RoomSwitchMessage[] = [];
    client.onMessage(MessageTypes.ROOM_SWITCH, (data: RoomSwitchMessage) => {
      roomSwitchMessages.push(data);
    });

    await wait(2000);

    const roomInstance = room as unknown as {
      players: Map<string, PlayerState>;
      combatSystem: CombatSystem;
      playerFactionSlugs: Map<string, string>;
    };

    const sessionId = client.sessionId;
    roomInstance.playerFactionSlugs.set(sessionId, 'krewe-calliope');

    const player = roomInstance.players.get(sessionId);
    expect(player).toBeDefined();
    const roomId = player!.currentRoomId;

    const creature = createCombatant(
      'creature-scarlet-test', 'Scarlet Brute', roomId, false,
      { ...DEFAULT_PLAYER_STATS, attack: 200 },
    );
    roomInstance.combatSystem.registerCombatant(creature);

    const playerCombatant = createCombatant(
      sessionId, sessionId, roomId, true, DEFAULT_PLAYER_STATS,
    );
    playerCombatant.hp = 1;
    roomInstance.combatSystem.registerCombatant(playerCombatant);
    roomInstance.combatSystem.initiateCombat('creature-scarlet-test', sessionId);

    await wait(16_000);

    const deathSwitches = roomSwitchMessages.filter(m => m.reason === 'player_death');
    expect(deathSwitches.length).toBeGreaterThanOrEqual(1);
    expect(deathSwitches[0]!.target).toBe(resolvePlayerHubTarget('krewe-calliope'));

    await client.leave();
  }, 25_000);
});

// ─── Unit Tests: Spawn Zone Resolution ───────────────────────────────────────

describe('Spawn Zone Resolution (unit)', () => {
  it.each(FACTION_SLUGS)('resolves %s to correct hub target', (slug) => {
    expect(resolvePlayerHubTarget(slug)).toBe(`zone:${FACTION_STRONGHOLD_MAP[slug]}`);
  });

  it.each(FACTION_SLUGS)('resolves %s to correct hub slug', (slug) => {
    expect(resolvePlayerHubSlug(slug)).toBe(FACTION_STRONGHOLD_MAP[slug]);
  });

  it('falls back to the-refuge when faction is undefined', () => {
    expect(resolvePlayerHubTarget(undefined)).toBe(`zone:${DEFAULT_HUB_SLUG}`);
    expect(resolvePlayerHubSlug(undefined)).toBe(DEFAULT_HUB_SLUG);
  });

  it('falls back to the-refuge when faction is unknown', () => {
    expect(resolvePlayerHubTarget('nonexistent')).toBe(`zone:${DEFAULT_HUB_SLUG}`);
    expect(resolvePlayerHubSlug('nonexistent')).toBe(DEFAULT_HUB_SLUG);
  });
});

// ─── Unit: InMemoryFactionRepository for death routing ───────────────────────

describe('Faction Repository → Death Routing Pipeline', () => {
  let factionRepo: InMemoryFactionRepository;

  beforeEach(() => {
    factionRepo = new InMemoryFactionRepository();
  });

  it('player with kindari faction resolves to correct hub target', async () => {
    factionRepo.registerFaction('faction-1', 'kindari');
    await factionRepo.updateFaction('player-1', 'faction-1', { reputation: 100, rank: 1 });

    const slug = await factionRepo.getPlayerFactionSlug('player-1');
    expect(slug).toBe('kindari');
    expect(resolvePlayerHubTarget(slug ?? undefined)).toBe(resolvePlayerHubTarget('kindari'));
    expect(resolvePlayerHubName(slug ?? undefined)).toBe(resolvePlayerHubName('kindari'));
  });

  it('player with no faction resolves to Refuge hub target', async () => {
    const slug = await factionRepo.getPlayerFactionSlug('player-2');
    expect(slug).toBeNull();
    expect(resolvePlayerHubTarget(slug ?? undefined)).toBe(`zone:${DEFAULT_HUB_SLUG}`);
    expect(resolvePlayerHubName(slug ?? undefined)).toBe(HUB_DISPLAY_NAMES[DEFAULT_HUB_SLUG]);
  });

  it('full pipeline: register faction, update membership, resolve hub', async () => {
    factionRepo.registerFaction('veil-id', 'bloom-tenders');
    await factionRepo.updateFaction('player-3', 'veil-id', { reputation: 50, rank: 2 });

    const slug = await factionRepo.getPlayerFactionSlug('player-3');
    const target = resolvePlayerHubTarget(slug ?? undefined);
    const name = resolvePlayerHubName(slug ?? undefined);

    expect(target).toBe(resolvePlayerHubTarget('bloom-tenders'));
    expect(name).toBe(resolvePlayerHubName('bloom-tenders'));
  });
});
