import { describe, it, expect, beforeEach } from 'vitest';
import { ExtractionSystem } from '../extraction/ExtractionSystem.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph, type Room } from '../shard/RoomGraph.js';
import { CombatSystem, createCombatant } from '../combat/index.js';

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

// ─── ExtractionSystem Unit Tests ────────────────────────────────────────────

describe('ExtractionSystem', () => {
  let system: ExtractionSystem;

  beforeEach(() => {
    system = new ExtractionSystem(5);
  });

  describe('startExtraction', () => {
    it('should start extraction in an extraction room', () => {
      const result = system.startExtraction('player1', 'extraction-chamber', 'extraction');
      expect(result.success).toBe(true);
      expect(result.narration).toContain('extraction ritual');
      expect(result.narration).toContain('5 ticks');
      expect(system.isExtracting('player1')).toBe(true);
    });

    it('should reject extraction in a non-extraction room', () => {
      const result = system.startExtraction('player1', 'corridor', 'corridor');
      expect(result.success).toBe(false);
      expect(result.narration).toContain('no extraction point');
      expect(system.isExtracting('player1')).toBe(false);
    });

    it('should reject extraction in a room with no type', () => {
      const result = system.startExtraction('player1', 'entry', undefined);
      expect(result.success).toBe(false);
      expect(result.narration).toContain('no extraction point');
    });

    it('should reject if already extracting', () => {
      system.startExtraction('player1', 'extraction-chamber', 'extraction');
      const result = system.startExtraction('player1', 'extraction-chamber', 'extraction');
      expect(result.success).toBe(false);
      expect(result.narration).toContain('already channeling');
    });
  });

  describe('tickExtraction', () => {
    it('should advance the channel and complete after N ticks', () => {
      system.startExtraction('player1', 'extraction-chamber', 'extraction');

      // Tick 1–4: in progress
      for (let i = 0; i < 4; i++) {
        const result = system.tickExtraction('player1');
        expect(result).not.toBeNull();
        expect(result!.completed).toBe(false);
        expect(result!.interrupted).toBe(false);
        expect(result!.narration).toContain('remaining');
        expect(result!.noiseEvent).toBeDefined();
        expect(result!.noiseEvent!.noiseLevel).toBe(8);
        expect(result!.noiseEvent!.sustained).toBe(true);
      }

      // Tick 5: complete
      const final = system.tickExtraction('player1');
      expect(final).not.toBeNull();
      expect(final!.completed).toBe(true);
      expect(final!.narration).toContain('Refuge');
      expect(system.isExtracting('player1')).toBe(false);
    });

    it('should return null for non-extracting player', () => {
      expect(system.tickExtraction('nobody')).toBeNull();
    });
  });

  describe('interruptExtraction', () => {
    it('should cancel an active channel', () => {
      system.startExtraction('player1', 'extraction-chamber', 'extraction');
      expect(system.isExtracting('player1')).toBe(true);

      const narration = system.interruptExtraction('player1', 'you were struck by an enemy');
      expect(narration).toContain('shatters');
      expect(narration).toContain('struck by an enemy');
      expect(system.isExtracting('player1')).toBe(false);
    });

    it('should return null for non-extracting player', () => {
      expect(system.interruptExtraction('nobody', 'test')).toBeNull();
    });
  });

  describe('interruptAll', () => {
    it('should interrupt all active channels', () => {
      system.startExtraction('player1', 'extraction-chamber', 'extraction');
      system.startExtraction('player2', 'extraction-chamber', 'extraction');

      const results = system.interruptAll('shard collapsed');
      expect(results).toHaveLength(2);
      expect(results[0]!.narration).toContain('shard collapsed');
      expect(system.isExtracting('player1')).toBe(false);
      expect(system.isExtracting('player2')).toBe(false);
    });
  });

  describe('getChannel', () => {
    it('should return channel state', () => {
      system.startExtraction('player1', 'extraction-chamber', 'extraction');
      const channel = system.getChannel('player1');
      expect(channel).toBeDefined();
      expect(channel!.ticksRemaining).toBe(5);
      expect(channel!.totalTicks).toBe(5);
      expect(channel!.roomId).toBe('extraction-chamber');
    });
  });

  describe('noise generation', () => {
    it('should produce noise level 8 (sustained) per GDD §12.2', () => {
      system.startExtraction('player1', 'extraction-chamber', 'extraction');
      const result = system.tickExtraction('player1');
      expect(result!.noiseEvent).toEqual({
        type: 'extraction',
        noiseLevel: 8,
        roomId: 'extraction-chamber',
        playerId: 'player1',
        sustained: true,
      });
    });
  });

  describe('configurable channel duration', () => {
    it('should respect custom tick duration', () => {
      const shortSystem = new ExtractionSystem(2);
      shortSystem.startExtraction('player1', 'extraction-chamber', 'extraction');

      const tick1 = shortSystem.tickExtraction('player1');
      expect(tick1!.completed).toBe(false);

      const tick2 = shortSystem.tickExtraction('player1');
      expect(tick2!.completed).toBe(true);
    });
  });
});

