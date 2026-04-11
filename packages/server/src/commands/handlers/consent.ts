/**
 * consent <player>   — Grant general consent to a player.
 * unconsent <player>  — Revoke consent from a player.
 * revoke <player>     — Alias for unconsent.
 *
 * Consent is binary (all-or-nothing) per player for v1.
 * Allows: grouping, item giving, future trade/teleport actions.
 * Session-scoped: resets on disconnect (#403 Phase 2).
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleConsent(ctx: CommandContext): CommandResult {
  const { player, args, otherPlayerInfo, resolvePlayerByName } = ctx;

  if (args.length === 0) {
    if (player.consentedPlayers.size === 0) {
      return {
        narrations: [{ text: `You haven't granted consent to anyone. Usage: consent <player>`, type: 'system' }],
      };
    }
    return {
      narrations: [{ text: `You have granted consent to ${player.consentedPlayers.size} player(s). Usage: unconsent <player> to revoke.`, type: 'system' }],
    };
  }

  const targetName = args.join(' ').toLowerCase();

  // Find target: check same room first, then try resolvePlayerByName for zone-wide lookup
  let targetId: string | undefined;
  let targetDisplayName: string | undefined;

  const inRoom = otherPlayerInfo?.find(
    (p) => !p.anon && p.name.toLowerCase() === targetName,
  );
  if (inRoom) {
    targetId = inRoom.sessionId;
    targetDisplayName = inRoom.name;
  } else if (resolvePlayerByName) {
    const resolved = resolvePlayerByName(args.join(' '));
    if (resolved) {
      targetId = resolved.sessionId;
      targetDisplayName = resolved.characterName;
    }
  }

  if (!targetId || !targetDisplayName) {
    return {
      narrations: [{ text: `No player named "${args.join(' ')}" found.`, type: 'system' }],
    };
  }

  if (targetId === player.sessionId) {
    return {
      narrations: [{ text: `You don't need to consent to yourself.`, type: 'system' }],
    };
  }

  if (player.consentedPlayers.has(targetId)) {
    return {
      narrations: [{ text: `You have already granted consent to ${targetDisplayName}.`, type: 'system' }],
    };
  }

  player.consentedPlayers.add(targetId);

  return {
    narrations: [{ text: `You grant consent to ${targetDisplayName}.`, type: 'system' }],
  };
}

export function handleUnconsent(ctx: CommandContext): CommandResult {
  const { player, args, otherPlayerInfo, resolvePlayerByName } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: `Revoke consent from whom? Usage: unconsent <player>`, type: 'system' }],
    };
  }

  const targetName = args.join(' ').toLowerCase();

  // Find target: check same room first, then try resolvePlayerByName for zone-wide lookup
  let targetId: string | undefined;
  let targetDisplayName: string | undefined;

  const inRoom = otherPlayerInfo?.find(
    (p) => !p.anon && p.name.toLowerCase() === targetName,
  );
  if (inRoom) {
    targetId = inRoom.sessionId;
    targetDisplayName = inRoom.name;
  } else if (resolvePlayerByName) {
    const resolved = resolvePlayerByName(args.join(' '));
    if (resolved) {
      targetId = resolved.sessionId;
      targetDisplayName = resolved.characterName;
    }
  }

  if (!targetId || !targetDisplayName) {
    return {
      narrations: [{ text: `No player named "${args.join(' ')}" found.`, type: 'system' }],
    };
  }

  if (!player.consentedPlayers.has(targetId)) {
    return {
      narrations: [{ text: `You haven't granted consent to ${targetDisplayName}.`, type: 'system' }],
    };
  }

  player.consentedPlayers.delete(targetId);

  return {
    narrations: [{ text: `You revoke consent from ${targetDisplayName}.`, type: 'system' }],
  };
}
