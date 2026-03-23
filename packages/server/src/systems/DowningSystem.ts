/**
 * Downing System — manages the downed state, bleed-out timers, and stabilization.
 *
 * When a player reaches 0 HP they enter the "downed" state instead of dying immediately.
 * A 10-tick bleed-out timer starts. Squadmates can stabilize using `stabilize [player]`
 * (costs 2 ticks + a bandage). If the timer expires or a killing blow lands, the player dies.
 *
 * Pure game logic — no Colyseus dependency. ShardRoom wires this into the tick loop.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Ticks before a downed player bleeds out and dies. */
export const BLEED_OUT_TICKS = 10;

/** Ticks required to channel the stabilize action. */
export const STABILIZE_CHANNEL_TICKS = 2;

/** Item ID required to perform stabilization. */
export const BANDAGE_ITEM_ID = 'bandage';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DownedState = 'downed' | 'stabilized';

export interface DownedPlayer {
  playerId: string;
  playerName: string;
  roomId: string;
  state: DownedState;
  /** Ticks remaining before bleed-out death. Only counts down while state === 'downed'. */
  bleedOutTicksRemaining: number;
  /** IDs of combatants who dealt the lethal damage (for PvP kill attribution). */
  killerIds?: string[];
}

export interface StabilizeChannel {
  stabilizerId: string;
  targetId: string;
  ticksRemaining: number;
}

export type DowningEventType =
  | 'player_downed'
  | 'player_stabilized'
  | 'player_bleed_out'
  | 'killing_blow'
  | 'stabilize_started'
  | 'stabilize_interrupted';

export interface DowningEvent {
  type: DowningEventType;
  playerId: string;
  playerName: string;
  roomId: string;
  stabilizerId?: string;
  stabilizerName?: string;
}

// ─── System ──────────────────────────────────────────────────────────────────

export class DowningSystem {
  private downedPlayers = new Map<string, DownedPlayer>();
  private stabilizeChannels = new Map<string, StabilizeChannel>();

  /** Put a player into the downed state and start their bleed-out timer. */
  downPlayer(playerId: string, playerName: string, roomId: string, killerIds?: string[]): DowningEvent {
    this.downedPlayers.set(playerId, {
      playerId,
      playerName,
      roomId,
      state: 'downed',
      bleedOutTicksRemaining: BLEED_OUT_TICKS,
      killerIds,
    });
    return {
      type: 'player_downed',
      playerId,
      playerName,
      roomId,
    };
  }

  /** Check if a player is currently downed (bleeding out or stabilized). */
  isPlayerDowned(playerId: string): boolean {
    return this.downedPlayers.has(playerId);
  }

  /** Get the downed player record, or undefined if not downed. */
  getDownedPlayer(playerId: string): DownedPlayer | undefined {
    return this.downedPlayers.get(playerId);
  }

  /** Get all currently downed players. */
  getAllDownedPlayers(): DownedPlayer[] {
    return [...this.downedPlayers.values()];
  }

  /**
   * Begin channeling stabilization on a downed player.
   * Returns an event or an error string if the action is invalid.
   */
  beginStabilize(
    stabilizerId: string,
    stabilizerName: string,
    targetId: string,
  ): DowningEvent | string {
    const target = this.downedPlayers.get(targetId);
    if (!target) return 'That player is not downed.';
    if (target.state === 'stabilized') return 'That player is already stabilized.';

    // Can't stabilize yourself
    if (stabilizerId === targetId) return 'You cannot stabilize yourself.';

    // Can't channel two stabilizations at once
    if (this.stabilizeChannels.has(stabilizerId)) {
      return 'You are already channeling a stabilization.';
    }

    this.stabilizeChannels.set(stabilizerId, {
      stabilizerId,
      targetId,
      ticksRemaining: STABILIZE_CHANNEL_TICKS,
    });

    return {
      type: 'stabilize_started',
      playerId: targetId,
      playerName: target.playerName,
      roomId: target.roomId,
      stabilizerId,
      stabilizerName,
    };
  }

