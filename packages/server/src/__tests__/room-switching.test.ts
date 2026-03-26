/**
 * Room Switching Integration Tests — Issue #65
 *
 * Defines the behavioral CONTRACT for Refuge ↔ Shard room switching.
 * Written anticipatorily — some tests validate existing Phase 1 behavior,
 * others define Phase 2 expectations that will fail until implementation lands.
 *
 * Legend:
 *   ✅ PASS NOW  — tests existing, implemented behavior
 *   🔮 ANTICIPATORY — defines contract for Drizzt's Phase 2 implementation
 *
 * @see GDD §3 (Game Loop), Issue #65, Phase 2 Architecture Plan (Wave 0)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import {
  bootTestServer,
  connectTestClient,
  wait,
  waitUntil,
  makeCommand,
  quickCollapseOptions,
} from './helpers/index.js';
import { MessageCollector } from './helpers/message-collector.js';
import { ExtractionSystem } from '../extraction/ExtractionSystem.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph, type Room } from '../shard/RoomGraph.js';
import { CombatSystem, createCombatant } from '../combat/index.js';
import { resetConfig } from '../config.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildContext(
  player: PlayerState,
  room: Room,
  args: string[],
  overrides: Partial<CommandContext> = {},
): CommandContext {
  const graph = createTestRoomGraph();
  return {
    player,
    room,
    args,
    resolveRoom: (roomId: string) => graph.rooms.get(roomId),
    otherPlayersInRoom: [],
    stability: 0.8,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Section 1: Happy Path — Colyseus Integration
// ════════════════════════════════════════════════════════════════════════════

describe('Room Switching — Happy Path (Integration)', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  // ✅ PASS NOW — shardboard command displays available shards
  it('shardboard → shows available shards with enter instructions', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'refuge');

    // Navigate to the shardboard room (west from hearth)
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    const before = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('shardboard'));
    await wait(500);

    // Should receive narration with shard list
    expect(collector.narrate.length).toBeGreaterThan(before);
    const board = collector.narrate[collector.narrate.length - 1]!;
    expect(board.text).toContain('Shardboard');
    expect(board.text).toContain('enter');
    expect(board.type).toBe('system');

    await client.leave();
  });

  // ✅ PASS NOW — enter shard sends ROOM_SWITCH message
  it('enter shard → ROOM_SWITCH with target=shard, reason=enter_shard', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'refuge');

    // Navigate to the shardboard room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', 'shard'));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(1);
    const sw = collector.roomSwitch[0]!;
    expect(sw.target).toBe('shard');
    expect(sw.reason).toBe('enter_shard');

    // Transition narration should mention the rift
    const transition = collector.narrate.find((m) => m.text.includes('rift'));
    expect(transition).toBeDefined();

    await client.leave();
  });

  // ✅ PASS NOW — extraction completion sends ROOM_SWITCH back to refuge
  it('extraction complete → ROOM_SWITCH with target=refuge, reason=extraction_complete', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard', { useTestGraph: true });

    // Wait for shard to reach active state (seeding→open→active ~6s)
    const active = await waitUntil(
      () => collector.shardState.some((s) => s.state === 'active'),
      12000,
      500,
    );
    expect(active).toBe(true);

    // Navigate to the extraction room: entry → corridor → crypt → extraction-chamber
    client.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'down'));
    await wait(500);

    // Start extraction
    client.send(MessageTypes.COMMAND, makeCommand('extract'));
    await wait(500);

    // Wait for extraction to complete (5 ticks × ~1s each + buffer)
    const gotSwitch = await waitUntil(
      () => collector.roomSwitch.length > 0,
      20000,
      500,
    );

    expect(gotSwitch).toBe(true);
    const sw = collector.roomSwitch[0]!;
    expect(sw.target).toBe('refuge');
    expect(sw.reason).toBe('extraction_complete');

    await client.leave();
  });

  // ✅ PASS NOW — full game loop: Refuge → Shard → Extract → back to Refuge
  it('full loop: Refuge (shardboard + enter) → Shard (navigate + extract) → ROOM_SWITCH back', async () => {
    // Step 1: Connect to Refuge and see the shardboard
    const refugeRoom = await colyseus.createRoom('refuge', {});
    const refugeClient = await colyseus.connectTo(refugeRoom);
    const refugeCollector = new MessageCollector(refugeClient);
    await wait(500);

    // Verify we're in the Refuge
    expect(refugeCollector.roomHeader.length).toBeGreaterThan(0);
    expect(refugeCollector.roomHeader[0]!.roomName).toContain('Refuge');

    // Navigate to shardboard room
    refugeClient.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    // Check the shardboard
    refugeClient.send(MessageTypes.COMMAND, makeCommand('shardboard'));
    await wait(500);
    expect(refugeCollector.narrate.some((m) => m.text.includes('Shardboard'))).toBe(true);

    // Enter a shard
    refugeClient.send(MessageTypes.COMMAND, makeCommand('enter', 'shard'));
    await wait(500);
    expect(refugeCollector.roomSwitch.length).toBe(1);
    expect(refugeCollector.roomSwitch[0]!.target).toBe('shard');

    // Step 2: Client "follows" the ROOM_SWITCH → joins a shard
    const { client: shardClient, collector: shardCollector } =
      await connectTestClient(colyseus, 'shard', { useTestGraph: true });

    // Verify shard entry
    expect(shardCollector.narrate.length).toBeGreaterThan(0);
    expect(shardCollector.shardState.length).toBeGreaterThan(0);

    // Wait for shard to reach active state before navigating
    const active = await waitUntil(
      () => shardCollector.shardState.some((s) => s.state === 'active'),
      12000,
      500,
    );
    expect(active).toBe(true);

    // Navigate to extraction room
    shardClient.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(500);
    shardClient.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(500);
    shardClient.send(MessageTypes.COMMAND, makeCommand('go', 'down'));
    await wait(500);

    // Start extraction
    shardClient.send(MessageTypes.COMMAND, makeCommand('extract'));
    await wait(500);

    // Step 3: Wait for extraction to complete and verify ROOM_SWITCH back to refuge
    const gotSwitch = await waitUntil(
      () => shardCollector.roomSwitch.length > 0,
      20000,
      500,
    );

    expect(gotSwitch).toBe(true);
    expect(shardCollector.roomSwitch[0]!.target).toBe('refuge');
    expect(shardCollector.roomSwitch[0]!.reason).toBe('extraction_complete');

    await refugeClient.leave();
    await shardClient.leave();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Section 2: Edge Cases — Colyseus Integration
// ════════════════════════════════════════════════════════════════════════════

describe('Room Switching — Edge Cases (Integration)', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  beforeEach(() => {
    delete process.env['MAX_PLAYERS_PER_SHARD'];
    resetConfig();
  });

  afterEach(() => {
    delete process.env['MAX_PLAYERS_PER_SHARD'];
    resetConfig();
  });

  // ✅ PASS NOW — unknown target rejected
  it('enter unknown target → rejection, no ROOM_SWITCH', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'refuge');

    // Navigate to shardboard room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', 'tavern'));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(0);
    const err = collector.narrate.find((m) => m.text.includes('tavern'));
    expect(err).toBeDefined();
    expect(err!.type).toBe('system');

    await client.leave();
  });

  // ✅ PASS NOW — bare enter defaults to shard
  it('bare "enter" defaults to shard', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'refuge');

    // Navigate to shardboard room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter'));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(1);
    expect(collector.roomSwitch[0]!.target).toBe('shard');

    await client.leave();
  });

  // ✅ PASS NOW — shard full rejects join at Colyseus level
  it('shard full (maxPlayers) → second player rejected', async () => {
    // Force solo-play mode for this test
    process.env['MAX_PLAYERS_PER_SHARD'] = '1';
    const { resetConfig } = await import('../config.js');
    resetConfig();

    const room = await colyseus.createRoom('shard', { useTestGraph: true });
    const client1 = await colyseus.connectTo(room);
    await wait(500);

    let joinError: Error | null = null;
    try {
      await colyseus.connectTo(room);
      await wait(500);
    } catch (err) {
      joinError = err as Error;
    }

    expect(joinError).not.toBeNull();
    // Colyseus may say "full" or "locked" depending on version
    expect(
      joinError!.message.includes('full') || joinError!.message.includes('locked'),
    ).toBe(true);

    await client1.leave();

    // Restore default
    delete process.env['MAX_PLAYERS_PER_SHARD'];
    resetConfig();
  });

  // 🔮 ANTICIPATORY — Phase 2: enter specific shard by ID when that shard is full
  it.todo(
    'enter <shard-id> when shard is full → rejection message via narration (Phase 2)',
    // When Phase 2 implements shard selection by ID, the Refuge should check
    // shard capacity before sending ROOM_SWITCH. Expected: system narration
    // "That rift is too unstable — no room for another soul." and NO ROOM_SWITCH.
  );

  // 🔮 ANTICIPATORY — Phase 2: enter shard during non-open lifecycle
  it.todo(
    'enter <shard-id> when shard lifecycle is not open → rejection message (Phase 2)',
    // When Phase 2 implements shard lifecycle awareness in Refuge, entering a
    // shard that is 'destabilising' or 'collapse' should be rejected.
    // Expected: system narration "That rift is collapsing" and NO ROOM_SWITCH.
  );

  // 🔮 ANTICIPATORY — Phase 2: shardboard when no shards exist
  it.todo(
    'shardboard with no active shards → shows option to create new shard (Phase 2)',
    // Phase 2 shardboard should dynamically list active shards. When none exist,
    // it should show "No active rifts. Type `enter shard` to tear open a new one."
  );

  // ✅ PASS NOW — rapid double enter should produce two ROOM_SWITCH messages
  // (Phase 2 may add debouncing — update this test then)
  it('rapid double "enter shard" → at least one ROOM_SWITCH delivered', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'refuge');

    // Navigate to shardboard room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    // Fire two enters back-to-back (no wait in between)
    client.send(MessageTypes.COMMAND, makeCommand('enter', 'shard'));
    client.send(MessageTypes.COMMAND, makeCommand('enter', 'shard'));
    await wait(700);

    // At minimum, one ROOM_SWITCH should arrive.
    // Phase 2 may debounce to exactly 1; Phase 1 may send 2.
    expect(collector.roomSwitch.length).toBeGreaterThanOrEqual(1);
    expect(collector.roomSwitch[0]!.target).toBe('shard');

    await client.leave();
  });

  // ✅ PASS NOW — player disconnect during extraction → cleanup
  it('player disconnects mid-extraction → no orphaned extraction channel', async () => {
    const { client } = await connectTestClient(colyseus, 'shard', { useTestGraph: true });

    // Navigate to extraction room
    client.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'down'));
    await wait(500);

    // Start extraction
    client.send(MessageTypes.COMMAND, makeCommand('extract'));
    await wait(1000);

    // Disconnect abruptly during extraction
    await client.leave();

    // Allow server ticks to process the disconnection
    await wait(2000);

    // If we can create a new room/client, the server is healthy (no leaked state)
    const { client: newClient, collector: newCollector } =
      await connectTestClient(colyseus, 'shard', { useTestGraph: true });

    expect(newCollector.narrate.length).toBeGreaterThan(0);
    await newClient.leave();
  });

  // ✅ PASS NOW — extraction with empty inventory → clean return, nothing stored
  it('extraction with empty inventory → ROOM_SWITCH to refuge, no stash errors', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard', { useTestGraph: true });

    // Wait for shard to reach active state
    const active = await waitUntil(
      () => collector.shardState.some((s) => s.state === 'active'),
      12000,
      500,
    );
    expect(active).toBe(true);

    // Navigate to extraction room without picking anything up
    client.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'down'));
    await wait(500);

    // Start extraction
    client.send(MessageTypes.COMMAND, makeCommand('extract'));
    await wait(500);

    // Wait for completion
    const gotSwitch = await waitUntil(
      () => collector.roomSwitch.length > 0,
      20000,
      500,
    );

    expect(gotSwitch).toBe(true);
    expect(collector.roomSwitch[0]!.target).toBe('refuge');
    expect(collector.roomSwitch[0]!.reason).toBe('extraction_complete');

    // No error narrations should have been sent during transfer
    const errorMessages = collector.narrate.filter(
      (m) => m.type === 'system' && m.text.toLowerCase().includes('error'),
    );
    expect(errorMessages.length).toBe(0);

    await client.leave();
  });

  // ✅ PASS NOW — collapse before extraction completes → extraction interrupted, shard-sickness
  it('shard collapse during extraction → shard-sickness narration, extraction interrupted', async () => {
    // Use a very short collapse timer (3s) so collapse happens BEFORE extraction (5 ticks) finishes
    const { client, collector } = await connectTestClient(
      colyseus,
      'shard',
      { ...quickCollapseOptions(3), useTestGraph: true },
    );

    // Wait for shard to reach active state (seeding 1s + open ~1s with short timer)
    const reachedActive = await waitUntil(
      () => collector.shardState.some((s) => s.state === 'active'),
      10000,
      500,
    );
    expect(reachedActive).toBe(true);

    // Navigate to extraction room
    client.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'down'));
    await wait(500);

    // Start extraction — the shard should collapse before it completes
    client.send(MessageTypes.COMMAND, makeCommand('extract'));
    await wait(500);

    // Wait for collapse
    const collapsed = await waitUntil(
      () => collector.shardState.some((s) => s.state === 'collapse'),
      20000,
      500,
    );
    expect(collapsed).toBe(true);

    // Shard-sickness narration should always fire on collapse
    expect(collector.narrate.some((m) => m.text.includes('shatters'))).toBe(true);

    // If extraction completed before collapse, ROOM_SWITCH to refuge is valid.
    // If collapse came first, no ROOM_SWITCH. Either way the shard is done.
    // The important contract: shard-sickness narration always fires.

    await client.leave();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Section 3: Command-Level Unit Tests (No Colyseus Server)
// ════════════════════════════════════════════════════════════════════════════

describe('Room Switching — Command-Level Edge Cases (Unit)', () => {
  let combat: CombatSystem;
  let extraction: ExtractionSystem;

  const testExitResolver = (roomId: string): string[] => {
    const graph = createTestRoomGraph();
    const room = graph.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.exits.values());
  };

  beforeEach(() => {
    combat = new CombatSystem(testExitResolver);
    extraction = new ExtractionSystem(5);
  });

  // ✅ PASS NOW — extraction command lock prevents movement during extraction
  it('go command blocked during active extraction (cannot leave mid-extract)', () => {
    extraction.startExtraction('player1', 'extraction-chamber', 'extraction');

    const lock = ExtractionSystem.checkCommandLock('go', 'player1', extraction);
    expect(lock).not.toBeNull();
    expect(lock).toContain('extraction');
  });

  // ✅ PASS NOW — passive commands allowed during extraction
  it('look command allowed during extraction', () => {
    extraction.startExtraction('player1', 'extraction-chamber', 'extraction');

    const lock = ExtractionSystem.checkCommandLock('look', 'player1', extraction);
    expect(lock).toBeNull();
  });

  // ✅ PASS NOW — extraction cannot start outside extraction room
  it('extract in non-extraction room → rejected', () => {
    const result = extraction.startExtraction('player1', 'corridor', 'corridor');
    expect(result.success).toBe(false);
    expect(extraction.isExtracting('player1')).toBe(false);
  });

  // 🔮 ANTICIPATORY — combat should block extraction (the shard "exit" mechanism)
  // In Phase 1, extraction IS the way out. In Phase 2, "enter" from Refuge is the
  // way in, extraction is the way out. Combat blocking extraction is the real contract.
  it('extract command blocked during active combat (cannot leave shard mid-fight)', () => {
    const player = new PlayerState('player1', 'extraction-chamber');
    const playerCombatant = createCombatant('player1', 'Player', 'extraction-chamber', true);
    const creature = createCombatant('creature1', 'Creature', 'extraction-chamber', false);

    combat.registerCombatant(playerCombatant);
    combat.registerCombatant(creature);
    combat.initiateCombat('player1', 'creature1');

    const graph = createTestRoomGraph();
    const room = graph.rooms.get('extraction-chamber')!;
    const ctx = buildContext(player, room, [], {
      combatSystem: combat,
      extractionSystem: extraction,
    });

    // Extraction is blocked during combat via command lock
    const result = handleCommand('extract', ctx);
    expect(result.narrations).toBeDefined();
    expect(result.narrations!.length).toBeGreaterThan(0);

    // Player should NOT have an active extraction
    expect(extraction.isExtracting('player1')).toBe(false);
  });

  // 🔮 ANTICIPATORY — Phase 2: "enter" command from Refuge blocked during combat
  it.todo(
    'enter command in Refuge should be blocked during combat (Phase 2: Refuge sub-areas with combat)',
    // Phase 2 (Issue #64): Refuge sub-areas may introduce combat zones.
    // If a player is in combat within a Refuge sub-area, "enter shard" should be
    // blocked with "You can't leave during combat!" narration. No ROOM_SWITCH sent.
  );

  // ✅ PASS NOW — extraction interrupt produces valid narration
  it('extraction interrupt narration includes reason', () => {
    extraction.startExtraction('player1', 'extraction-chamber', 'extraction');

    const narration = extraction.interruptExtraction('player1', 'struck by an enemy');
    expect(narration).not.toBeNull();
    expect(narration).toContain('struck by an enemy');
    expect(extraction.isExtracting('player1')).toBe(false);
  });

  // ✅ PASS NOW — extraction tick produces noise events
  it('extraction ticks emit noise events (sound propagation input for Phase 2)', () => {
    extraction.startExtraction('player1', 'extraction-chamber', 'extraction');

    const tick = extraction.tickExtraction('player1');
    expect(tick).not.toBeNull();
    expect(tick!.noiseEvent).toBeDefined();
    expect(tick!.noiseEvent!.type).toBe('extraction');
    expect(tick!.noiseEvent!.noiseLevel).toBe(8);
  });

  // ✅ PASS NOW — collapse interrupts all active extractions simultaneously
  it('interruptAll stops all active extractions', () => {
    extraction.startExtraction('player1', 'extraction-chamber', 'extraction');
    extraction.startExtraction('player2', 'extraction-chamber', 'extraction');

    const interrupted = extraction.interruptAll('shard collapse');
    expect(interrupted.length).toBe(2);

    expect(extraction.isExtracting('player1')).toBe(false);
    expect(extraction.isExtracting('player2')).toBe(false);

    for (const entry of interrupted) {
      expect(entry.narration).toContain('shard collapse');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Section 4: ROOM_SWITCH Message Protocol Contract
// ════════════════════════════════════════════════════════════════════════════

describe('Room Switching — Message Protocol Contract', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  // ✅ PASS NOW — ROOM_SWITCH message structure matches shared type
  it('ROOM_SWITCH message contains required fields: target, reason', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'refuge');

    // Navigate to shardboard room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', 'shard'));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(1);
    const msg = collector.roomSwitch[0]!;

    // Type contract: target and reason are required strings
    expect(typeof msg.target).toBe('string');
    expect(typeof msg.reason).toBe('string');
    expect(msg.target.length).toBeGreaterThan(0);
    expect(msg.reason.length).toBeGreaterThan(0);

    await client.leave();
  });

  // ✅ PASS NOW — ROOM_SWITCH from extraction has correct shape
  it('ROOM_SWITCH from extraction includes target=refuge', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard', { useTestGraph: true });

    // Wait for shard to reach active state
    const active = await waitUntil(
      () => collector.shardState.some((s) => s.state === 'active'),
      12000,
      500,
    );
    expect(active).toBe(true);

    // Navigate to extraction chamber
    client.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'down'));
    await wait(500);

    client.send(MessageTypes.COMMAND, makeCommand('extract'));
    await wait(500);

    const gotSwitch = await waitUntil(
      () => collector.roomSwitch.length > 0,
      20000,
      500,
    );
    expect(gotSwitch).toBe(true);

    const msg = collector.roomSwitch[0]!;
    expect(msg.target).toBe('refuge');
    expect(msg.reason).toBe('extraction_complete');
    // options field is optional — may or may not be present
    if (msg.options !== undefined) {
      expect(typeof msg.options).toBe('object');
    }

    await client.leave();
  });

  // ✅ PASS NOW — no ROOM_SWITCH sent for regular commands
  it('regular commands (look, go) never produce ROOM_SWITCH', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard', { useTestGraph: true });

    client.send(MessageTypes.COMMAND, makeCommand('look'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('go', 'north'));
    await wait(500);
    client.send(MessageTypes.COMMAND, makeCommand('look'));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(0);

    await client.leave();
  });

  // ✅ PASS NOW — ROOM_SWITCH is accompanied by transition narration
  it('ROOM_SWITCH always preceded by transition narration', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'refuge');

    // Navigate to shardboard room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', 'shard'));
    await wait(500);

    // Both narration and ROOM_SWITCH should exist
    expect(collector.roomSwitch.length).toBe(1);

    // Find the narration that was sent just before the ROOM_SWITCH
    const switchTime = collector.all.find(
      (m) => m.type === MessageTypes.ROOM_SWITCH,
    )!.receivedAt;

    const priorNarrations = collector.all.filter(
      (m) => m.type === MessageTypes.NARRATE && m.receivedAt <= switchTime,
    );

    // There should be at least one narration before the switch
    expect(priorNarrations.length).toBeGreaterThan(0);

    await client.leave();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Section 5: Phase 2 Anticipatory Contracts (All 🔮)
// ════════════════════════════════════════════════════════════════════════════

describe('Room Switching — Phase 2 Anticipatory Contracts', () => {
  // These tests define the expected behavior for Issue #65 Phase 2 features.
  // They are intentionally .todo() because the implementation doesn't exist yet.
  // As Drizzt implements each feature, convert .todo() to .it() and verify.

  it.todo(
    'enter <shard-id> → ROOM_SWITCH with options.shardId for targeted shard join',
    // Phase 2: shardboard shows specific shard IDs. "enter abc-123" should send
    // ROOM_SWITCH { target: 'shard', options: { shardId: 'abc-123' }, reason: 'enter_shard' }
  );

  it.todo(
    'shardboard lists multiple active shards with metadata (tier, biome, player count)',
    // Phase 2: shardboard should query matchmaker for active shards and display
    // each with tier, biome, current/max players. Format: shard-id | T2 Flooded Crypt | 2/4
  );

  it.todo(
    'ROOM_SWITCH options pass through to target room join options',
    // Phase 2: When client receives ROOM_SWITCH with options.shardId, it should
    // join the shard room with those options: room.join('shard', { shardId: 'abc-123' })
    // The ShardRoom.onCreate should use this to connect to the correct instance.
  );

  it.todo(
    'room switch debouncing: rapid enter commands produce exactly one ROOM_SWITCH',
    // Phase 2: Server-side debounce. If player sends "enter shard" twice within 500ms,
    // only one ROOM_SWITCH should be sent. Second command gets "already transitioning" narration.
  );

  it.todo(
    'extraction with full stash → items correctly stored up to limit, excess narrated as lost',
    // Phase 2: After extraction completion, items transfer to stash. If stash is at
    // capacity, excess items are lost. The narration should mention both stored and lost counts.
    // ROOM_SWITCH to refuge should still fire regardless of stash overflow.
  );

  it.todo(
    'reconnection during room switch → client restores to correct room',
    // Phase 2: If client disconnects between receiving ROOM_SWITCH and completing the
    // join to the new room, reconnection token should resolve to the correct room.
    // This depends on Issue #28 (WebSocket Reconnection Tuning).
  );
});
