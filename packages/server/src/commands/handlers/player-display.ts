/**
 * Shared helper for formatting player display lines in room descriptions.
 * Used by look.ts and go.ts to avoid duplicating follow-display logic (#411).
 */

import type { PlayerRef } from '../index.js';
import { POSTURE_ROOM_DESCRIPTIONS } from '@ellmud/shared';

/**
 * Build display lines for visible players in a room.
 * Resolves follow status, posture, and leader names.
 */
export function formatPlayerLines(
  players: PlayerRef[],
  viewerSessionId: string,
  viewerCharacterName?: string,
): string[] {
  const lines: string[] = [];
  for (const p of players) {
    if (p.anon) continue;
    const postureDesc = p.posture ? POSTURE_ROOM_DESCRIPTIONS[p.posture] : 'is here';
    if (p.followingPlayerId) {
      const leaderName = players.find(op => op.sessionId === p.followingPlayerId)?.name
        ?? (p.followingPlayerId === viewerSessionId ? viewerCharacterName : undefined)
        ?? 'someone';
      lines.push(`${p.name} ${postureDesc}, following ${leaderName}.`);
    } else {
      lines.push(`${p.name} ${postureDesc}.`);
    }
  }
  return lines;
}
