/**
 * PgPlayerProfileRepository — unit tests with mocked pg pool.
 *
 * Validates SQL generation and data mapping without a live database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgPlayerProfileRepository } from '../player/PgPlayerProfileRepository.js';
import { DEFAULT_PROFILE } from '../player/PlayerProfileRepository.js';

import type { QueryResultRow } from 'pg';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(async () => mockClient),
}));

const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockQueryResult(rows: QueryResultRow[] = [], command = 'SELECT') {
  return {
    rows,
    command,
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

const PLAYER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CHARACTER_ID = 'ffffffff-1111-2222-3333-444444444444';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PgPlayerProfileRepository', () => {
  let repo: PgPlayerProfileRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PgPlayerProfileRepository();
  });

  // ─── load ──────────────────────────────────────────────────────────────────

  describe('load', () => {
    it('should return null for unknown player', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      const profile = await repo.load('unknown-player', 'unknown-character');
      expect(profile).toBeNull();
    });

    it('should round-trip skills + maxCarryWeight + equipment', async () => {
      // First query: player_skills
      queryMock.mockResolvedValueOnce(mockQueryResult([
        { skill_name: 'stealth', category: 'subterfuge', level: 12, xp: 0 },
        { skill_name: 'awareness', category: 'awareness', level: 8, xp: 0 },
      ]));
      // Second query: player_profile
      queryMock.mockResolvedValueOnce(mockQueryResult([
        { max_carry_weight: 35, equipment: { weapon: 'Scimitar', armour: 'Mithral Chain' } },
      ]));

      const profile = await repo.load(PLAYER_ID, CHARACTER_ID);

      expect(queryMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WHERE character_id = $1'),
        [CHARACTER_ID],
      );
      expect(queryMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WHERE player_id = $1'),
        [PLAYER_ID],
      );

      expect(profile).toEqual({
        skills: { stealth: 12, awareness: 8 },
        maxCarryWeight: 35,
        equipment: { weapon: 'Scimitar', armour: 'Mithral Chain' },
      });
    });

    it('should fall back to defaults when player_profile row is missing', async () => {
      // Skills exist
      queryMock.mockResolvedValueOnce(mockQueryResult([
        { skill_name: 'stealth', category: 'subterfuge', level: 10, xp: 0 },
      ]));
      // Profile row missing
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      const profile = await repo.load(PLAYER_ID, CHARACTER_ID);

      expect(profile).not.toBeNull();
      expect(profile!.maxCarryWeight).toBe(DEFAULT_PROFILE.maxCarryWeight);
      expect(profile!.equipment).toBeUndefined();
    });

    it('should treat empty equipment JSONB as undefined', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([
        { skill_name: 'awareness', category: 'awareness', level: 5, xp: 0 },
      ]));
      queryMock.mockResolvedValueOnce(mockQueryResult([
        { max_carry_weight: 20, equipment: {} },
      ]));

      const profile = await repo.load(PLAYER_ID, CHARACTER_ID);
      expect(profile!.equipment).toBeUndefined();
    });
  });

  // ─── save ──────────────────────────────────────────────────────────────────

  describe('save', () => {
    it('should persist skills and profile in a single transaction', async () => {
      // BEGIN + 2 skill upserts + 1 profile upsert + COMMIT
      mockClient.query
        .mockResolvedValueOnce({})  // BEGIN
        .mockResolvedValueOnce({})  // stealth upsert
        .mockResolvedValueOnce({})  // awareness upsert
        .mockResolvedValueOnce({})  // player_profile upsert
        .mockResolvedValueOnce({}); // COMMIT

      await repo.save(PLAYER_ID, CHARACTER_ID, {
        skills: { stealth: 15, awareness: 10 },
        maxCarryWeight: 40,
        equipment: { weapon: 'Scimitar', tier: 'legendary' },
      });

      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');

      // Skills
      const firstSkillCall = mockClient.query.mock.calls[1];
      expect(firstSkillCall[0]).toContain('INSERT INTO player_skills');
      expect(firstSkillCall[0]).toContain('character_id');
      expect(firstSkillCall[0]).toContain('ON CONFLICT (character_id, skill_name)');
      expect(firstSkillCall[1]).toEqual([PLAYER_ID, CHARACTER_ID, 'stealth', 'subterfuge', 15]);

      const secondSkillCall = mockClient.query.mock.calls[2];
      expect(secondSkillCall[0]).toContain('INSERT INTO player_skills');
      expect(secondSkillCall[1]).toEqual([PLAYER_ID, CHARACTER_ID, 'awareness', 'awareness', 10]);

      // Extended profile
      const profileCall = mockClient.query.mock.calls[3];
      expect(profileCall[0]).toContain('INSERT INTO player_profile');
      expect(profileCall[0]).toContain('ON CONFLICT (player_id)');
      expect(profileCall[1]).toEqual([
        PLAYER_ID,
        40,
        JSON.stringify({ weapon: 'Scimitar', tier: 'legendary' }),
      ]);

      expect(mockClient.query.mock.calls[4][0]).toBe('COMMIT');
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('should upsert profile with empty equipment when undefined', async () => {
      mockClient.query
        .mockResolvedValueOnce({})  // BEGIN
        .mockResolvedValueOnce({})  // stealth
        .mockResolvedValueOnce({})  // awareness
        .mockResolvedValueOnce({})  // profile
        .mockResolvedValueOnce({}); // COMMIT

      await repo.save(PLAYER_ID, CHARACTER_ID, {
        skills: { stealth: 5, awareness: 5 },
        maxCarryWeight: 20,
      });

      const profileCall = mockClient.query.mock.calls[3];
      expect(profileCall[1]).toEqual([PLAYER_ID, 20, '{}']);
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({})  // BEGIN
        .mockRejectedValueOnce(new Error('db error'));

      await expect(repo.save(PLAYER_ID, CHARACTER_ID, {
        skills: { stealth: 5, awareness: 5 },
        maxCarryWeight: 20,
      })).rejects.toThrow('db error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('should overwrite existing profile on second save', async () => {
      // First save
      mockClient.query
        .mockResolvedValueOnce({})  // BEGIN
        .mockResolvedValueOnce({})  // stealth
        .mockResolvedValueOnce({})  // awareness
        .mockResolvedValueOnce({})  // profile
        .mockResolvedValueOnce({}); // COMMIT

      await repo.save(PLAYER_ID, CHARACTER_ID, {
        skills: { stealth: 5, awareness: 5 },
        maxCarryWeight: 20,
      });

      vi.clearAllMocks();

      // Second save — upsert should overwrite
      mockClient.query
        .mockResolvedValueOnce({})  // BEGIN
        .mockResolvedValueOnce({})  // stealth
        .mockResolvedValueOnce({})  // awareness
        .mockResolvedValueOnce({})  // profile
        .mockResolvedValueOnce({}); // COMMIT

      await repo.save(PLAYER_ID, CHARACTER_ID, {
        skills: { stealth: 20, awareness: 15 },
        maxCarryWeight: 50,
        equipment: { weapon: 'Icingdeath', armour: 'Mithral Chain', tier: 'legendary' },
      });

      const profileCall = mockClient.query.mock.calls[3];
      expect(profileCall[0]).toContain('DO UPDATE SET');
      expect(profileCall[1]).toEqual([
        PLAYER_ID,
        50,
        JSON.stringify({ weapon: 'Icingdeath', armour: 'Mithral Chain', tier: 'legendary' }),
      ]);
    });
  });
});
