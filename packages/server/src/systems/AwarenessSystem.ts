/**
 * AwarenessSystem — Stealth-vs-awareness detection for player encounters (GDD §8.1).
 *
 * Pure game logic. No Colyseus dependency.
 * ZoneRoom calls checkRoomEntry() on player movement and delivers results to clients.
 *
 * Detection formula: score = awareness - stealth
 *   score <= 0  → 'none'    (target invisible)
 *   score 1–4   → 'vague'   ("A shadow shifts")
 *   score >= 5   → 'full'    (equipment-based description)
 *
 * Player names are NEVER revealed — descriptions use equipment only.
 */

import {
  type DetectionTier,
  type AwarenessEvent,
  type VisibleEquipment,
  DETECTION_THRESHOLDS,
  STEALTH_FOOTPRINT_THRESHOLD,
} from '@ellmud/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Skills relevant to awareness checks. */
export interface AwarenessSkills {
  awareness?: number;
  stealth?: number;
}

/** A player in the room for awareness checking. */
export interface AwarenessPlayer {
  sessionId: string;
  skills: AwarenessSkills;
  equipment?: VisibleEquipment;
}

// ─── Vague Detection Flavor Text ─────────────────────────────────────────────

const VAGUE_ARRIVAL_MESSAGES = [
  'A shadow shifts at the edge of your vision.',
  'You sense a presence nearby.',
  'The air stirs — you are not alone.',
  'Something moves in the periphery.',
  'A faint disturbance ripples through the stillness.',
];

const VAGUE_DEPARTURE_MESSAGES = [
  'A presence fades from the room.',
  'The air settles — something has moved on.',
  'A shadow withdraws into the dark.',
  'You sense a departure, though you saw nothing.',
];

// ─── AwarenessSystem ─────────────────────────────────────────────────────────

export class AwarenessSystem {
  /**
   * Calculate detection tier from viewer's awareness vs target's stealth.
   */
  calculateDetectionTier(awareness: number, stealth: number): DetectionTier {
    const score = awareness - stealth;
    if (score <= DETECTION_THRESHOLDS.NONE_UPPER) return 'none';
    if (score <= DETECTION_THRESHOLDS.VAGUE_UPPER) return 'vague';
    return 'full';
  }

  /**
   * Generate an equipment-based description for full detection.
   * Never includes player names — only visible gear.
   */
  generateEquipmentDescription(equipment?: VisibleEquipment): string {
    const parts: string[] = [];

    if (equipment?.armour) {
      const tierAdj = equipment.tier ? `${equipment.tier} ` : '';
      parts.push(`clad in ${tierAdj}${equipment.armour}`);
    }

    if (equipment?.weapon) {
      parts.push(`bearing a ${equipment.weapon}`);
    }

    if (parts.length === 0) {
      return 'an unequipped figure';
    }

    return `a figure ${parts.join(', ')}`;
  }

  /**
   * Generate detection message text for a given tier and direction.
   */
  generateDetectionMessage(
    tier: DetectionTier,
    direction: 'arrival' | 'departure',
    equipment?: VisibleEquipment,
  ): string {
    if (tier === 'none') return '';

    if (tier === 'vague') {
      const pool = direction === 'arrival' ? VAGUE_ARRIVAL_MESSAGES : VAGUE_DEPARTURE_MESSAGES;
      return pool[Math.floor(Math.random() * pool.length)]!;
    }

    // Full detection — equipment-based description
    const desc = this.generateEquipmentDescription(equipment);
    if (direction === 'arrival') {
      return `${capitalize(desc)} enters the area.`;
    }
    return `${capitalize(desc)} slips away.`;
  }

  /**
   * Run awareness checks when a player enters a room.
   * Returns AwarenessEvents for each observer in the room.
   *
   * @param enteringPlayer - The player who just moved into the room
   * @param observers - Other players already in the destination room
   * @param direction - 'arrival' or 'departure'
   */
  checkRoomEntry(
    enteringPlayer: AwarenessPlayer,
    observers: AwarenessPlayer[],
    direction: 'arrival' | 'departure' = 'arrival',
  ): AwarenessEvent[] {
    const events: AwarenessEvent[] = [];

    for (const observer of observers) {
      // Skip self
      if (observer.sessionId === enteringPlayer.sessionId) continue;

      const awareness = observer.skills.awareness ?? 0;
      const stealth = enteringPlayer.skills.stealth ?? 0;
      const tier = this.calculateDetectionTier(awareness, stealth);

      const message = this.generateDetectionMessage(
        tier,
        direction,
        enteringPlayer.equipment,
      );

      events.push({
        observerId: observer.sessionId,
        targetId: enteringPlayer.sessionId,
        tier,
        message,
        direction,
      });
    }

    return events;
  }

  /**
   * Whether a player's stealth is high enough to suppress footprint traces.
   * Reuses the shared STEALTH_FOOTPRINT_THRESHOLD constant.
   */
  suppressesFootprints(stealth: number): boolean {
    return stealth >= STEALTH_FOOTPRINT_THRESHOLD;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
