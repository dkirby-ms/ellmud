/**
 * Respawn target resolution — centralized fallback chain for death respawn.
 *
 * Chain: lastInn → faction hub → startingZoneSlug → The Refuge
 *
 * Used by both normal death and permadeath paths in ZoneRoom.
 */

import {
  getStrongholdSlugForFaction,
  resolveStartingZoneTarget,
  getStartingZoneDisplayName,
  DEFAULT_HUB_SLUG,
  HUB_DISPLAY_NAMES,
} from './stronghold.js';

export interface RespawnInput {
  lastInn: { zoneSlug: string; roomSlug: string } | null;
  factionSlug: string | undefined;
  startingZoneSlug: string | undefined;
}

export interface RespawnResult {
  target: string;
  roomSlug: string | undefined;
  displayName: string;
}

/**
 * Resolve where a player should respawn after death.
 *
 * Fallback chain:
 * 1. Last rented inn (if set)
 * 2. Faction stronghold (if player has a recognized faction)
 * 3. Starting zone (the zone chosen at character creation)
 * 4. The Refuge (universal fallback)
 */
export function resolveRespawnTarget(input: RespawnInput): RespawnResult {
  // 1. Last inn
  if (input.lastInn) {
    return {
      target: `zone:${input.lastInn.zoneSlug}`,
      roomSlug: input.lastInn.roomSlug,
      displayName: 'your rented room',
    };
  }

  // 2. Faction stronghold
  if (input.factionSlug) {
    const stronghold = getStrongholdSlugForFaction(input.factionSlug);
    if (stronghold) {
      return {
        target: `zone:${stronghold}`,
        roomSlug: undefined,
        displayName: HUB_DISPLAY_NAMES[stronghold] ?? 'The Refuge',
      };
    }
  }

  // 3. Starting zone
  if (input.startingZoneSlug) {
    const target = resolveStartingZoneTarget(input.startingZoneSlug);
    // resolveStartingZoneTarget falls back to Refuge for unrecognized slugs
    const isValid = target !== `zone:${DEFAULT_HUB_SLUG}`;
    if (isValid) {
      return {
        target,
        roomSlug: undefined,
        displayName: getStartingZoneDisplayName(input.startingZoneSlug),
      };
    }
  }

  // 4. The Refuge
  return {
    target: `zone:${DEFAULT_HUB_SLUG}`,
    roomSlug: undefined,
    displayName: 'The Refuge',
  };
}
