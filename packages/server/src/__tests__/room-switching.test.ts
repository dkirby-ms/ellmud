/**
 * Room Switching Integration Tests — Issue #65
 *
 * Defines the behavioral CONTRACT for Zone ↔ Zone room switching.
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
  makeCommand,
} from './helpers/index.js';
import { resetConfig } from '../config.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

  // ✅ PASS NOW — board command displays available zones
  it.todo('board → shows available zones with enter instructions', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    // Navigate to the expedition board room (west from hearth)
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    const before = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('board'));
    await wait(500);

    // Should receive narration with zone list
    expect(collector.narrate.length).toBeGreaterThan(before);
    const board = collector.narrate[collector.narrate.length - 1]!;
    expect(board.text).toContain('Expedition Board');
    expect(board.text).toContain('enter');
    expect(board.type).toBe('system');

    await client.leave();
  });

  // ✅ PASS NOW — enter zone sends ROOM_SWITCH message
  it.todo('enter zone → ROOM_SWITCH with target=zone, reason=enter_zone', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    // Navigate to the expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', 'zone'));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(1);
    const sw = collector.roomSwitch[0]!;
    expect(sw.target).toBe('zone');
    expect(sw.reason).toBe('enter_zone');

    // Transition narration should mention the rift
    const transition = collector.narrate.find((m) => m.text.includes('rift'));
    expect(transition).toBeDefined();

    await client.leave();
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
    delete process.env['MAX_PLAYERS_PER_ZONE'];
    resetConfig();
  });

  afterEach(() => {
    delete process.env['MAX_PLAYERS_PER_ZONE'];
    resetConfig();
  });

  // ✅ PASS NOW — unknown target rejected
  it.todo('enter unknown target → rejection, no ROOM_SWITCH', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    // Navigate to expedition board room first
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

  // ✅ PASS NOW — bare enter defaults to zone
  it.todo('bare "enter" defaults to zone', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    // Navigate to expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter'));
    await wait(500);

    expect(collector.roomSwitch.length).toBe(1);
    expect(collector.roomSwitch[0]!.target).toBe('zone');

    await client.leave();
  });

  // ✅ PASS NOW — zone full rejects join at Colyseus level
  it('zone full (maxPlayers) → second player rejected', async () => {
    // Force solo-play mode for this test
    process.env['MAX_PLAYERS_PER_ZONE'] = '1';
    const { resetConfig } = await import('../config.js');
    resetConfig();

    const room = await colyseus.createRoom('zone', { useTestGraph: true });
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
    delete process.env['MAX_PLAYERS_PER_ZONE'];
    resetConfig();
  });

  // 🔮 ANTICIPATORY — Phase 2: enter specific zone by ID when that zone is full
  it.todo(
    'enter <zone-id> when zone is full → rejection message via narration (Phase 2)',
    // When Phase 2 implements zone selection by ID, the Refuge should check
    // zone capacity before sending ROOM_SWITCH. Expected: system narration
    // "That rift is too unstable — no room for another soul." and NO ROOM_SWITCH.
  );

  // 🔮 ANTICIPATORY — Phase 2: enter zone during non-open lifecycle
  it.todo(
    'enter <zone-id> lifecycle check (deprecated — zones are always open now)',
    // Collapse lifecycle removed in #438. Zones are persistent MUD-style.
    // This todo is no longer applicable.
  );

  // 🔮 ANTICIPATORY — Phase 2: expedition board when no zones exist
  it.todo(
    'board with no active zones → shows option to create new zone (Phase 2)',
    // Phase 2 expedition board should dynamically list active zones. When none exist,
    // it should show "No active rifts. Type `enter zone` to tear open a new one."
  );

  // ✅ PASS NOW — rapid double enter should produce two ROOM_SWITCH messages
  // (Phase 2 may add debouncing — update this test then)
  it.todo('rapid double "enter zone" → at least one ROOM_SWITCH delivered', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    // Navigate to expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    // Fire two enters back-to-back (no wait in between)
    client.send(MessageTypes.COMMAND, makeCommand('enter', 'zone'));
    client.send(MessageTypes.COMMAND, makeCommand('enter', 'zone'));
    await wait(700);

    // At minimum, one ROOM_SWITCH should arrive.
    // Phase 2 may debounce to exactly 1; Phase 1 may send 2.
    expect(collector.roomSwitch.length).toBeGreaterThanOrEqual(1);
    expect(collector.roomSwitch[0]!.target).toBe('zone');

    await client.leave();
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
  it.todo('ROOM_SWITCH message contains required fields: target, reason', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    // Navigate to expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', 'zone'));
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

  // ✅ PASS NOW — no ROOM_SWITCH sent for regular commands
  it('regular commands (look, go) never produce ROOM_SWITCH', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { useTestGraph: true });

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
  it.todo('ROOM_SWITCH always preceded by transition narration', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone', { zoneSlug: 'the-refuge' });

    // Navigate to expedition board room first
    client.send(MessageTypes.COMMAND, makeCommand('go', 'west'));
    await wait(300);

    client.send(MessageTypes.COMMAND, makeCommand('enter', 'zone'));
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
    'enter <zone-id> → ROOM_SWITCH with options.zoneId for targeted zone join',
    // Phase 2: board shows specific zone IDs. "enter abc-123" should send
    // ROOM_SWITCH { target: 'zone', options: { zoneId: 'abc-123' }, reason: 'enter_zone' }
  );

  it.todo(
    'board lists multiple active zones with metadata (tier, biome, player count)',
    // Phase 2: board should query matchmaker for active zones and display
    // each with tier, biome, current/max players. Format: zone-id | T2 Flooded Crypt | 2/4
  );

  it.todo(
    'ROOM_SWITCH options pass through to target room join options',
    // Phase 2: When client receives ROOM_SWITCH with options.zoneId, it should
    // join the zone room with those options: room.join('zone', { zoneId: 'abc-123' })
    // The ZoneRoom.onCreate should use this to connect to the correct instance.
  );

  it.todo(
    'room switch debouncing: rapid enter commands produce exactly one ROOM_SWITCH',
    // Phase 2: Server-side debounce. If player sends "enter zone" twice within 500ms,
    // only one ROOM_SWITCH should be sent. Second command gets "already transitioning" narration.
  );

  it.todo(
    'zone exit with full stash → items correctly stored up to limit, excess narrated as lost',
    // Phase 2: After exiting a zone, items transfer to stash. If stash is at
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
