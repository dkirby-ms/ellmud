/**
 * Unit tests for the dedicated Pg content stores:
 *   - PgModifierDefinitionsStore
 *   - PgNarrativeDefinitionsStore
 *   - PgCreatureDefinitionsStore
 *
 * Validates row→entity mapping, CRUD operations, error handling, and edge
 * cases with a mocked pg pool (no real database needed).
 *
 * Follows the established pattern from pg-death-penalty-store.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueryResultRow } from 'pg';

import { ContentStoreError } from '../admin/content/ContentStore.js';
import { PgModifierDefinitionsStore } from '../admin/content/PgModifierDefinitionsStore.js';
import { PgNarrativeDefinitionsStore } from '../admin/content/PgNarrativeDefinitionsStore.js';
import { PgCreatureDefinitionsStore } from '../admin/content/PgCreatureDefinitionsStore.js';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockQueryResult(rows: QueryResultRow[] = [], rowCount?: number) {
  return {
    rows,
    command: 'SELECT',
    rowCount: rowCount ?? rows.length,
    oid: 0,
    fields: [],
  };
}

function pgUniqueViolation(): Error {
  const err = new Error('duplicate key value') as Error & { code: string };
  err.code = '23505';
  return err;
}

// ─── PgModifierDefinitionsStore ──────────────────────────────────────────────

describe('PgModifierDefinitionsStore', () => {
  let store: PgModifierDefinitionsStore;

  const MODIFIER_ROW = {
    id: 'm-001',
    slug: 'darkness',
    name: 'Darkness',
    description: 'Vision is severely limited',
    effects: { visibility: -0.5, accuracy: -0.2 },
    stackable: false,
    tags: ['environmental', 'debuff'],
    created_at: new Date('2025-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = new PgModifierDefinitionsStore();
  });

  it('has entityType "modifiers"', () => {
    expect(store.entityType).toBe('modifiers');
  });

  // ── rowToEntity via getAll ──────────────────────────────────────────────

  describe('getAll', () => {
    it('maps DB rows to entities preserving JSONB effects and array tags', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([MODIFIER_ROW]));

      const entities = await store.getAll();

      expect(entities).toHaveLength(1);
      const e = entities[0];
      expect(e.id).toBe('m-001');
      expect(e.slug).toBe('darkness');
      expect(e.name).toBe('Darkness');
      expect(e.description).toBe('Vision is severely limited');
      expect(e.effects).toEqual({ visibility: -0.5, accuracy: -0.2 });
      expect(e.stackable).toBe(false);
      expect(e.tags).toEqual(['environmental', 'debuff']);
    });

    it('returns empty array when no rows', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      expect(await store.getAll()).toEqual([]);
    });
  });

  // ── getById ────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns entity when found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([MODIFIER_ROW]));
      const entity = await store.getById('m-001');
      expect(entity).toBeDefined();
      expect(entity!.effects).toEqual({ visibility: -0.5, accuracy: -0.2 });
    });

    it('returns undefined when not found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      expect(await store.getById('ghost')).toBeUndefined();
    });
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns the created entity', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([MODIFIER_ROW]));

      const entity = await store.create({
        id: 'ignored',
        slug: 'darkness',
        name: 'Darkness',
        description: 'Vision is severely limited',
        effects: { visibility: -0.5, accuracy: -0.2 },
        stackable: false,
        tags: ['environmental', 'debuff'],
      });

      expect(entity.id).toBe('m-001');
    });

    it('serializes effects as JSON for the INSERT', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([MODIFIER_ROW]));

      await store.create({
        id: 'x',
        name: 'Test',
        effects: { speed: 5 },
      });

      const callArgs = queryMock.mock.calls[0][1] as unknown[];
      // effects is the 4th param ($4)
      expect(callArgs[3]).toBe(JSON.stringify({ speed: 5 }));
    });

    it('throws ContentStoreError DUPLICATE_ID on unique violation', async () => {
      queryMock.mockRejectedValueOnce(pgUniqueViolation());

      await expect(
        store.create({ id: 'dup', name: 'Dup' }),
      ).rejects.toThrow(ContentStoreError);
    });

    it('defaults effects to empty object when not provided', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        ...MODIFIER_ROW,
        effects: {},
      }]));

      await store.create({ id: 'x', name: 'Bare Modifier' });

      const callArgs = queryMock.mock.calls[0][1] as unknown[];
      expect(callArgs[3]).toBe(JSON.stringify({}));
    });

    it('defaults tags to empty array when not provided', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        ...MODIFIER_ROW,
        tags: [],
      }]));

      await store.create({ id: 'x', name: 'No Tags' });

      const callArgs = queryMock.mock.calls[0][1] as unknown[];
      // tags is 6th param ($6)
      expect(callArgs[5]).toEqual([]);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws ContentStoreError NOT_FOUND for missing id', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      await expect(
        store.update('missing', { name: 'Updated' }),
      ).rejects.toThrow(ContentStoreError);
    });

    it('merges partial fields and returns updated entity', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([MODIFIER_ROW]));
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        ...MODIFIER_ROW,
        stackable: true,
      }]));

      const updated = await store.update('m-001', { stackable: true });

      expect(updated.stackable).toBe(true);
      expect(updated.name).toBe('Darkness');
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('returns true when row deleted', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 1));
      expect(await store.delete('m-001')).toBe(true);
    });

    it('returns false when no row found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 0));
      expect(await store.delete('ghost')).toBe(false);
    });

    it('targets modifier_definitions table', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 0));
      await store.delete('m-001');
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM modifier_definitions'),
        ['m-001'],
      );
    });
  });
});

// ─── PgNarrativeDefinitionsStore ─────────────────────────────────────────────

describe('PgNarrativeDefinitionsStore', () => {
  let store: PgNarrativeDefinitionsStore;

  const NARRATIVE_ROW = {
    id: 'n-001',
    slug: 'crypt-entry',
    name: 'Crypt Entry',
    narrative_type: 'room_description',
    template: 'You step into the crypt...',
    tone: 'foreboding',
    verbosity: 'detailed',
    tags: ['entry', 'atmospheric'],
    created_at: new Date('2025-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = new PgNarrativeDefinitionsStore();
  });

  it('has entityType "narrative"', () => {
    expect(store.entityType).toBe('narrative');
  });

  // ── rowToEntity mapping ────────────────────────────────────────────────

  describe('getAll', () => {
    it('maps narrative_type to narrativeType and null fields to empty strings', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([NARRATIVE_ROW]));

      const entities = await store.getAll();

      expect(entities).toHaveLength(1);
      const e = entities[0];
      expect(e.id).toBe('n-001');
      expect(e.slug).toBe('crypt-entry');
      expect(e.name).toBe('Crypt Entry');
      expect(e.narrativeType).toBe('room_description');
      expect(e.template).toBe('You step into the crypt...');
      expect(e.tone).toBe('foreboding');
      expect(e.verbosity).toBe('detailed');
      expect(e.tags).toEqual(['entry', 'atmospheric']);
    });

    it('converts null tone, verbosity to empty strings', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        ...NARRATIVE_ROW,
        tone: null,
        verbosity: null,
      }]));

      const entities = await store.getAll();
      const e = entities[0];

      expect(e.tone).toBe('');
      expect(e.verbosity).toBe('');
    });

    it('returns empty array when no rows', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      expect(await store.getAll()).toEqual([]);
    });

    it('queries narrative_template_definitions table', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      await store.getAll();
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('FROM narrative_template_definitions'),
      );
    });
  });

  // ── getById ────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns entity when found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([NARRATIVE_ROW]));
      const entity = await store.getById('n-001');
      expect(entity).toBeDefined();
      expect(entity!.narrativeType).toBe('room_description');
    });

    it('returns undefined when not found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      expect(await store.getById('ghost')).toBeUndefined();
    });
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns created entity from RETURNING clause', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([NARRATIVE_ROW]));

      const entity = await store.create({
        id: 'ignored',
        slug: 'crypt-entry',
        name: 'Crypt Entry',
        narrativeType: 'room_description',
        template: 'You step into the crypt...',
      });

      expect(entity.id).toBe('n-001');
      expect(entity.narrativeType).toBe('room_description');
    });

    it('inserts into narrative_template_definitions', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([NARRATIVE_ROW]));
      await store.create({ id: 'x', slug: 'test', name: 'Test' });
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO narrative_template_definitions'),
        expect.any(Array),
      );
    });

    it('throws ContentStoreError DUPLICATE_ID on unique violation', async () => {
      queryMock.mockRejectedValueOnce(pgUniqueViolation());
      await expect(
        store.create({ id: 'dup', slug: 'dup', name: 'Dup' }),
      ).rejects.toThrow(ContentStoreError);
    });

    it('defaults tags to empty array', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        ...NARRATIVE_ROW,
        tags: [],
      }]));
      await store.create({ id: 'x', slug: 'test', name: 'Test' });

      const callArgs = queryMock.mock.calls[0][1] as unknown[];
      // tags is the 7th param ($7)
      expect(callArgs[6]).toEqual([]);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws ContentStoreError NOT_FOUND for missing id', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      await expect(
        store.update('missing', { name: 'Updated' }),
      ).rejects.toThrow(ContentStoreError);
    });

    it('merges partial fields and returns updated entity', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([NARRATIVE_ROW]));
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        ...NARRATIVE_ROW,
        tone: 'ominous',
        template: 'Updated template...',
      }]));

      const updated = await store.update('n-001', {
        tone: 'ominous',
        template: 'Updated template...',
      });

      expect(updated.tone).toBe('ominous');
      expect(updated.template).toBe('Updated template...');
      expect(updated.name).toBe('Crypt Entry');
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('returns true when row deleted', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 1));
      expect(await store.delete('n-001')).toBe(true);
    });

    it('returns false when no row found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 0));
      expect(await store.delete('ghost')).toBe(false);
    });

    it('targets narrative_template_definitions table', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 0));
      await store.delete('n-001');
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM narrative_template_definitions'),
        ['n-001'],
      );
    });
  });
});

// ─── PgCreatureDefinitionsStore ──────────────────────────────────────────────

describe('PgCreatureDefinitionsStore', () => {
  let store: PgCreatureDefinitionsStore;

  const CREATURE_ROW = {
    id: 'c-001',
    type: 'drowned_revenant',
    name: 'Drowned Revenant',
    description: 'A waterlogged corpse risen from the depths',
    room_description: null,
    behavior: 'aggressive',
    aggressive: true,
    max_hp: 120,
    unarmed: 10,
    one_handed: 8,
    two_handed: 3,
    ranged: 1,
    shield_block: 0,
    dodge_skill_rank: 3,
    armour: 3,
    min_count: 1,
    max_count: 3,
    preferred_rooms: ['flooded_chamber', 'submerged_hall'],
    forbidden_rooms: ['dry_corridor'],
    idle_ticks_min: 3,
    idle_ticks_max: 6,
    flee_threshold: 0.2,
    tier_min: 2,
    tier_max: 4,
    status: 'published',
    loot_table: [{ itemId: 'waterlogged_bone', dropWeight: 30 }],
    created_at: new Date('2025-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = new PgCreatureDefinitionsStore();
  });

  it('has entityType "creatures"', () => {
    expect(store.entityType).toBe('creatures');
  });

  // ── rowToEntity mapping ────────────────────────────────────────────────

  describe('getAll', () => {
    it('maps all snake_case columns to camelCase entity fields', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));

      const entities = await store.getAll();

      expect(entities).toHaveLength(1);
      const e = entities[0];
      expect(e.id).toBe('c-001');
      expect(e.type).toBe('drowned_revenant');
      expect(e.name).toBe('Drowned Revenant');
      expect(e.description).toBe('A waterlogged corpse risen from the depths');
      expect(e.behavior).toBe('aggressive');
      expect(e.maxHp).toBe(120);
      expect(e.unarmed).toBe(10);
      expect(e.oneHanded).toBe(8);
      expect(e.twoHanded).toBe(3);
      expect(e.ranged).toBe(1);
      expect(e.shieldBlock).toBe(0);
      expect(e.dodge).toBe(3);
      expect(e.armour).toBe(3);
      expect(e.minCount).toBe(1);
      expect(e.maxCount).toBe(3);
      expect(e.preferredRooms).toEqual(['flooded_chamber', 'submerged_hall']);
      expect(e.forbiddenRooms).toEqual(['dry_corridor']);
      expect(e.idleTicksMin).toBe(3);
      expect(e.idleTicksMax).toBe(6);
      expect(e.fleeThreshold).toBe(0.2);
      expect(e.tierMin).toBe(2);
      expect(e.tierMax).toBe(4);
      expect(e.status).toBe('published');
      expect(e.lootTable).toEqual([{ itemId: 'waterlogged_bone', dropWeight: 30 }]);
    });

    it('handles null fields with correct defaults', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        ...CREATURE_ROW,
        description: null,
        behavior: null,
        tier_min: null,
        tier_max: null,
        status: null,
      }]));

      const entities = await store.getAll();
      const e = entities[0];

      expect(e.description).toBe('');
      expect(e.behavior).toBeNull();
      expect(e.tierMin).toBeNull();
      expect(e.tierMax).toBeNull();
      expect(e.status).toBe('published');
    });

    it('returns empty array when no rows', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      expect(await store.getAll()).toEqual([]);
    });

    it('queries creature_definitions table with ORDER BY name', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      await store.getAll();
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('FROM creature_definitions'),
      );
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name'),
      );
    });
  });

  // ── getById ────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns entity when found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));
      const entity = await store.getById('c-001');
      expect(entity).toBeDefined();
      expect(entity!.maxHp).toBe(120);
      expect(entity!.fleeThreshold).toBe(0.2);
    });

    it('returns undefined when not found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      expect(await store.getById('ghost')).toBeUndefined();
    });

    it('passes id as parameterised query value', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      await store.getById('c-001');
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('WHERE type = $1 OR slug = $1 OR id::text = $1'),
        ['c-001'],
      );
    });
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns the created entity', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));

      const entity = await store.create({
        id: 'ignored',
        type: 'drowned_revenant',
        name: 'Drowned Revenant',
        maxHp: 120,
        attack: 15,
      });

      expect(entity.id).toBe('c-001');
      expect(entity.name).toBe('Drowned Revenant');
    });

    it('inserts into creature_definitions with 25 params', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));
      await store.create({ id: 'x', type: 'test', name: 'Test' });

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO creature_definitions'),
        expect.any(Array),
      );
      const callArgs = queryMock.mock.calls[0][1] as unknown[];
      expect(callArgs).toHaveLength(25);
    });

    it('serializes loot_table as JSON', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));

      const loot = [{ itemId: 'bone', dropWeight: 50 }];
      await store.create({
        id: 'x',
        type: 'skeleton',
        name: 'Skeleton',
        lootTable: loot,
      });

      const callArgs = queryMock.mock.calls[0][1] as unknown[];
      // loot_table is the 25th param ($25)
      expect(callArgs[24]).toBe(JSON.stringify(loot));
    });

    it('throws ContentStoreError DUPLICATE_ID on unique violation', async () => {
      queryMock.mockRejectedValueOnce(pgUniqueViolation());

      await expect(
        store.create({ id: 'dup', type: 'test', name: 'Dup' }),
      ).rejects.toThrow(ContentStoreError);

      try {
        queryMock.mockRejectedValueOnce(pgUniqueViolation());
        await store.create({ id: 'dup', type: 'test', name: 'Dup' });
      } catch (err) {
        expect((err as ContentStoreError).code).toBe('DUPLICATE_ID');
      }
    });

    it('re-throws non-PG errors as-is', async () => {
      queryMock.mockRejectedValueOnce(new Error('timeout'));
      await expect(
        store.create({ id: 'x', type: 'test', name: 'Test' }),
      ).rejects.toThrow('timeout');
    });

    it('uses sensible defaults for omitted numeric fields', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));
      await store.create({ id: 'x', type: 'test', name: 'Bare Creature' });

      const callArgs = queryMock.mock.calls[0][1] as unknown[];
      // max_hp=$7 defaults to 100, unarmed=$8 defaults to 5
      expect(callArgs[6]).toBe(100); // maxHp
      expect(callArgs[7]).toBe(5);   // unarmed
      expect(callArgs[8]).toBe(5);   // oneHanded
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws ContentStoreError NOT_FOUND for missing id', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));
      await expect(
        store.update('missing', { name: 'Updated' }),
      ).rejects.toThrow(ContentStoreError);
    });

    it('merges partial fields and returns updated entity', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        ...CREATURE_ROW,
        max_hp: 200,
        name: 'Greater Revenant',
      }]));

      const updated = await store.update('c-001', { maxHp: 200, name: 'Greater Revenant' });

      expect(updated.maxHp).toBe(200);
      expect(updated.name).toBe('Greater Revenant');
      expect(updated.type).toBe('drowned_revenant'); // unchanged
    });

    it('passes 26 params to the UPDATE query (25 cols + WHERE id)', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));
      queryMock.mockResolvedValueOnce(mockQueryResult([CREATURE_ROW]));

      await store.update('c-001', { name: 'Updated' });

      // Second call is the UPDATE
      const callArgs = queryMock.mock.calls[1][1] as unknown[];
      expect(callArgs).toHaveLength(26);
      expect(callArgs[25]).toBe('c-001'); // WHERE id = $26
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('returns true when row deleted', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 1));
      expect(await store.delete('c-001')).toBe(true);
    });

    it('returns false when no row found', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 0));
      expect(await store.delete('ghost')).toBe(false);
    });

    it('targets creature_definitions table', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 0));
      await store.delete('c-001');
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM creature_definitions'),
        ['c-001'],
      );
    });
  });
});
