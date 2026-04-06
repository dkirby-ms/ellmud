/**
 * Character creation with starter kit — unit tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { grantStarterKit } from '../api/starter-kit.js';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

describe('grantStarterKit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 when usePg is false', async () => {
    const count = await grantStarterKit('player-1', 'char-1', false);
    expect(count).toBe(0);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns 0 when no starter items exist in DB', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [],
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: [],
    });

    const count = await grantStarterKit('player-1', 'char-1', true);
    expect(count).toBe(0);
    // Only the lookup query should have been called
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('inserts starter items into player_stash with character_id', async () => {
    // Lookup query returns 3 items
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 'uuid-blade', name: 'Rusty Blade', type: 'weapon', base_durability: 30 },
        { id: 'uuid-leather', name: 'Tattered Leather', type: 'armour', base_durability: 25 },
        { id: 'uuid-potion', name: 'Waterlogged Potion', type: 'consumable', base_durability: null },
      ],
      command: 'SELECT',
      rowCount: 3,
      oid: 0,
      fields: [],
    });

    // 3 INSERT calls
    queryMock.mockResolvedValue({
      rows: [],
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const count = await grantStarterKit('player-1', 'char-1', true);
    expect(count).toBe(3);

    // 1 SELECT + 3 INSERTs = 4 queries
    expect(queryMock).toHaveBeenCalledTimes(4);

    // Verify first INSERT includes character_id
    const firstInsert = queryMock.mock.calls[1];
    expect(firstInsert[0]).toContain('INSERT INTO player_stash');
    expect(firstInsert[0]).toContain('character_id');
    expect(firstInsert[1]).toEqual(['player-1', 'char-1', 'uuid-blade', 30, JSON.stringify({ maxDurability: 30 })]);
  });

  it('handles items without durability correctly', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 'uuid-potion', name: 'Waterlogged Potion', type: 'consumable', base_durability: null },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    queryMock.mockResolvedValueOnce({
      rows: [],
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const count = await grantStarterKit('player-1', 'char-1', true);
    expect(count).toBe(1);

    const insertCall = queryMock.mock.calls[1];
    // durability should be null, metadata should be '{}'
    expect(insertCall[1]).toEqual(['player-1', 'char-1', 'uuid-potion', null, '{}']);
  });
});