// ─── Extract Command Handler Tests ──────────────────────────────────────────

describe('Extract Command', () => {
  let extractionSystem: ExtractionSystem;
  let combatSystem: CombatSystem;

  beforeEach(() => {
    extractionSystem = new ExtractionSystem(5);
    combatSystem = new CombatSystem((_roomId: string) => []);
  });

  it('should start extraction in extraction room', () => {
    const graph = createTestRoomGraph();
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    const result = handleCommand('extract', buildContext(player, room, [], {
      extractionSystem,
      combatSystem,
    }));

    expect(result.narrations[0]!.text).toContain('extraction ritual');
    expect(extractionSystem.isExtracting('p1')).toBe(true);
  });

  it('should reject extraction in non-extraction room', () => {
    const graph = createTestRoomGraph();
    const player = new PlayerState('p1', 'corridor');
    const room = graph.rooms.get('corridor')!;

    const result = handleCommand('extract', buildContext(player, room, [], {
      extractionSystem,
      combatSystem,
    }));

    expect(result.narrations[0]!.text).toContain('no extraction point');
    expect(extractionSystem.isExtracting('p1')).toBe(false);
  });

  it('should reject extraction when in combat', () => {
    const graph = createTestRoomGraph();
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    // Put player in combat
    combatSystem.registerCombatant(createCombatant('p1', 'Player1', 'extraction-chamber', true));
    combatSystem.registerCombatant(createCombatant('enemy1', 'Skeleton', 'extraction-chamber', false));
    combatSystem.initiateCombat('p1', 'enemy1');

    const result = handleCommand('extract', buildContext(player, room, [], {
      extractionSystem,
      combatSystem,
    }));

    expect(result.narrations[0]!.text).toContain('cannot begin the extraction ritual while in combat');
    expect(extractionSystem.isExtracting('p1')).toBe(false);
  });

  it('should reject when extraction system not available', () => {
    const graph = createTestRoomGraph();
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    const result = handleCommand('extract', buildContext(player, room, []));
    expect(result.narrations[0]!.text).toContain('not available');
  });
});

// ─── Command Lock Tests ─────────────────────────────────────────────────────

describe('Extraction Command Lock', () => {
  let extractionSystem: ExtractionSystem;
  let combatSystem: CombatSystem;
  let graph: ReturnType<typeof createTestRoomGraph>;

  beforeEach(() => {
    extractionSystem = new ExtractionSystem(5);
    combatSystem = new CombatSystem((_roomId: string) => []);
    graph = createTestRoomGraph();
  });

  function ctxForPlayer(player: PlayerState, room: Room, verb: string): CommandContext {
    return buildContext(player, room, verb === 'go' ? ['north'] : ['target'], {
      extractionSystem,
      combatSystem,
    });
  }

  it('should block movement (go) during extraction', () => {
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    extractionSystem.startExtraction('p1', 'extraction-chamber', 'extraction');

    const result = handleCommand('go', ctxForPlayer(player, room, 'go'));
    expect(result.narrations[0]!.text).toContain('cannot move while channeling');
  });

  it('should block attack during extraction', () => {
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    extractionSystem.startExtraction('p1', 'extraction-chamber', 'extraction');

    const result = handleCommand('attack', ctxForPlayer(player, room, 'attack'));
    expect(result.narrations[0]!.text).toContain('cannot fight while channeling');
  });

  it('should block strike during extraction', () => {
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    extractionSystem.startExtraction('p1', 'extraction-chamber', 'extraction');

    const result = handleCommand('strike', ctxForPlayer(player, room, 'strike'));
    expect(result.narrations[0]!.text).toContain('cannot fight while channeling');
  });

  it('should block dodge during extraction', () => {
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    extractionSystem.startExtraction('p1', 'extraction-chamber', 'extraction');

    const result = handleCommand('dodge', ctxForPlayer(player, room, 'dodge'));
    expect(result.narrations[0]!.text).toContain('cannot fight while channeling');
  });

  it('should block flee during extraction', () => {
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    extractionSystem.startExtraction('p1', 'extraction-chamber', 'extraction');

    const result = handleCommand('flee', ctxForPlayer(player, room, 'flee'));
    expect(result.narrations[0]!.text).toContain('cannot fight while channeling');
  });

  it('should allow look during extraction', () => {
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    extractionSystem.startExtraction('p1', 'extraction-chamber', 'extraction');

    const result = handleCommand('look', buildContext(player, room, [], {
      extractionSystem,
      combatSystem,
    }));
    // Look should succeed — narration should contain room info, not a lock message
    expect(result.narrations[0]!.text).not.toContain('cannot move');
    expect(result.narrations[0]!.text).not.toContain('cannot fight');
  });

  it('should allow inventory during extraction', () => {
    const player = new PlayerState('p1', 'extraction-chamber');
    const room = graph.rooms.get('extraction-chamber')!;

    extractionSystem.startExtraction('p1', 'extraction-chamber', 'extraction');

    const result = handleCommand('inventory', buildContext(player, room, [], {
      extractionSystem,
      combatSystem,
    }));
    expect(result.narrations[0]!.text).not.toContain('cannot move');
    expect(result.narrations[0]!.text).not.toContain('cannot fight');
  });

  it('should not block commands when not extracting', () => {
    const player = new PlayerState('p1', 'entry');
    const room = graph.rooms.get('entry')!;

    const result = handleCommand('go', buildContext(player, room, ['north'], {
      extractionSystem,
      combatSystem,
    }));
    // Should proceed normally (move north from entry to corridor)
    expect(result.narrations[0]!.text).toContain('move north');
  });
});

