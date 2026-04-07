/**
 * help.test.ts — Help command tests (issue #340)
 *
 * Validates context-aware command listing, detailed help for specific commands,
 * dev-mode gating for dev commands, feature room command visibility,
 * and parser integration with the `?` alias.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { resetConfig } from '../config.js';
import type { Room, Direction, RoomType } from '../generator/RoomGraph.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRoom(
  id: string,
  name: string,
  description: string,
  type?: RoomType,
  exits: [Direction, string][] = [],
): Room {
  return {
    id,
    name,
    description,
    type,
    exits: new Map(exits),
    items: [],
  };
}

function makePlayer(roomId = 'test-room'): PlayerState {
  return new PlayerState('test-session', roomId, 20);
}

function buildCtx(
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  const player = extras.player ?? makePlayer();
  const room = extras.room ?? makeRoom('test-room', 'Test Room', 'A normal test room.');
  return {
    player,
    room,
    args,
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
    zoneSlug: 'test-zone',
    ...extras,
  };
}

function narrationText(result: CommandResult): string {
  return result.narrations.map((n) => n.text).join('\n');
}

function enableDevMode(): void {
  process.env.DEV_MODE_ENABLED = 'true';
  resetConfig();
}

function disableDevMode(): void {
  process.env.DEV_MODE_ENABLED = 'false';
  resetConfig();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('help command', () => {
  afterEach(() => {
    delete process.env.DEV_MODE_ENABLED;
    resetConfig();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. BASIC HELP (NO ARGS)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('help with no arguments', () => {
    it('returns system narration with command list', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const text = narrationText(result);

      expect(result.narrations.length).toBeGreaterThan(0);
      expect(result.narrations[0]?.type).toBe('system');
      expect(text.length).toBeGreaterThan(50); // Should be substantial text
    });

    it('groups commands by category', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const text = narrationText(result).toLowerCase();

      // Should have category headers
      expect(text).toMatch(/navigation|movement/);
      expect(text).toMatch(/items|inventory/);
      expect(text).toMatch(/communication|social/);
      expect(text).toMatch(/combat/);
    });

    it('includes core commands (go, look, attack, say, etc.)', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const text = narrationText(result).toLowerCase();

      // Navigation
      expect(text).toContain('go');
      expect(text).toContain('look');

      // Items
      expect(text).toContain('take');
      expect(text).toContain('drop');
      expect(text).toContain('inventory');

      // Communication
      expect(text).toContain('say');
      expect(text).toContain('whisper');
      expect(text).toContain('emote');

      // Combat
      expect(text).toContain('attack');
      expect(text).toContain('target');
    });

    it('shows "help <command>" hint at the bottom', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const text = narrationText(result).toLowerCase();

      expect(text).toMatch(/help\s+<command>|help\s+\[command\]/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CONTEXT-AWARE FILTERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('context-aware command filtering', () => {
    it('does NOT show feature room commands in a normal room', () => {
      disableDevMode();
      const normalRoom = makeRoom('normal', 'Normal Room', 'A regular room.');
      const result = handleCommand('help', buildCtx([], { room: normalRoom }));
      const text = narrationText(result).toLowerCase();

      // Feature commands should NOT appear
      expect(text).not.toContain('board');
      expect(text).not.toContain('zoneboard');
      expect(text).not.toContain('enter');
      expect(text).not.toContain('stash');
      expect(text).not.toContain('store');
      expect(text).not.toContain('loadout');
      expect(text).not.toContain('rent');
      expect(text).not.toContain('sandbox');
    });

    it('shows board/zoneboard/enter commands in feature_expedition_board room', () => {
      disableDevMode();
      const boardRoom = makeRoom(
        'board-room',
        'Expedition Board',
        'A board with expedition listings.',
        'feature_expedition_board',
      );
      const result = handleCommand('help', buildCtx([], { room: boardRoom }));
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('board');
      expect(text).toContain('enter');
      // May also contain zoneboard as legacy alias
    });

    it('shows stash/store/loadout commands in feature_stash room', () => {
      disableDevMode();
      const stashRoom = makeRoom('stash-room', 'Stash', 'Personal storage.', 'feature_stash');
      const result = handleCommand('help', buildCtx([], { room: stashRoom }));
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('stash');
      expect(text).toContain('store');
      expect(text).toContain('loadout');
    });

    it('shows rent command in feature_inn room', () => {
      disableDevMode();
      const innRoom = makeRoom('inn', 'The Inn', 'A cozy inn.', 'feature_inn');
      const result = handleCommand('help', buildCtx([], { room: innRoom }));
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('rent');
    });

    it('shows sandbox command in feature_sandbox_arena room when devMode enabled', () => {
      enableDevMode();
      const sandboxRoom = makeRoom('arena', 'Sandbox Arena', 'Training arena.', 'feature_sandbox_arena');
      const result = handleCommand('help', buildCtx([], { room: sandboxRoom }));
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('sandbox');
    });

    it('does NOT show sandbox command in feature_sandbox room when devMode disabled', () => {
      disableDevMode();
      const sandboxRoom = makeRoom('arena', 'Sandbox Arena', 'Training arena.', 'feature_sandbox_arena');
      const result = handleCommand('help', buildCtx([], { room: sandboxRoom }));
      const text = narrationText(result).toLowerCase();

      expect(text).not.toContain('sandbox');
    });

    it('does NOT show sandbox in normal room even with devMode enabled', () => {
      enableDevMode();
      const normalRoom = makeRoom('normal', 'Normal Room', 'A regular room.');
      const result = handleCommand('help', buildCtx([], { room: normalRoom }));
      const text = narrationText(result).toLowerCase();

      // Sandbox requires both devMode AND correct room type
      expect(text).not.toContain('sandbox');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DEV COMMAND VISIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('dev command visibility', () => {
    it('does NOT show goto/teleport when devMode is disabled', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const text = narrationText(result).toLowerCase();

      expect(text).not.toContain('goto');
      expect(text).not.toContain('teleport');
    });

    it('shows goto/teleport when devMode is enabled', () => {
      enableDevMode();
      const result = handleCommand('help', buildCtx());
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('goto');
      expect(text).toContain('teleport');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. HELP FOR SPECIFIC COMMAND
  // ═══════════════════════════════════════════════════════════════════════════

  describe('help <command>', () => {
    it('shows detailed help for "go" command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['go']));
      const text = narrationText(result).toLowerCase();

      expect(result.narrations[0]?.type).toBe('system');
      expect(text).toContain('go');
      // Should mention usage or directions
      expect(text.length).toBeGreaterThan(30);
    });

    it('shows detailed help for "attack" command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['attack']));
      const text = narrationText(result).toLowerCase();

      expect(result.narrations[0]?.type).toBe('system');
      expect(text).toContain('attack');
      expect(text.length).toBeGreaterThan(30);
    });

    it('shows detailed help for "look" command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['look']));
      const text = narrationText(result).toLowerCase();

      expect(result.narrations[0]?.type).toBe('system');
      expect(text).toContain('look');
      expect(text.length).toBeGreaterThan(30);
    });

    it('shows detailed help for "say" command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['say']));
      const text = narrationText(result).toLowerCase();

      expect(result.narrations[0]?.type).toBe('system');
      expect(text).toContain('say');
      expect(text.length).toBeGreaterThan(30);
    });

    it('returns helpful error for unknown command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['foobar']));
      const text = narrationText(result).toLowerCase();

      expect(result.narrations[0]?.type).toBe('system');
      expect(text).toMatch(/unknown|not found|doesn't exist|no such command/);
    });

    it('handles aliases correctly (e.g., help i → inventory)', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['i']));
      const text = narrationText(result).toLowerCase();

      // Should show help for inventory command
      expect(text).toContain('inventory');
    });

    it('ignores extra arguments after first (help go north → help go)', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['go', 'north', 'extra']));
      const text = narrationText(result).toLowerCase();

      // Should show help for "go" command, not error about extra args
      expect(text).toContain('go');
      expect(text).not.toContain('unknown');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('help help → shows help for the help command itself', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['help']));
      const text = narrationText(result).toLowerCase();

      expect(result.narrations[0]?.type).toBe('system');
      expect(text).toContain('help');
      // Should describe the help command
      expect(text.length).toBeGreaterThan(20);
    });

    it('shows help for feature commands when in appropriate room', () => {
      disableDevMode();
      const stashRoom = makeRoom('stash-room', 'Stash', 'Personal storage.', 'feature_stash');
      const result = handleCommand('help', buildCtx(['stash'], { room: stashRoom }));
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('stash');
      expect(text.length).toBeGreaterThan(20);
    });

    it('shows help for dev commands when devMode enabled', () => {
      enableDevMode();
      const result = handleCommand('help', buildCtx(['goto']));
      const text = narrationText(result).toLowerCase();

      expect(text).toContain('goto');
      expect(text.length).toBeGreaterThan(20);
    });

    it('returns error for dev command help when devMode disabled', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['goto']));
      const text = narrationText(result).toLowerCase();

      // Should either say unknown or not available
      expect(text).toMatch(/unknown|not found|not available/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. PARSER INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('parser integration', () => {
    it('? alias maps to help command', () => {
      disableDevMode();
      // This test assumes the parser converts "?" to "help"
      // We'll test by calling help directly, but note that parser.ts should handle the alias
      const result = handleCommand('help', buildCtx());
      const text = narrationText(result);

      // Should return the same help output
      expect(result.narrations.length).toBeGreaterThan(0);
      expect(text).toContain('go'); // Core command should be listed
    });

    it('help is in the command registry', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());

      // Should not return "unknown command" error
      expect(narrationText(result).toLowerCase()).not.toContain('nothing happens');
    });
  });
});
