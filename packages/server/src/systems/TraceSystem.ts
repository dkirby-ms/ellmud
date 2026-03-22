/**
 * TraceSystem — Ephemeral environmental traces in shard rooms.
 *
 * Traces are evidence left by player/creature actions: footprints, blood trails,
 * opened containers, corpses. They decay over time based on TTL and are
 * filtered by tracking skill when presented to players.
 *
 * Storage: Map<roomId, Trace[]> — shard-scoped, destroyed on shard collapse.
 * Tick: Called once per game tick to decay/expire traces.
 *
 * GDD §11.2 — Trace System
 */

import {
  type Trace,
  type TraceType,
  TRACE_TTLS,
  TRACKING_THRESHOLDS,
  STEALTH_FOOTPRINT_THRESHOLD,
  BLOOD_TRAIL_DAMAGE_THRESHOLD,
} from '@ellmud/shared';

let nextTraceId = 0;

export interface TraceDescription {
  text: string;
  type: TraceType;
  direction?: string;
}

export interface PlayerSkills {
  tracking?: number;
  stealth?: number;
}

export class TraceSystem {
  private traces = new Map<string, Trace[]>();

  /** Add a trace to a room. Returns the created trace (or null if suppressed by stealth). */
  addTrace(
    roomId: string,
    traceType: TraceType,
    metadata: Trace['metadata'] = {},
    direction?: string,
  ): Trace | null {
    // Stealth suppression: high stealth = no footprints
    if (traceType === 'footprint' && (metadata.stealthModifier ?? 0) >= STEALTH_FOOTPRINT_THRESHOLD) {
      return null;
    }

    // Blood trail suppression: low damage = no blood
    if (traceType === 'blood_trail' && (metadata.severity ?? 0) < BLOOD_TRAIL_DAMAGE_THRESHOLD) {
      return null;
    }

    const trace: Trace = {
      id: `trace-${nextTraceId++}`,
      type: traceType,
      roomId,
      createdAt: Date.now(),
      ttl: TRACE_TTLS[traceType],
      direction,
      metadata,
    };

    const roomTraces = this.traces.get(roomId);
    if (roomTraces) {
      roomTraces.push(trace);
    } else {
      this.traces.set(roomId, [trace]);
    }

    return trace;
  }

  /** Get all active (non-expired) traces in a room. */
  getTracesInRoom(roomId: string): Trace[] {
    const roomTraces = this.traces.get(roomId);
    if (!roomTraces) return [];

    const now = Date.now();
    return roomTraces.filter(t => this.isAlive(t, now));
  }

  /** Get traces formatted for a player's skill level. */
  getTracesForPlayer(roomId: string, skills: PlayerSkills = {}): TraceDescription[] {
    const tracking = skills.tracking ?? 0;

    if (tracking < TRACKING_THRESHOLDS.BASIC) {
      return [];
    }

    const traces = this.getTracesInRoom(roomId);
    return traces.map(trace => this.describeTrace(trace, tracking));
  }

  /** Decay/expire traces. Call once per tick. deltaMs is milliseconds since last tick. */
  tick(_deltaMs: number): void {
    const now = Date.now();

    for (const [roomId, roomTraces] of this.traces) {
      const alive = roomTraces.filter(t => this.isAlive(t, now));
      if (alive.length === 0) {
        this.traces.delete(roomId);
      } else {
        this.traces.set(roomId, alive);
      }
    }
  }

  /** Total active traces across all rooms. */
  get totalTraceCount(): number {
    let count = 0;
    const now = Date.now();
    for (const roomTraces of this.traces.values()) {
      count += roomTraces.filter(t => this.isAlive(t, now)).length;
    }
    return count;
  }

