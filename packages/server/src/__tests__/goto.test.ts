/**
 * Goto Command Tests — same-zone & cross-zone teleportation.
 *
 * Validates dev-mode gating, usage text, local room teleport,
 * unknown-room errors, and cross-zone transfer signalling.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { handleGoto } from '../commands/handlers/goto.js';
import type { CommandContext, CommandResult, CreatureRef } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { resetConfig } from '../config.js';
import type { Room, Direction, RoomType } from '../generator/RoomGraph.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRoom(
  id: string,
  name: string,
  description: string,
  exits: [Direction, string][] = [],
): Room {
  return {
    id,
    name,
    description,
    exits: new Map(exits),
    items: [],
  };
}

const tavern = makeRoom('tavern', 'The Rusty Flagon', 'A dimly lit tavern.', [
  ['north', 'courtyard'],
]);
const courtyard = makeRoom('courtyard', 'Courtyard', 'An open courtyard.', [
  ['south', 'tavern'],
  ['east', 'chapel'],
]);

const allRooms = new Map<string, Room>([
  ['tavern', tavern],
  ['courtyard', courtyard],
]);

function makePlayer(roomId = 'tavern'): PlayerState {
  return new PlayerState('test-player', roomId, 20);
}

function buildCtx(
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  const player = extras.player ?? makePlayer();
  const room = extras.room ?? tavern;
  return {
    player,
    room,
    args,
    resolveRoom: (id) => allRooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
    zoneSlug: 'current-zone',
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

describe('goto command', () => {
  afterEach(() => {
    delete process.env.DEV_MODE_ENABLED;
    resetConfig();
  });

  // 1. Dev mode gating
  it('returns "not available" when devModeEnabled is false', () => {
    disableDevMode();
    const result = handleGoto(buildCtx(['courtyard']));
    expect(narrationText(result).toLowerCase()).toContain('not available');
  });

  // 2. No args — usage text
  it('returns usage text when no arguments provided', () => {
    enableDevMode();
    const result = handleGoto(buildCtx([]));
    const text = narrationText(result).toLowerCase();
    expect(text).toContain('usage');
    expect(text).toContain('goto');
  });

  // 3. Same-zone goto
  it('teleports player to a known room in the same zone', () => {
    enableDevMode();
    const player = makePlayer('tavern');
    const result = handleGoto(buildCtx(['courtyard'], { player }));
    const text = narrationText(result);

    expect(player.currentRoomId).toBe('courtyard');
    expect(text).toContain('Courtyard');
    expect(text).toContain('south');
    expect(text).toContain('east');
    expect(result.roomHeader).toBeDefined();
    expect(result.roomHeader!.roomName).toBe('Courtyard');
  });

  // 4. Same-zone goto unknown room
  it('returns error for unknown room slug', () => {
    enableDevMode();
    const result = handleGoto(buildCtx(['nonexistent-dungeon']));
    const text = narrationText(result).toLowerCase();
    expect(text).toContain('no room with slug');
  });

  // 5. Cross-zone goto
  it('returns zoneTransfer for cross-zone slug (zone:room)', () => {
    enableDevMode();
    const result = handleGoto(buildCtx(['other-zone:some-room']));

    expect(result.zoneTransfer).toBeDefined();
    expect(result.zoneTransfer!.targetZoneSlug).toBe('other-zone');
    expect(result.zoneTransfer!.targetRoomSlug).toBe('some-room');
  });

  // 6. Cross-zone goto same zone falls through to local behavior
  it('falls through to same-zone behavior when cross-zone target matches current zone', () => {
    enableDevMode();
    const player = makePlayer('tavern');
    const result = handleGoto(buildCtx(['current-zone:courtyard'], { player }));

    // Should NOT produce a zoneTransfer — it's the same zone
    expect(result.zoneTransfer).toBeUndefined();
    // Should move the player locally
    expect(player.currentRoomId).toBe('courtyard');
    expect(narrationText(result)).toContain('Courtyard');
  });

  // 7. Cross-zone narration includes teleport message
  it('includes narration about teleporting in cross-zone transfer', () => {
    enableDevMode();
    const result = handleGoto(buildCtx(['far-zone:deep-room']));

    expect(result.zoneTransfer).toBeDefined();
    const text = narrationText(result).toLowerCase();
    expect(text.length).toBeGreaterThan(0);
    // Should mention teleporting or transferring
    expect(
      text.includes('teleport') || text.includes('transfer') || text.includes('zone'),
    ).toBe(true);
  });
});
