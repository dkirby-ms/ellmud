/**
 * Faction stronghold routing tests — Issue #236.
 *
 * Tests the stronghold resolution utilities and faction-based spawn routing.
 */
import { describe, it, expect } from 'vitest';
import {
  getStrongholdSlugForFaction,
  resolvePlayerHubSlug,
  resolvePlayerHubTarget,
  getStrongholdForFaction,
  DEFAULT_HUB_SLUG,
  FACTION_SLUGS,
  FACTION_STRONGHOLD_MAP,
} from '../zones/stronghold.js';
import { InMemoryZoneRepository } from '../zones/InMemoryZoneRepository.js';
import { InMemoryFactionRepository } from '../faction/FactionRepository.js';
import type { ZoneDefinition } from '../zones/ZoneRepository.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createStrongholdZone(
  repo: InMemoryZoneRepository,
  slug: string,
  factionSlug: string,
): Promise<ZoneDefinition> {
  return repo.createZone({
    slug,
    name: `Stronghold ${slug}`,
    description: `Stronghold for ${factionSlug}`,
    levelMin: 1,
    levelMax: 100,
    tier: 1,
    theme: 'flooded_crypt',
    entryRoomSlugs: [`${slug}-commons`],
    lifecycle: 'persistent',
    category: 'faction_hub',
    maxPlayers: 0,
    pvpEnabled: false,
    repopIntervalSeconds: 0,
    factionSlug,
  });
}

// ─── Static mapping tests ────────────────────────────────────────────────────

describe('getStrongholdSlugForFaction', () => {
  it.each(FACTION_SLUGS)('returns expected stronghold slug for %s', (slug) => {
    expect(getStrongholdSlugForFaction(slug)).toBe(FACTION_STRONGHOLD_MAP[slug]);
  });

  it('returns undefined for unknown faction', () => {
    expect(getStrongholdSlugForFaction('unknown')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getStrongholdSlugForFaction('')).toBeUndefined();
  });
});

describe('FACTION_SLUGS', () => {
  it('contains exactly 3 factions', () => {
    expect(FACTION_SLUGS).toHaveLength(3);
  });
});

// ─── Hub resolution tests ────────────────────────────────────────────────────

describe('resolvePlayerHubSlug', () => {
  it.each(FACTION_SLUGS)('returns stronghold slug for %s', (slug) => {
    expect(resolvePlayerHubSlug(slug)).toBe(FACTION_STRONGHOLD_MAP[slug]);
  });

  it('falls back to Refuge for unknown faction', () => {
    expect(resolvePlayerHubSlug('unknown')).toBe(DEFAULT_HUB_SLUG);
  });

  it('falls back to Refuge when faction is undefined', () => {
    expect(resolvePlayerHubSlug(undefined)).toBe(DEFAULT_HUB_SLUG);
  });
});

describe('resolvePlayerHubTarget', () => {
  it.each(FACTION_SLUGS)('returns zone: prefixed target for %s', (slug) => {
    expect(resolvePlayerHubTarget(slug)).toBe(`zone:${FACTION_STRONGHOLD_MAP[slug]}`);
  });

  it('returns zone:the-refuge for no faction', () => {
    expect(resolvePlayerHubTarget(undefined)).toBe(`zone:${DEFAULT_HUB_SLUG}`);
  });
});

// ─── Zone repository integration ─────────────────────────────────────────────