  /** Clear all traces. Used on shard collapse. */
  clear(): void {
    this.traces.clear();
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private isAlive(trace: Trace, now: number): boolean {
    if (trace.ttl === Infinity) return true;
    return (now - trace.createdAt) < trace.ttl * 1000;
  }

  private describeTrace(trace: Trace, trackingSkill: number): TraceDescription {
    const ageSeconds = Math.floor((Date.now() - trace.createdAt) / 1000);
    const directionPhrase = trace.direction ? ` leading ${trace.direction}` : '';

    if (trackingSkill >= TRACKING_THRESHOLDS.EXPERT) {
      return this.describeExpert(trace, ageSeconds, directionPhrase);
    }
    if (trackingSkill >= TRACKING_THRESHOLDS.DETAILED) {
      return this.describeDetailed(trace, ageSeconds, directionPhrase);
    }
    return this.describeBasic(trace, directionPhrase);
  }

  private describeBasic(trace: Trace, directionPhrase: string): TraceDescription {
    const text = BASIC_DESCRIPTIONS[trace.type]?.(directionPhrase) ?? `Traces linger here${directionPhrase}.`;
    return { text, type: trace.type, direction: trace.direction };
  }

  private describeDetailed(trace: Trace, ageSeconds: number, directionPhrase: string): TraceDescription {
    const ageProse = this.ageToPhrase(ageSeconds);
    const text = DETAILED_DESCRIPTIONS[trace.type]?.(directionPhrase, ageProse, trace) ??
      `${ageProse} traces${directionPhrase}.`;
    return { text, type: trace.type, direction: trace.direction };
  }

  private describeExpert(trace: Trace, ageSeconds: number, directionPhrase: string): TraceDescription {
    const ageProse = this.ageToExactPhrase(ageSeconds);
    const text = EXPERT_DESCRIPTIONS[trace.type]?.(directionPhrase, ageProse, trace) ??
      `Traces (${ageProse})${directionPhrase}.`;
    return { text, type: trace.type, direction: trace.direction };
  }

  private ageToPhrase(seconds: number): string {
    if (seconds < 30) return 'Fresh';
    if (seconds < 120) return 'Recent';
    if (seconds < 300) return 'Fading';
    return 'Old';
  }

  private ageToExactPhrase(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds old`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} old`;
  }
}

// ─── Description Templates ──────────────────────────────────────────────────

type DescFn = (dir: string, age?: string, trace?: Trace) => string;

const BASIC_DESCRIPTIONS: Record<TraceType, DescFn> = {
  footprint: (dir) => `Footprints${dir}.`,
  blood_trail: (dir) => `A trail of blood${dir}.`,
  opened_container: () => 'A container has been opened here.',
  broken_door: () => 'A door has been forced open.',
  corpse: () => 'A corpse lies here.',
  discarded_item: () => 'Something has been discarded here.',
  residue: () => 'Strange residue clings to the surfaces.',
};

const DETAILED_DESCRIPTIONS: Record<TraceType, DescFn> = {
  footprint: (dir, age) => `${age} boot prints, heavy-shod${dir}.`,
  blood_trail: (dir, age, t) => {
    const severity = t?.metadata.severity ?? 0;
    const amount = severity > 20 ? 'copious' : severity > 10 ? 'moderate' : 'light';
    return `${age} ${amount} bloodstains${dir}.`;
  },
  opened_container: (_dir, age) => `A container was recently forced open. ${age} marks on the lock.`,
  broken_door: (_dir, age) => `A door lies splintered. ${age} damage.`,
  corpse: () => 'A body lies crumpled here, still warm.',
  discarded_item: () => 'Something was hastily dropped here.',
  residue: (_dir, age) => `${age} alchemical residue stains the ground.`,
};

const EXPERT_DESCRIPTIONS: Record<TraceType, DescFn> = {
  footprint: (dir, age, t) => {
    const actor = t?.metadata.actorName ?? 'an unknown figure';
    return `Fresh boots, heavy-shod — ${actor} passed through here (${age})${dir}.`;
  },
  blood_trail: (dir, age, t) => {
    const severity = t?.metadata.severity ?? 0;
    return `Blood trail (severity ${severity}, ${age})${dir}. The wounded moved with urgency.`;
  },
  opened_container: (_dir, age, t) => {
    const actor = t?.metadata.actorName ?? 'Someone';
    return `${actor} opened this container (${age}). Tool marks suggest practiced hands.`;
  },
  broken_door: (_dir, age) => `Door forced with considerable strength (${age}). Splinters indicate a single blow.`,
  corpse: (_dir, age, t) => {
    const actor = t?.metadata.actorName ?? 'A fallen figure';
    return `${actor} lies dead here (${age}). The wounds tell the story.`;
  },
  discarded_item: (_dir, age) => `An item was dropped in haste (${age}).`,
  residue: (_dir, age) => `Alchemical residue — volatile compound, ${age}. Handle with care.`,
};

/** Reset the ID counter for deterministic tests. */
export function resetTraceIdCounter(): void {
  nextTraceId = 0;
}