// ─── Successful Extraction Flow ─────────────────────────────────────────────

describe('Extraction Full Flow', () => {
  it('should complete extraction after all ticks', () => {
    const system = new ExtractionSystem(3);
    system.startExtraction('player1', 'extraction-chamber', 'extraction');

    const tick1 = system.tickExtraction('player1');
    expect(tick1!.completed).toBe(false);

    const tick2 = system.tickExtraction('player1');
    expect(tick2!.completed).toBe(false);

    const tick3 = system.tickExtraction('player1');
    expect(tick3!.completed).toBe(true);
    expect(tick3!.narration).toContain('Refuge');
    expect(system.isExtracting('player1')).toBe(false);
  });

  it('should handle interruption mid-channel', () => {
    const system = new ExtractionSystem(5);
    system.startExtraction('player1', 'extraction-chamber', 'extraction');

    // Tick once
    system.tickExtraction('player1');
    expect(system.isExtracting('player1')).toBe(true);

    // Interrupt
    const narration = system.interruptExtraction('player1', 'you took damage');
    expect(narration).toContain('shatters');
    expect(narration).toContain('took damage');
    expect(system.isExtracting('player1')).toBe(false);

    // Further ticks return null
    expect(system.tickExtraction('player1')).toBeNull();
  });

  it('should handle multiple players extracting simultaneously', () => {
    const system = new ExtractionSystem(3);

    system.startExtraction('player1', 'extraction-chamber', 'extraction');
    system.startExtraction('player2', 'extraction-chamber', 'extraction');

    expect(system.getActiveExtractions()).toHaveLength(2);

    // Tick both
    for (let i = 0; i < 2; i++) {
      const r1 = system.tickExtraction('player1');
      const r2 = system.tickExtraction('player2');
      expect(r1!.completed).toBe(false);
      expect(r2!.completed).toBe(false);
    }

    // Interrupt player 1, player 2 completes
    system.interruptExtraction('player1', 'hit by an enemy');
    expect(system.isExtracting('player1')).toBe(false);

    const final = system.tickExtraction('player2');
    expect(final!.completed).toBe(true);
    expect(system.isExtracting('player2')).toBe(false);
  });

  it('should handle shard collapse interrupting all extractions', () => {
    const system = new ExtractionSystem(5);
    system.startExtraction('player1', 'extraction-chamber', 'extraction');
    system.startExtraction('player2', 'extraction-chamber', 'extraction');

    // Tick a couple times
    system.tickExtraction('player1');
    system.tickExtraction('player2');

    // Collapse
    const results = system.interruptAll('the shard collapsed around you');
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.narration).toContain('shard collapsed');
    }
    expect(system.getActiveExtractions()).toHaveLength(0);
  });
});

// ─── Room Graph Extraction Room ─────────────────────────────────────────────

describe('Room Graph — Extraction Room', () => {
  it('should include an extraction-type room in test graph', () => {
    const graph = createTestRoomGraph();
    const extractionRoom = graph.rooms.get('extraction-chamber');
    expect(extractionRoom).toBeDefined();
    expect(extractionRoom!.type).toBe('extraction');
    expect(extractionRoom!.name).toBe('Extraction Chamber');
  });

  it('should have the extraction room connected to the graph', () => {
    const graph = createTestRoomGraph();
    const crypt = graph.rooms.get('crypt')!;
    expect(crypt.exits.get('down')).toBe('extraction-chamber');

    const extraction = graph.rooms.get('extraction-chamber')!;
    expect(extraction.exits.get('up')).toBe('crypt');
  });
});
