/**
 * InMemoryCharacterRepository — unit tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCharacterRepository } from '../character/InMemoryCharacterRepository.js';

describe('InMemoryCharacterRepository', () => {
  let repo: InMemoryCharacterRepository;
  const PLAYER_A = 'player-aaa';
  const PLAYER_B = 'player-bbb';

  beforeEach(() => {
    repo = new InMemoryCharacterRepository();
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a character and returns it', async () => {
      const char = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      expect(char.name).toBe('Drizzt');
      expect(char.factionSlug).toBe('bloom-tenders');
      expect(char.playerId).toBe(PLAYER_A);
      expect(char.isActive).toBe(false);
      expect(char.deletedAt).toBeNull();
      expect(char.id).toBeDefined();
    });

    it('rejects duplicate names for same player (case-insensitive)', async () => {
      await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await expect(repo.create(PLAYER_A, 'drizzt', 'krewe-calliope')).rejects.toThrow('already in use');
    });

    it('allows same name for different players', async () => {
      await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      const char = await repo.create(PLAYER_B, 'Drizzt', 'krewe-calliope');
      expect(char.name).toBe('Drizzt');
    });

    it('allows reusing name after soft-delete', async () => {
      const char = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await repo.softDelete(char.id);
      const newChar = await repo.create(PLAYER_A, 'Drizzt', 'krewe-calliope');
      expect(newChar.name).toBe('Drizzt');
      expect(newChar.id).not.toBe(char.id);
    });
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns empty array for player with no characters', async () => {
      const result = await repo.list(PLAYER_A);
      expect(result).toEqual([]);
    });

    it('returns all non-deleted characters', async () => {
      await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await repo.create(PLAYER_A, 'Bruenor', 'kindari');
      const deleted = await repo.create(PLAYER_A, 'Wulfgar', 'krewe-calliope');
      await repo.softDelete(deleted.id);

      const result = await repo.list(PLAYER_A);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.name).sort()).toEqual(['Bruenor', 'Drizzt']);
    });

    it('does not return characters from other players', async () => {
      await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await repo.create(PLAYER_B, 'Bruenor', 'kindari');

      const result = await repo.list(PLAYER_A);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Drizzt');
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns character by ID', async () => {
      const char = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      const found = await repo.getById(char.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Drizzt');
    });

    it('returns null for non-existent ID', async () => {
      const found = await repo.getById('nonexistent');
      expect(found).toBeNull();
    });

    it('returns null for soft-deleted character', async () => {
      const char = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await repo.softDelete(char.id);
      const found = await repo.getById(char.id);
      expect(found).toBeNull();
    });
  });

  // ─── setActive ─────────────────────────────────────────────────────────────

  describe('setActive', () => {
    it('activates a character and deactivates others', async () => {
      const char1 = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      const char2 = await repo.create(PLAYER_A, 'Bruenor', 'kindari');

      await repo.setActive(PLAYER_A, char1.id);
      expect((await repo.getById(char1.id))!.isActive).toBe(true);
      expect((await repo.getById(char2.id))!.isActive).toBe(false);

      await repo.setActive(PLAYER_A, char2.id);
      expect((await repo.getById(char1.id))!.isActive).toBe(false);
      expect((await repo.getById(char2.id))!.isActive).toBe(true);
    });

    it('throws for non-existent character', async () => {
      await expect(repo.setActive(PLAYER_A, 'nonexistent')).rejects.toThrow('not found');
    });

    it('throws for character owned by different player', async () => {
      const char = await repo.create(PLAYER_B, 'Drizzt', 'bloom-tenders');
      await expect(repo.setActive(PLAYER_A, char.id)).rejects.toThrow('not found');
    });
  });

  // ─── softDelete ────────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('soft-deletes a character', async () => {
      const char = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await repo.softDelete(char.id);

      const found = await repo.getById(char.id);
      expect(found).toBeNull();
    });

    it('deactivates the character on soft-delete', async () => {
      const char = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await repo.setActive(PLAYER_A, char.id);
      await repo.softDelete(char.id);

      const active = await repo.getActive(PLAYER_A);
      expect(active).toBeNull();
    });

    it('throws for already-deleted character', async () => {
      const char = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await repo.softDelete(char.id);
      await expect(repo.softDelete(char.id)).rejects.toThrow('not found');
    });
  });

  // ─── getActive ─────────────────────────────────────────────────────────────

  describe('getActive', () => {
    it('returns null when no character is active', async () => {
      await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      const active = await repo.getActive(PLAYER_A);
      expect(active).toBeNull();
    });

    it('returns the active character', async () => {
      const char = await repo.create(PLAYER_A, 'Drizzt', 'bloom-tenders');
      await repo.setActive(PLAYER_A, char.id);

      const active = await repo.getActive(PLAYER_A);
      expect(active).not.toBeNull();
      expect(active!.id).toBe(char.id);
    });
  });
});