  /**
   * Interrupt a stabilize channel (e.g., if the stabilizer takes damage or moves).
   * Returns an event if there was an active channel to interrupt.
   */
  interruptStabilize(stabilizerId: string, stabilizerName: string): DowningEvent | null {
    const channel = this.stabilizeChannels.get(stabilizerId);
    if (!channel) return null;

    this.stabilizeChannels.delete(stabilizerId);

    const target = this.downedPlayers.get(channel.targetId);
    if (!target) return null;

    return {
      type: 'stabilize_interrupted',
      playerId: channel.targetId,
      playerName: target.playerName,
      roomId: target.roomId,
      stabilizerId,
      stabilizerName,
    };
  }

  /** Apply a killing blow to a downed player. Removes them from downed state. */
  killingBlow(playerId: string): DowningEvent | null {
    const target = this.downedPlayers.get(playerId);
    if (!target) return null;

    this.downedPlayers.delete(playerId);
    // Also clean up any in-progress stabilize targeting this player
    for (const [sid, channel] of this.stabilizeChannels) {
      if (channel.targetId === playerId) {
        this.stabilizeChannels.delete(sid);
      }
    }

    return {
      type: 'killing_blow',
      playerId,
      playerName: target.playerName,
      roomId: target.roomId,
    };
  }

  /**
   * Tick the downing system. Called once per game tick.
   * Returns events generated this tick (bleed-outs, completed stabilizations).
   */
  tick(): DowningEvent[] {
    const events: DowningEvent[] = [];

    // 1. Advance stabilize channels
    for (const [stabilizerId, channel] of this.stabilizeChannels) {
      channel.ticksRemaining--;
      if (channel.ticksRemaining <= 0) {
        // Stabilization complete
        const target = this.downedPlayers.get(channel.targetId);
        if (target && target.state === 'downed') {
          target.state = 'stabilized';
          events.push({
            type: 'player_stabilized',
            playerId: channel.targetId,
            playerName: target.playerName,
            roomId: target.roomId,
            stabilizerId,
          });
        }
        this.stabilizeChannels.delete(stabilizerId);
      }
    }

    // 2. Decrement bleed-out timers for actively-bleeding players
    for (const [playerId, downed] of this.downedPlayers) {
      if (downed.state !== 'downed') continue; // Stabilized players don't bleed
      downed.bleedOutTicksRemaining--;
      if (downed.bleedOutTicksRemaining <= 0) {
        events.push({
          type: 'player_bleed_out',
          playerId,
          playerName: downed.playerName,
          roomId: downed.roomId,
        });
        this.downedPlayers.delete(playerId);
        // Clean up any stabilize channels targeting this player
        for (const [sid, channel] of this.stabilizeChannels) {
          if (channel.targetId === playerId) {
            this.stabilizeChannels.delete(sid);
          }
        }
      }
    }

    return events;
  }

  /** Remove a downed player entirely (e.g., on disconnect). */
  removePlayer(playerId: string): void {
    this.downedPlayers.delete(playerId);
    // Remove stabilize channels involving this player
    for (const [sid, channel] of this.stabilizeChannels) {
      if (channel.targetId === playerId || sid === playerId) {
        this.stabilizeChannels.delete(sid);
      }
    }
  }

  /** Check if a player is currently channeling a stabilization. */
  isChannelingStabilize(playerId: string): boolean {
    return this.stabilizeChannels.has(playerId);
  }

  /** Get the stabilize channel for a player, if any. */
  getStabilizeChannel(playerId: string): StabilizeChannel | undefined {
    return this.stabilizeChannels.get(playerId);
  }

  /** Clear all state (shard collapse). */
  clear(): void {
    this.downedPlayers.clear();
    this.stabilizeChannels.clear();
  }
}
