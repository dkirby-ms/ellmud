/**
 * Faction stronghold routing — maps faction membership to hub zone slugs.
 *
 * Used for login spawning and death respawn:
 * - Players with a faction spawn in their faction's stronghold
 * - Players without a faction fall back to the Refuge
 */

import type { ZoneRepository } from './ZoneRepository.js';

/** Well-known faction slugs (from 002_seed_content.sql). */
export const FACTION_SLUGS = ['ironwright', 'veil', 'scarlet'] as const;
export type FactionSlug = (typeof FACTION_SLUGS)[number];

/** Static mapping from faction slug → stronghold zone slug. */
const FACTION_STRONGHOLD_MAP: Record<FactionSlug, string> = {
  ironwright: 'the-foundry',
  veil: 'the-cartographium',
  scarlet: 'the-counting-house',
};

/** Fallback zone slug when player has no faction. */
export const DEFAULT_HUB_SLUG = 'the-refuge';

/**
 * Get the stronghold zone slug for a given faction slug.
 * Returns undefined if the faction slug is not recognized.
 */
export function getStrongholdSlugForFaction(factionSlug: string): string | undefined {
  return FACTION_STRONGHOLD_MAP[factionSlug as FactionSlug];
}

/**
 * Resolve the hub zone slug a player should spawn in.
 * If the player has a faction with a known stronghold, returns that.
 * Otherwise falls back to the Refuge.
 */
export function resolvePlayerHubSlug(factionSlug: string | undefined): string {
  if (factionSlug) {
    const stronghold = getStrongholdSlugForFaction(factionSlug);
    if (stronghold) return stronghold;
  }
  return DEFAULT_HUB_SLUG;
}

/**
 * Resolve the Colyseus room target string (e.g. 'zone:the-foundry') for a
 * player's faction. Used in ROOM_SWITCH messages on death/login.
 */
export function resolvePlayerHubTarget(factionSlug: string | undefined): string {
  return `zone:${resolvePlayerHubSlug(factionSlug)}`;
}

/**
 * Load the full zone data for a faction's stronghold from the zone repository.
 * Falls back to the Refuge if the faction stronghold is not found.
 */
export async function getStrongholdForFaction(
  factionSlug: string,
  zoneRepo: ZoneRepository,
): Promise<{ zoneSlug: string; zoneData: import('./ZoneRepository.js').ZoneData | null }> {
  const strongholdSlug = getStrongholdSlugForFaction(factionSlug);
  if (strongholdSlug) {
    const data = await zoneRepo.getZoneBySlug(strongholdSlug);
    if (data) return { zoneSlug: strongholdSlug, zoneData: data };
  }
  // Fallback to Refuge
  const refugeData = await zoneRepo.getZoneBySlug(DEFAULT_HUB_SLUG);
  return { zoneSlug: DEFAULT_HUB_SLUG, zoneData: refugeData };
}
