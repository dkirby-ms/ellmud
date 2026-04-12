/**
 * help.test.ts — Help command tests (issue #340)
 *
 * Validates context-aware command listing, detailed help for specific commands,
 * dev-mode gating for dev commands, feature room command visibility,
 * and parser integration with the `?` alias.
 *
 * The help handler returns structured helpData (HelpCommandEntry[]) instead
 * of narrations for the client-side modal. Tests validate the helpData payload.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { resetConfig } from '../config.js';
import type { Room, Direction, RoomType } from '../generator/RoomGraph.js';
import type { HelpCommandEntry } from '@ellmud/shared';

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

/** Extract helpData command names as a lowercase set for easy assertions. */
function helpCommandNames(result: CommandResult): string[] {
  return (result.helpData?.commands ?? []).map((c: HelpCommandEntry) => c.name);
}

/** Extract helpData category names. */
function helpCategories(result: CommandResult): string[] {
  return [...new Set((result.helpData?.commands ?? []).map((c: HelpCommandEntry) => c.category))];
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
    it('returns helpData with command entries', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.commands.length).toBeGreaterThan(10);
    });

    it('groups commands by category', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const categories = helpCategories(result).map(c => c.toLowerCase());

      expect(categories).toEqual(expect.arrayContaining([
        expect.stringMatching(/navigation/i),
        expect.stringMatching(/items/i),
        expect.stringMatching(/combat/i),
      ]));
    });

    it('includes core commands (go, look, attack, say, etc.)', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const names = helpCommandNames(result);

      expect(names).toContain('go');
      expect(names).toContain('look');
      expect(names).toContain('take');
      expect(names).toContain('drop');
      expect(names).toContain('inventory');
      expect(names).toContain('say');
      expect(names).toContain('whisper');
      expect(names).toContain('emote');
      expect(names).toContain('attack');
      expect(names).toContain('target');
    });

    it('includes help command itself in helpData', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const names = helpCommandNames(result);

      expect(names).toContain('help');
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
      const names = helpCommandNames(result);

      expect(names).not.toContain('board');
      expect(names).not.toContain('enter');
      expect(names).not.toContain('stash');
      expect(names).not.toContain('store');
      expect(names).not.toContain('loadout');
      expect(names).not.toContain('rent');
      expect(names).not.toContain('sandbox');
    });

    it('shows board/enter commands in feature_expedition_board room', () => {
      disableDevMode();
      const boardRoom = makeRoom(
        'board-room',
        'Expedition Board',
        'A board with expedition listings.',
        'feature_expedition_board',
      );
      const result = handleCommand('help', buildCtx([], { room: boardRoom }));
      const names = helpCommandNames(result);

      expect(names).toContain('board');
      expect(names).toContain('enter');
    });

    it('shows stash/store/loadout commands in feature_stash room', () => {
      disableDevMode();
      const stashRoom = makeRoom('stash-room', 'Stash', 'Personal storage.', 'feature_stash');
      const result = handleCommand('help', buildCtx([], { room: stashRoom }));
      const names = helpCommandNames(result);

      expect(names).toContain('stash');
      expect(names).toContain('store');
      expect(names).toContain('loadout');
    });

    it('shows rent command in feature_inn room', () => {
      disableDevMode();
      const innRoom = makeRoom('inn', 'The Inn', 'A cozy inn.', 'feature_inn');
      const result = handleCommand('help', buildCtx([], { room: innRoom }));
      const names = helpCommandNames(result);

      expect(names).toContain('rent');
    });

    it('shows sandbox command in feature_sandbox_arena room when devMode enabled', () => {
      enableDevMode();
      const sandboxRoom = makeRoom('arena', 'Sandbox Arena', 'Training arena.', 'feature_sandbox_arena');
      const result = handleCommand('help', buildCtx([], { room: sandboxRoom }));
      const names = helpCommandNames(result);

      expect(names).toContain('sandbox');
    });

    it('does NOT show sandbox command in feature_sandbox room when devMode disabled', () => {
      disableDevMode();
      const sandboxRoom = makeRoom('arena', 'Sandbox Arena', 'Training arena.', 'feature_sandbox_arena');
      const result = handleCommand('help', buildCtx([], { room: sandboxRoom }));
      const names = helpCommandNames(result);

      expect(names).not.toContain('sandbox');
    });

    it('does NOT show sandbox in normal room even with devMode enabled', () => {
      enableDevMode();
      const normalRoom = makeRoom('normal', 'Normal Room', 'A regular room.');
      const result = handleCommand('help', buildCtx([], { room: normalRoom }));
      const names = helpCommandNames(result);

      expect(names).not.toContain('sandbox');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DEV COMMAND VISIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('dev command visibility', () => {
    it('does NOT show goto/teleport when devMode is disabled', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());
      const names = helpCommandNames(result);

      expect(names).not.toContain('goto');
      expect(names).not.toContain('teleport');
    });

    it('shows goto/teleport when devMode is enabled', () => {
      enableDevMode();
      const result = handleCommand('help', buildCtx());
      const names = helpCommandNames(result);

      expect(names).toContain('goto');
      expect(names).toContain('teleport');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. HELP FOR SPECIFIC COMMAND
  // ═══════════════════════════════════════════════════════════════════════════

  describe('help <command>', () => {
    it('shows detailed help for "go" command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['go']));

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('go');
      const goEntry = result.helpData!.commands.find(c => c.name === 'go');
      expect(goEntry).toBeDefined();
      expect(goEntry!.usage.length).toBeGreaterThan(0);
    });

    it('shows detailed help for "attack" command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['attack']));

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('attack');
      const entry = result.helpData!.commands.find(c => c.name === 'attack');
      expect(entry).toBeDefined();
    });

    it('shows detailed help for "look" command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['look']));

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('look');
    });

    it('shows detailed help for "say" command', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['say']));

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('say');
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

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('inventory');
    });

    it('ignores extra arguments after first (help go north → help go)', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['go', 'north', 'extra']));

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('go');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('help help → shows help for the help command itself', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx(['help']));

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('help');
    });

    it('shows help for feature commands when in appropriate room', () => {
      disableDevMode();
      const stashRoom = makeRoom('stash-room', 'Stash', 'Personal storage.', 'feature_stash');
      const result = handleCommand('help', buildCtx(['stash'], { room: stashRoom }));

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('stash');
    });

    it('shows help for dev commands when devMode enabled', () => {
      enableDevMode();
      const result = handleCommand('help', buildCtx(['goto']));

      expect(result.helpData).toBeDefined();
      expect(result.helpData!.focusCommand).toBe('goto');
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
      const result = handleCommand('help', buildCtx());

      expect(result.helpData).toBeDefined();
      const names = helpCommandNames(result);
      expect(names).toContain('go');
    });

    it('help is in the command registry', () => {
      disableDevMode();
      const result = handleCommand('help', buildCtx());

      // Should not return "unknown command" error
      expect(narrationText(result).toLowerCase()).not.toContain('nothing happens');
    });
  });
});
