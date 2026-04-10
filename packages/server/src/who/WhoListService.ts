/**
 * WhoListService — Server-wide player list gathering with visibility filtering.
 *
 * Iterates all active ZoneRoom instances via Colyseus matchMaker,
 * collects online player data, and applies resolveVisibility() to
 * determine what the requesting player is allowed to see.
 *
 * Issue #366 — who list.
 */

import { matchMaker } from '@colyseus/core';
import type { CharacterFlags, PlayerListEntry, Posture } from '@ellmud/shared';
import { DEFAULT_CHARACTER_FLAGS } from '@ellmud/shared';
import { resolveVisibility, type ViewerContext, type TargetContext } from '../visibility/index.js';
import { getCharacterFlagsRepository } from '../db/CharacterFlagsRepository.js';

/** Raw player data exposed by each ZoneRoom for who-list gathering. */
export interface ZonePlayerData {
  characterId: string;
  characterName: string;
  roomId: string;
  zoneName: string;
  /** Current character posture (#371). */
  posture?: Posture;
}

/** Check if a Colyseus room name is a ZoneRoom instance. */
function isZoneRoomName(name: string): boolean {
  return name === 'zone' || name.startsWith('zone:');
}

/**
 * Gather filtered player list entries for a specific viewer.
 *
 * @param viewerCharacterId - The requesting player's character ID.
 * @param viewerRoomId - The room the viewer is currently in.
 * @param isAdmin - Whether the viewer has admin/dev privileges.
 */
export async function gatherPlayerList(
  viewerCharacterId: string,
  viewerRoomId: string,
  isAdmin: boolean,
): Promise<PlayerListEntry[]> {
  // 1. Query all active rooms from Colyseus matchMaker
  let roomCaches: Awaited<ReturnType<typeof matchMaker.query>>;
  try {
    roomCaches = await matchMaker.query({});
  } catch {
    return [];
  }

  // 2. Collect raw player data from all ZoneRoom instances
  const allPlayers: ZonePlayerData[] = [];
  for (const cache of roomCaches) {
    if (!isZoneRoomName(cache.name)) continue;

    let room: import('@colyseus/core').Room | undefined;
    try {
      room = matchMaker.getLocalRoomById(cache.roomId) ?? undefined;
    } catch {
      continue;
    }
    if (!room) continue;

    // Access ZoneRoom's public getWhoListPlayerData() method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zoneRoom = room as any;
    if (typeof zoneRoom.getWhoListPlayerData !== 'function') continue;

    const players = zoneRoom.getWhoListPlayerData() as ZonePlayerData[];
    allPlayers.push(...players);
  }

  // 3. Batch-load flags for all players
  let flagsMap: Map<string, CharacterFlags>;
  try {
    flagsMap = await getCharacterFlagsRepository().getAllFlags();
  } catch {
    flagsMap = new Map();
  }

  // 4. Build viewer context
  const viewer: ViewerContext = {
    characterId: viewerCharacterId,
    roomId: viewerRoomId,
    isAdmin,
  };

  // 5. Apply visibility filtering for each player
  const entries: PlayerListEntry[] = [];
  for (const pd of allPlayers) {
    const flags = flagsMap.get(pd.characterId) ?? { ...DEFAULT_CHARACTER_FLAGS };

    const target: TargetContext = {
      characterId: pd.characterId,
      characterName: pd.characterName,
      roomId: pd.roomId,
      flags,
    };

    const visibility = resolveVisibility(viewer, target);

    // Build active flag list for display
    const activeFlags: Array<'anon' | 'rp'> = [];
    if (flags.anon) activeFlags.push('anon');
    if (flags.rp) activeFlags.push('rp');

    entries.push({
      name: visibility.isAnonymous ? '???' : pd.characterName,
      level: null,  // Phase 1: no level system yet
      class: null,  // Phase 1: no class system yet
      zone: visibility.isAnonymous ? null : pd.zoneName,
      flags: activeFlags,
      anon: visibility.isAnonymous,
      posture: visibility.isAnonymous ? undefined : pd.posture,
    });
  }

  return entries;
}

/**
 * Format the who list as a MUD-style ASCII table for text output.
 */
export function formatWhoListText(entries: PlayerListEntry[]): string {
  if (entries.length === 0) {
    return [
      '[bold][bright-yellow]═══ Who Is Online ═══[/bright-yellow][/bold]',
      '',
      '[dim]No adventurers are currently online.[/dim]',
    ].join('\n');
  }

  const lines: string[] = [];
  lines.push('[bold][bright-yellow]═══ Who Is Online ═══[/bright-yellow][/bold]');
  lines.push('');

  // Header
  const nameW = 22;
  const zoneW = 18;
  const statusW = 12;
  lines.push(
    `  ${'Name'.padEnd(nameW)}${'Zone'.padEnd(zoneW)}${'Status'.padEnd(statusW)}Flags`,
  );
  lines.push(`  ${'─'.repeat(nameW)}${'─'.repeat(zoneW)}${'─'.repeat(statusW)}${'─'.repeat(14)}`);

  for (const entry of entries) {
    const displayName = entry.anon
      ? '[dim]???[/dim]'
      : `[bright-cyan]${entry.name}[/bright-cyan]`;

    const displayZone = entry.anon
      ? '[dim]???[/dim]'
      : (entry.zone ?? '[dim]Unknown[/dim]');

    const postureLabel = entry.anon ? '???' : (entry.posture ?? 'standing');
    const displayStatus = entry.anon ? '[dim]???[/dim]' : `[dim]${postureLabel}[/dim]`;

    const flagTags: string[] = [];
    if (entry.flags.includes('rp')) flagTags.push('[green][RP][/green]');
    if (entry.flags.includes('anon')) flagTags.push('[yellow][Anon][/yellow]');
    const flagStr = flagTags.join(' ') || '[dim]—[/dim]';

    // Pad using plain-text widths (markup tags don't count for alignment)
    const plainName = entry.anon ? '???' : entry.name;
    const plainZone = entry.anon ? '???' : (entry.zone ?? 'Unknown');
    const plainStatus = entry.anon ? '???' : postureLabel;

    lines.push(
      `  ${displayName}${' '.repeat(Math.max(1, nameW - plainName.length))}${displayZone}${' '.repeat(Math.max(1, zoneW - plainZone.length))}${displayStatus}${' '.repeat(Math.max(1, statusW - plainStatus.length))}${flagStr}`,
    );
  }

  lines.push('');
  lines.push(`[dim]${entries.length} adventurer${entries.length === 1 ? '' : 's'} online.[/dim]`);

  return lines.join('\n');
}
