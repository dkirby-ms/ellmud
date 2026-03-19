/**
 * ExtractionSystem — channeled escape mechanic for shards.
 *
 * Extraction is a multi-tick channel that transports a player from a shard
 * back to the Refuge. The channel can be interrupted by damage or hostile
 * actions. While channeling, movement and combat commands are locked.
 *
 * Generates noise level 8 (sustained) per GDD §12.2 — recorded as a noise
 * event for the future trace system.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExtractionChannel {
  playerId: string;
  roomId: string;
  ticksRemaining: number;
  totalTicks: number;
  startedAt: number;
}

export interface ExtractionStartResult {
  success: boolean;
  narration: string;
}

export interface ExtractionTickResult {
  playerId: string;
  completed: boolean;
  interrupted: boolean;
  narration: string;
  noiseEvent?: NoiseEvent;
}

export interface NoiseEvent {
  type: 'extraction';
  noiseLevel: number;
  roomId: string;
  playerId: string;
  sustained: boolean;
}

const EXTRACTION_NOISE_LEVEL = 8;

// ─── Blocked / Passive Commands ─────────────────────────────────────────────

/** Commands blocked while extracting (movement + combat). */
const BLOCKED_COMMANDS = new Set<string>([
  'go', 'attack', 'strike', 'dodge', 'flee',
]);

/** Commands allowed while extracting (passive / informational). */
const PASSIVE_COMMANDS = new Set<string>([
  'look', 'inventory', 'take', 'drop',
]);

// ─── ExtractionSystem ───────────────────────────────────────────────────────

export class ExtractionSystem {
  private channels = new Map<string, ExtractionChannel>();
  private channelDurationTicks: number;

  constructor(channelDurationTicks = 5) {
    this.channelDurationTicks = channelDurationTicks;
  }

  /**
   * Begin an extraction channel for a player.
   * Player must be in an extraction-type room and not already extracting.
   */
  startExtraction(playerId: string, roomId: string, roomType?: string): ExtractionStartResult {
    if (this.channels.has(playerId)) {
      return {
        success: false,
        narration: 'You are already channeling extraction.',
      };
    }

    if (roomType !== 'extraction') {
      return {
        success: false,
        narration: 'There is no extraction point here. You must find an extraction chamber.',
      };
    }

    const channel: ExtractionChannel = {
      playerId,
      roomId,
      ticksRemaining: this.channelDurationTicks,
      totalTicks: this.channelDurationTicks,
      startedAt: Date.now(),
    };

    this.channels.set(playerId, channel);

    return {
      success: true,
      narration: `You begin the extraction ritual. The air crackles with energy... (${this.channelDurationTicks} ticks remaining)`,
    };
  }

  /**
   * Advance an active extraction channel by one tick.
   * Returns tick result with completion status and narration.
   */
  tickExtraction(playerId: string): ExtractionTickResult | null {
    const channel = this.channels.get(playerId);
    if (!channel) return null;

    channel.ticksRemaining--;

    const noiseEvent: NoiseEvent = {
      type: 'extraction',
      noiseLevel: EXTRACTION_NOISE_LEVEL,
      roomId: channel.roomId,
      playerId,
      sustained: true,
    };

    if (channel.ticksRemaining <= 0) {
      // Channel complete — extraction succeeds
      this.channels.delete(playerId);
      return {
        playerId,
        completed: true,
        interrupted: false,
        narration: 'The portal blazes open. Reality tears apart and reforms around you — you tumble into the safety of the Refuge.',
        noiseEvent,
      };
    }

    // Channel in progress
    const progressNarrations = [
      `The portal stabilises... (${channel.ticksRemaining} ticks remaining)`,
      `Energy coalesces around you... (${channel.ticksRemaining} ticks remaining)`,
      `The runes beneath your feet burn brighter... (${channel.ticksRemaining} ticks remaining)`,
      `Reality thins. You can almost see the Refuge... (${channel.ticksRemaining} ticks remaining)`,
    ];
    const index = Math.min(
      channel.totalTicks - channel.ticksRemaining - 1,
      progressNarrations.length - 1,
    );

    return {
      playerId,
      completed: false,
      interrupted: false,
      narration: progressNarrations[index]!,
      noiseEvent,
    };
  }

  /**
   * Interrupt an active extraction channel.
   * Called when the player takes damage, is attacked, or the shard collapses.
   */
  interruptExtraction(playerId: string, reason: string): string | null {
    const channel = this.channels.get(playerId);
    if (!channel) return null;

    this.channels.delete(playerId);
    return `The extraction ritual shatters — ${reason}. You remain in the shard.`;
  }

  /** Check if a player is currently channeling extraction. */
  isExtracting(playerId: string): boolean {
    return this.channels.has(playerId);
  }

  /** Get all player IDs with active extraction channels. */
  getActiveExtractions(): string[] {
    return Array.from(this.channels.keys());
  }

  /** Get the channel state for a player (for testing / inspection). */
  getChannel(playerId: string): ExtractionChannel | undefined {
    return this.channels.get(playerId);
  }

  /**
   * Check if a command is blocked by an active extraction channel.
   * Returns a narration string if blocked, or null if allowed.
   */
  static checkCommandLock(verb: string, playerId: string, system: ExtractionSystem): string | null {
    if (!system.isExtracting(playerId)) return null;

    if (BLOCKED_COMMANDS.has(verb)) {
      if (verb === 'go') {
        return 'You cannot move while channeling extraction. The ritual demands stillness.';
      }
      return 'You cannot fight while channeling extraction. Break the channel first.';
    }

    // Passive commands are allowed
    return null;
  }

  /** Interrupt all active extractions (e.g., on shard collapse). */
  interruptAll(reason: string): Array<{ playerId: string; narration: string }> {
    const results: Array<{ playerId: string; narration: string }> = [];
    for (const playerId of this.channels.keys()) {
      const narration = this.interruptExtraction(playerId, reason);
      if (narration) {
        results.push({ playerId, narration });
      }
    }
    return results;
  }
}
