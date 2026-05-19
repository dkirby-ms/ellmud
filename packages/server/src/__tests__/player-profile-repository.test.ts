/**
 * PlayerProfileRepository persistence tests — Issue #199.
 *
 * Contract tests for PlayerProfileRepository that validate behavior regardless
 * of implementation (in-memory or PostgreSQL). Covers save/load round-trip,
 * upsert semantics, player isolation, skill progression, and edge cases.
 *
 * Also tests the provider wiring (DATABASE_URL gating) and validates
 * that InMemoryPlayerProfileRepository satisfies the interface contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  InMemoryPlayerProfileRepository,
  DEFAULT_PROFILE,
  initProfileProvider,
  getProfileRepository,
  isProfilePg,
  resetProfileProvider,
} from '../player/index.js';
import type { PlayerProfileRepository, PlayerProfile } from '../player/index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const PLAYER_A = 'player-aaa';
const PLAYER_B = 'player-bbb';
const PLAYER_C = 'player-ccc';

function characterIdFor(playerId: string): string {
  return `${playerId}-character`;
}

function makeProfile(
  overrides?: Partial<PlayerProfile>,
): PlayerProfile {
  return {
    skills: overrides?.skills ?? { ...DEFAULT_PROFILE.skills },
    maxCarryWeight: overrides?.maxCarryWeight ?? DEFAULT_PROFILE.maxCarryWeight,
    equipment: overrides?.equipment,
  };
}

function makeVeteranProfile(): PlayerProfile {
  return makeProfile({
    skills: { stealth: 25, awareness: 30, tracking: 15 },
    maxCarryWeight: 50,
    equipment: { weapon: 'shadow-blade', armour: 'mithral-mail', tier: 'rare' },
  });
}

// ─── Contract Tests ─────────────────────────────────────────────────────────

function playerProfileRepositoryContractTests(
  createRepo: () => PlayerProfileRepository,
) {
  let repo: PlayerProfileRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  async function saveProfile(playerId: string, profile: PlayerProfile): Promise<void> {
    await repo.save(playerId, characterIdFor(playerId), profile);
  }

  async function loadProfile(playerId: string): Promise<PlayerProfile | null> {
    return repo.load(playerId, characterIdFor(playerId));
  }

  // ── Save / Load Round-Trip ──

  describe('save and load', () => {
    it('save() then load() returns the same data', async () => {
      const profile = makeProfile();
      await saveProfile(PLAYER_A, profile);

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded).not.toBeNull();
      expect(loaded!.skills.stealth).toBe(DEFAULT_PROFILE.skills.stealth);
      expect(loaded!.skills.awareness).toBe(DEFAULT_PROFILE.skills.awareness);
      expect(loaded!.maxCarryWeight).toBe(DEFAULT_PROFILE.maxCarryWeight);
    });

    it('load() for unknown player returns null', async () => {
      const loaded = await loadProfile('ghost-player');
      expect(loaded).toBeNull();
    });

    it('load() for empty string returns null', async () => {
      const loaded = await loadProfile('');
      expect(loaded).toBeNull();
    });

    it('save() preserves optional equipment', async () => {
      const profile = makeProfile({
        equipment: { weapon: 'rusty-sword', armour: 'leather-vest', tier: 'common' },
      });
      await saveProfile(PLAYER_A, profile);

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.equipment).toBeDefined();
      expect(loaded!.equipment!.weapon).toBe('rusty-sword');
      expect(loaded!.equipment!.armour).toBe('leather-vest');
      expect(loaded!.equipment!.tier).toBe('common');
    });

    it('save() preserves undefined equipment (no equipment)', async () => {
      const profile = makeProfile();
      await saveProfile(PLAYER_A, profile);

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.equipment).toBeUndefined();
    });

    it('save() preserves optional tracking skill', async () => {
      const profile = makeProfile({
        skills: { stealth: 10, awareness: 10, tracking: 7 },
      });
      await saveProfile(PLAYER_A, profile);

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.skills.tracking).toBe(7);
    });

    it('save() preserves absence of optional tracking skill', async () => {
      const profile = makeProfile({
        skills: { stealth: 10, awareness: 10 },
      });
      await saveProfile(PLAYER_A, profile);

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.skills.tracking).toBeUndefined();
    });
  });

  // ── Upsert Semantics ──

  describe('upsert (save overwrites existing)', () => {
    it('second save() overwrites skills', async () => {
      await saveProfile(PLAYER_A, makeProfile({ skills: { stealth: 5, awareness: 5 } }));
      await saveProfile(PLAYER_A, makeProfile({ skills: { stealth: 20, awareness: 15 } }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.skills.stealth).toBe(20);
      expect(loaded!.skills.awareness).toBe(15);
    });

    it('second save() overwrites maxCarryWeight', async () => {
      await saveProfile(PLAYER_A, makeProfile({ maxCarryWeight: 20 }));
      await saveProfile(PLAYER_A, makeProfile({ maxCarryWeight: 50 }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.maxCarryWeight).toBe(50);
    });

    it('second save() overwrites equipment', async () => {
      await saveProfile(PLAYER_A, makeProfile({
        equipment: { weapon: 'rusty-sword' },
      }));
      await saveProfile(PLAYER_A, makeProfile({
        equipment: { weapon: 'shadow-blade', armour: 'plate-mail' },
      }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.equipment!.weapon).toBe('shadow-blade');
      expect(loaded!.equipment!.armour).toBe('plate-mail');
    });

    it('second save() can remove equipment by saving undefined', async () => {
      await saveProfile(PLAYER_A, makeProfile({
        equipment: { weapon: 'rusty-sword' },
      }));
      await saveProfile(PLAYER_A, makeProfile()); // no equipment

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.equipment).toBeUndefined();
    });
  });

  // ── Player Isolation ──

  describe('player isolation', () => {
    it('profiles are completely isolated between players', async () => {
      await saveProfile(PLAYER_A, makeProfile({ skills: { stealth: 10, awareness: 5 } }));
      await saveProfile(PLAYER_B, makeProfile({ skills: { stealth: 3, awareness: 20 } }));

      const loadedA = await loadProfile(PLAYER_A);
      const loadedB = await loadProfile(PLAYER_B);
      expect(loadedA!.skills.stealth).toBe(10);
      expect(loadedB!.skills.stealth).toBe(3);
    });

    it('saving one player does not affect another', async () => {
      await saveProfile(PLAYER_A, makeVeteranProfile());
      await saveProfile(PLAYER_B, makeProfile());

      // Overwrite A, check B unaffected
      await saveProfile(PLAYER_A, makeProfile({ skills: { stealth: 1, awareness: 1 } }));

      const loadedB = await loadProfile(PLAYER_B);
      expect(loadedB!.skills.stealth).toBe(DEFAULT_PROFILE.skills.stealth);
      expect(loadedB!.maxCarryWeight).toBe(DEFAULT_PROFILE.maxCarryWeight);
    });

    it('three players all have independent profiles', async () => {
      await saveProfile(PLAYER_A, makeProfile({ maxCarryWeight: 10 }));
      await saveProfile(PLAYER_B, makeProfile({ maxCarryWeight: 30 }));
      await saveProfile(PLAYER_C, makeProfile({ maxCarryWeight: 50 }));

      expect((await loadProfile(PLAYER_A))!.maxCarryWeight).toBe(10);
      expect((await loadProfile(PLAYER_B))!.maxCarryWeight).toBe(30);
      expect((await loadProfile(PLAYER_C))!.maxCarryWeight).toBe(50);
    });
  });

  // ── Skill Progression (values changing over time) ──

  describe('skill progression', () => {
    it('preserves incremented skill values across saves', async () => {
      await saveProfile(PLAYER_A, makeProfile());

      await saveProfile(PLAYER_A, makeProfile({
        skills: { stealth: 8, awareness: 5 },
      }));

      await saveProfile(PLAYER_A, makeProfile({
        skills: { stealth: 8, awareness: 12 },
      }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.skills.stealth).toBe(8);
      expect(loaded!.skills.awareness).toBe(12);
    });

    it('preserves tracking skill appearing mid-progression', async () => {
      await saveProfile(PLAYER_A, makeProfile({
        skills: { stealth: 10, awareness: 10 },
      }));

      await saveProfile(PLAYER_A, makeProfile({
        skills: { stealth: 10, awareness: 10, tracking: 3 },
      }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.skills.tracking).toBe(3);
    });

    it('preserves carry weight upgrades', async () => {
      await saveProfile(PLAYER_A, makeProfile({ maxCarryWeight: 20 }));
      await saveProfile(PLAYER_A, makeProfile({ maxCarryWeight: 35 }));
      await saveProfile(PLAYER_A, makeProfile({ maxCarryWeight: 50 }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.maxCarryWeight).toBe(50);
    });

    it('equipment upgrades are preserved', async () => {
      await saveProfile(PLAYER_A, makeProfile());

      await saveProfile(PLAYER_A, makeProfile({
        equipment: { weapon: 'rusty-sword' },
      }));

      await saveProfile(PLAYER_A, makeProfile({
        equipment: { weapon: 'rusty-sword', armour: 'leather-vest' },
      }));

      await saveProfile(PLAYER_A, makeProfile({
        equipment: { weapon: 'shadow-blade', armour: 'leather-vest', tier: 'rare' },
      }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.equipment!.weapon).toBe('shadow-blade');
      expect(loaded!.equipment!.armour).toBe('leather-vest');
      expect(loaded!.equipment!.tier).toBe('rare');
    });
  });

  // ── Edge Cases ──

  describe('edge cases', () => {
    it('handles zero-value skills', async () => {
      await saveProfile(PLAYER_A, makeProfile({
        skills: { stealth: 0, awareness: 0 },
      }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.skills.stealth).toBe(0);
      expect(loaded!.skills.awareness).toBe(0);
    });

    it('handles very high skill values', async () => {
      await saveProfile(PLAYER_A, makeProfile({
        skills: { stealth: 999, awareness: 999, tracking: 999 },
      }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.skills.stealth).toBe(999);
      expect(loaded!.skills.awareness).toBe(999);
      expect(loaded!.skills.tracking).toBe(999);
    });

    it('handles zero maxCarryWeight', async () => {
      await saveProfile(PLAYER_A, makeProfile({ maxCarryWeight: 0 }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.maxCarryWeight).toBe(0);
    });

    it('handles equipment with only partial fields', async () => {
      await saveProfile(PLAYER_A, makeProfile({
        equipment: { weapon: 'dagger' },
      }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.equipment!.weapon).toBe('dagger');
      expect(loaded!.equipment!.armour).toBeUndefined();
      expect(loaded!.equipment!.tier).toBeUndefined();
    });

    it('handles empty equipment object', async () => {
      await saveProfile(PLAYER_A, makeProfile({
        equipment: {},
      }));

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.equipment).toBeDefined();
    });

    it('handles many players saved concurrently', async () => {
      const profileCount = 50;
      const saves = Array.from({ length: profileCount }, (_, i) =>
        saveProfile(`player-${i}`, makeProfile({ maxCarryWeight: i * 10 })),
      );

      await Promise.all(saves);

      const loaded0 = await loadProfile('player-0');
      expect(loaded0!.maxCarryWeight).toBe(0);

      const loaded49 = await loadProfile('player-49');
      expect(loaded49!.maxCarryWeight).toBe(490);
    });

    it('multiple join/leave cycles preserve latest profile', async () => {
      for (let cycle = 1; cycle <= 5; cycle++) {
        await saveProfile(PLAYER_A, makeProfile({
          skills: { stealth: cycle * 2, awareness: cycle * 3 },
          maxCarryWeight: 20 + cycle * 5,
        }));
      }

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded!.skills.stealth).toBe(10); // 5 * 2
      expect(loaded!.skills.awareness).toBe(15); // 5 * 3
      expect(loaded!.maxCarryWeight).toBe(45); // 20 + 5 * 5
    });
  });

  // ── Concurrent-like Operations ──

  describe('concurrent-like operations', () => {
    it('parallel saves for different players do not interfere', async () => {
      await Promise.all([
        saveProfile(PLAYER_A, makeProfile({ skills: { stealth: 10, awareness: 5 } })),
        saveProfile(PLAYER_B, makeProfile({ skills: { stealth: 3, awareness: 20 } })),
        saveProfile(PLAYER_C, makeProfile({ skills: { stealth: 50, awareness: 50 } })),
      ]);

      expect((await loadProfile(PLAYER_A))!.skills.stealth).toBe(10);
      expect((await loadProfile(PLAYER_B))!.skills.awareness).toBe(20);
      expect((await loadProfile(PLAYER_C))!.skills.stealth).toBe(50);
    });

    it('parallel reads return consistent data', async () => {
      await saveProfile(PLAYER_A, makeVeteranProfile());

      const [r1, r2, r3] = await Promise.all([
        loadProfile(PLAYER_A),
        loadProfile(PLAYER_A),
        loadProfile(PLAYER_A),
      ]);

      expect(r1!.skills.stealth).toBe(25);
      expect(r2!.skills.stealth).toBe(25);
      expect(r3!.skills.stealth).toBe(25);
    });

    it('parallel saves and reads for different players', async () => {
      await saveProfile(PLAYER_A, makeProfile({ maxCarryWeight: 100 }));
      await saveProfile(PLAYER_B, makeProfile({ maxCarryWeight: 200 }));

      const [loadA, loadB] = await Promise.all([
        loadProfile(PLAYER_A),
        loadProfile(PLAYER_B),
        saveProfile(PLAYER_C, makeProfile({ maxCarryWeight: 300 })),
      ]);

      expect(loadA!.maxCarryWeight).toBe(100);
      expect(loadB!.maxCarryWeight).toBe(200);

      const loadC = await loadProfile(PLAYER_C);
      expect(loadC!.maxCarryWeight).toBe(300);
    });
  });

  // ── Full Veteran Profile (integration-style) ──

  describe('full veteran profile round-trip', () => {
    it('saves and loads a fully populated profile', async () => {
      const veteran = makeVeteranProfile();
      await saveProfile(PLAYER_A, veteran);

      const loaded = await loadProfile(PLAYER_A);
      expect(loaded).not.toBeNull();
      expect(loaded!.skills.stealth).toBe(25);
      expect(loaded!.skills.awareness).toBe(30);
      expect(loaded!.skills.tracking).toBe(15);
      expect(loaded!.maxCarryWeight).toBe(50);
      expect(loaded!.equipment).toBeDefined();
      expect(loaded!.equipment!.weapon).toBe('shadow-blade');
      expect(loaded!.equipment!.armour).toBe('mithral-mail');
      expect(loaded!.equipment!.tier).toBe('rare');
    });
  });
}

// ─── Run against InMemoryPlayerProfileRepository ────────────────────────────

describe('InMemoryPlayerProfileRepository — persistence contract', () => {
  playerProfileRepositoryContractTests(() => new InMemoryPlayerProfileRepository());
});

// ─── Provider Wiring Tests ──────────────────────────────────────────────────

describe('PlayerProfile Provider Wiring', () => {
  afterEach(() => {
    resetProfileProvider();
  });

  it('defaults to in-memory when not initialized', () => {
    resetProfileProvider();
    const repo = getProfileRepository();
    expect(repo).toBeInstanceOf(InMemoryPlayerProfileRepository);
  });

  it('uses in-memory when initialized with usePg=false', () => {
    initProfileProvider(false);
    const repo = getProfileRepository();
    expect(repo).toBeInstanceOf(InMemoryPlayerProfileRepository);
  });

  it('returns same repository instance on repeated calls', () => {
    initProfileProvider(false);
    const repo1 = getProfileRepository();
    const repo2 = getProfileRepository();
    expect(repo1).toBe(repo2);
  });

  it('resetProfileProvider clears state', () => {
    initProfileProvider(false);
    const repo1 = getProfileRepository();
    resetProfileProvider();
    const repo2 = getProfileRepository();
    expect(repo1).not.toBe(repo2);
  });

  it('isProfilePg() returns false when no DATABASE_URL', () => {
    initProfileProvider(false);
    expect(isProfilePg()).toBe(false);
  });
});

// ─── ZoneRoom profile lifecycle (placeholder — requires Colyseus integration tests) ──

describe('ZoneRoom profile lifecycle (placeholder)', () => {
  it.todo('player joins zone → state loaded from saved profile, not hardcoded defaults');
  it.todo('player leaves zone (consented) → state saved to profile');
  it.todo('new player with no saved profile → gets default skill/weight values');
  it.todo('player reconnects to zone → sees previously saved state');
  it.todo('profile data survives multiple join/leave/rejoin cycles');
  it.todo('player leaves mid-combat → profile still saved');
});
