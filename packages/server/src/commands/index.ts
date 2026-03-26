/**
 * Command registry — maps verb strings to handler functions.
 *
 * All command handlers receive a CommandContext and return a CommandResult.
 * The ShardRoom is responsible for building the context and delivering the result.
 */

import type { NarrationType } from '@ellmud/shared';
import type { Room } from '../shard/RoomGraph.js';
import type { PlayerState } from '../state/PlayerState.js';
import type { CombatSystem } from '../combat/CombatSystem.js';
import { ExtractionSystem } from '../extraction/ExtractionSystem.js';
import { handleGo } from './handlers/go.js';
import { handleLook } from './handlers/look.js';
import { handleTake } from './handlers/take.js';
import { handleDrop } from './handlers/drop.js';
import { handleInventory } from './handlers/inventory.js';
import { handleAttack } from './handlers/attack.js';
import { handleStrike, handleDodge, handleFlee } from './handlers/combat-actions.js';
import { handleExtract } from './handlers/extract.js';
import { handleSay } from './handlers/say.js';
import { handleWhisper } from './handlers/whisper.js';
import { handleEmote } from './handlers/emote.js';
import { handleStabilize } from './handlers/stabilize.js';
import type { DowningSystem } from '../systems/DowningSystem.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NarrationEntry {
  text: string;
  type: NarrationType;
}

export interface RoomHeaderEntry {
  roomName: string;
  exits: string[];
  stability: number;
}

export interface CommandResult {
  narrations: NarrationEntry[];
  roomHeader?: RoomHeaderEntry;
  /** When set, the player should be transferred to another zone. */
  zoneTransfer?: { targetZoneSlug: string; targetRoomSlug: string };
}

export interface CreatureRef {
  id: string;
  name: string;
}

export interface CommandContext {
  player: PlayerState;
  room: Room;
  args: string[];
  /** Resolve a room ID to a Room object. */
  resolveRoom: (roomId: string) => Room | undefined;
  /** Other player session IDs in the same room. */
  otherPlayersInRoom: string[];
  /** Current shard stability (0–1). */
  stability: number;
  /** Combat system reference (available in ShardRoom context). */
  combatSystem?: CombatSystem;
  /** Extraction system reference (available in ShardRoom context). */
  extractionSystem?: ExtractionSystem;
  /** Living creatures in the current room. */
  creaturesInRoom?: CreatureRef[];
  /** Downing system reference (available in ShardRoom context). */
  downingSystem?: DowningSystem;
}

export type CommandHandler = (ctx: CommandContext) => CommandResult;

// ─── Registry ───────────────────────────────────────────────────────────────

const handlers = new Map<string, CommandHandler>();

handlers.set('go', handleGo);
handlers.set('look', handleLook);
handlers.set('take', handleTake);
handlers.set('drop', handleDrop);
handlers.set('inventory', handleInventory);
handlers.set('attack', handleAttack);
handlers.set('strike', handleStrike);
handlers.set('dodge', handleDodge);
handlers.set('flee', handleFlee);
handlers.set('extract', handleExtract);
handlers.set('say', handleSay);
handlers.set('whisper', handleWhisper);
handlers.set('emote', handleEmote);
handlers.set('stabilize', handleStabilize);

/** Execute a command for a player. Returns narration results. */
export function handleCommand(
  verb: string,
  ctx: CommandContext,
): CommandResult {
  // Extraction command lock: block movement/combat while channeling
  if (ctx.extractionSystem) {
    const lockMessage = ExtractionSystem.checkCommandLock(
      verb, ctx.player.sessionId, ctx.extractionSystem,
    );
    if (lockMessage) {
      return {
        narrations: [{ text: lockMessage, type: 'system' }],
      };
    }
  }

  // Combat movement lock: block 'go' while in combat (must use 'flee')
  if (verb === 'go' && ctx.combatSystem?.isInCombat(ctx.player.sessionId)) {
    return {
      narrations: [{
        text: "You're in combat! Use 'flee' to escape first.",
        type: 'system',
      }],
    };
  }

  const handler = handlers.get(verb);
  if (!handler) {
    return {
      narrations: [{
        text: `You try to "${verb}" but nothing happens.`,
        type: 'system',
      }],
    };
  }
  return handler(ctx);
}