describe('getStrongholdForFaction', () => {
  it('returns stronghold zone data when zone exists', async () => {
    const repo = new InMemoryZoneRepository();
    await createStrongholdZone(repo, 'the-reliquary', 'kindari');

    const result = await getStrongholdForFaction('kindari', repo);
    expect(result.zoneSlug).toBe('the-reliquary');
    expect(result.zoneData).not.toBeNull();
    expect(result.zoneData!.zone.factionSlug).toBe('kindari');
    expect(result.zoneData!.zone.category).toBe('faction_hub');
  });

  it('falls back to Refuge when stronghold zone is not in DB', async () => {
    const repo = new InMemoryZoneRepository();
    // Create Refuge (debug hub) but no strongholds
    await repo.createZone({
      slug: 'the-refuge',
      name: 'The Refuge',
      description: 'Designer/debug hub',
      levelMin: 1,
      levelMax: 100,
      tier: 1,
      theme: 'flooded_crypt',
      entryRoomSlugs: ['hearth'],
      lifecycle: 'persistent',
      category: 'dev',
      maxPlayers: 0,
      pvpEnabled: false,
      repopIntervalSeconds: 0,
    });

    const result = await getStrongholdForFaction('kindari', repo);
    expect(result.zoneSlug).toBe('the-refuge');
    expect(result.zoneData).not.toBeNull();
    expect(result.zoneData!.zone.slug).toBe('the-refuge');
  });

  it('falls back to Refuge when faction slug is unknown', async () => {
    const repo = new InMemoryZoneRepository();
    await repo.createZone({
      slug: 'the-refuge',
      name: 'The Refuge',
      description: 'Designer/debug hub',
      levelMin: 1,
      levelMax: 100,
      tier: 1,
      theme: 'flooded_crypt',
      entryRoomSlugs: ['hearth'],
      lifecycle: 'persistent',
      category: 'dev',
      maxPlayers: 0,
      pvpEnabled: false,
      repopIntervalSeconds: 0,
    });

    const result = await getStrongholdForFaction('nonexistent', repo);
    expect(result.zoneSlug).toBe('the-refuge');
  });
});

// ─── InMemoryZoneRepository.getZoneByFactionSlug ─────────────────────────────

describe('InMemoryZoneRepository.getZoneByFactionSlug', () => {
  it('returns zone matching faction slug and category', async () => {
    const repo = new InMemoryZoneRepository();
    await createStrongholdZone(repo, 'the-reliquary', 'kindari');

    const result = await repo.getZoneByFactionSlug('kindari');
    expect(result).not.toBeNull();
    expect(result!.zone.slug).toBe('the-reliquary');
    expect(result!.zone.factionSlug).toBe('kindari');
  });

  it('returns null for unknown faction slug', async () => {
    const repo = new InMemoryZoneRepository();
    const result = await repo.getZoneByFactionSlug('unknown');
    expect(result).toBeNull();
  });

  it('does not match non-faction_hub zones with faction_slug', async () => {
    const repo = new InMemoryZoneRepository();
    // Create a dungeon zone with a faction_slug (shouldn't match)
    await repo.createZone({
      slug: 'some-dungeon',
      name: 'Some Dungeon',
      description: 'Not a hub',
      levelMin: 1,
      levelMax: 100,
      tier: 1,
      theme: 'flooded_crypt',
      entryRoomSlugs: ['entry'],
      lifecycle: 'persistent',
      category: 'dungeon',
      maxPlayers: 6,
      pvpEnabled: false,
      repopIntervalSeconds: 300,
      factionSlug: 'kindari',
    });

    const result = await repo.getZoneByFactionSlug('kindari');
    expect(result).toBeNull();
  });

  it('resolves all 3 faction strongholds independently', async () => {
    const repo = new InMemoryZoneRepository();
    for (const factionSlug of FACTION_SLUGS) {
      const zoneSlug = FACTION_STRONGHOLD_MAP[factionSlug];
      await createStrongholdZone(repo, zoneSlug, factionSlug);
    }

    for (const factionSlug of FACTION_SLUGS) {
      const result = await repo.getZoneByFactionSlug(factionSlug);
      expect(result!.zone.slug).toBe(FACTION_STRONGHOLD_MAP[factionSlug]);
    }
  });
});

// ─── FactionRepository.getPlayerFactionSlug ──────────────────────────────────

describe('InMemoryFactionRepository.getPlayerFactionSlug', () => {
  it('returns null when player has no faction', async () => {
    const repo = new InMemoryFactionRepository();
    const slug = await repo.getPlayerFactionSlug('player-1');
    expect(slug).toBeNull();
  });

  it('returns faction slug when registered', async () => {
    const repo = new InMemoryFactionRepository();
    const factionId = 'faction-uuid-1';
    repo.registerFaction(factionId, 'kindari');
    await repo.updateFaction('player-1', factionId, { reputation: 100, rank: 1 });

    const slug = await repo.getPlayerFactionSlug('player-1');
    expect(slug).toBe('kindari');
  });

  it('returns null when faction ID is not registered', async () => {
    const repo = new InMemoryFactionRepository();
    await repo.updateFaction('player-1', 'unknown-faction-id', { reputation: 100, rank: 1 });

    const slug = await repo.getPlayerFactionSlug('player-1');
    expect(slug).toBeNull();
  });
});
