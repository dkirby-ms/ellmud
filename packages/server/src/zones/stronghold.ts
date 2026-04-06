/**
 * Faction stronghold routing — maps faction membership and starting zones to hub zone slugs.
 *
 * Used for login spawning and death respawn:
 * - Characters with a starting zone spawn at that zone's stronghold
 * - Players with a faction spawn in their faction's stronghold
 * - Players without a faction fall back to the Refuge (designer/debug hub)
 */

import type { ZoneRepository } from './ZoneRepository.js';

/** Well-known faction slugs (from 002_seed_content.sql). */
export const FACTION_SLUGS = ['kindari', 'bloom-tenders', 'krewe-calliope'] as const;
export type FactionSlug = (typeof FACTION_SLUGS)[number];

/** Valid starting zones (the three faction strongholds). */
export const VALID_STARTING_ZONES = ['the-reliquary', 'the-bloom-observatory', 'the-carrion-court'] as const;
export type StartingZoneSlug = (typeof VALID_STARTING_ZONES)[number];

/** Static mapping from faction slug → stronghold zone slug. */
export const FACTION_STRONGHOLD_MAP: Record<FactionSlug, string> = {
  kindari: 'the-reliquary',
  'bloom-tenders': 'the-bloom-observatory',
  'krewe-calliope': 'the-carrion-court',
};

/** Fallback zone slug when player has no faction (designer/debug hub). */
export const DEFAULT_HUB_SLUG = 'the-refuge';

/** Display names for hub zones (used in death narration and starting zone display). */
export const HUB_DISPLAY_NAMES: Record<string, string> = {
  'the-reliquary': 'The Reliquary',
  'the-bloom-observatory': 'The Bloom Observatory',
  'the-carrion-court': 'The Carrion Court',
  'the-refuge': 'The Refuge',
};

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
 * Resolve the Colyseus room target string (e.g. 'zone:the-reliquary') for a
 * player's faction. Used in ROOM_SWITCH messages on death/login.
 */
export function resolvePlayerHubTarget(factionSlug: string | undefined): string {
  return `zone:${resolvePlayerHubSlug(factionSlug)}`;
}

/**
 * Resolve the display name for a player's hub zone (e.g. 'The Reliquary').
 * Used in death narration to tell the player where they're respawning.
 */
export function resolvePlayerHubName(factionSlug: string | undefined): string {
  const slug = resolvePlayerHubSlug(factionSlug);
  return HUB_DISPLAY_NAMES[slug] ?? 'The Refuge';
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

/**
 * Resolve the Colyseus room target string for a starting zone slug.
 * Starting zones are the faction strongholds, so this is a direct mapping.
 * Falls back to the Refuge if the slug is unrecognised.
 */
export function resolveStartingZoneTarget(startingZoneSlug: string): string {
  const validSlugs: readonly string[] = VALID_STARTING_ZONES;
  if (validSlugs.includes(startingZoneSlug)) {
    return `zone:${startingZoneSlug}`;
  }
  return `zone:${DEFAULT_HUB_SLUG}`;
}

/**
 * Get the display name for a starting zone slug.
 */
export function getStartingZoneDisplayName(startingZoneSlug: string): string {
  return HUB_DISPLAY_NAMES[startingZoneSlug] ?? startingZoneSlug;
}
