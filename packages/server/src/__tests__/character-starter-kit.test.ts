/**
 * Character starter kit — unit tests.
 *
 * Tests that starter items are granted to player inventory (not stash)
 * on first zone join, gated by the starter_kit_granted flag.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { grantStarterKit } from '../api/starter-kit.js';
import { PlayerState } from '../state/PlayerState.js';
import { InMemoryCharacterRepository } from '../character/InMemoryCharacterRepository.js';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

describe('grantStarterKit', () => {
  let player: PlayerState;
  let characterRepo: InMemoryCharacterRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    player = new PlayerState('session-1', 'room-start');
    characterRepo = new InMemoryCharacterRepository();
  });

  it('returns 0 when usePg is false', async () => {
    const count = await grantStarterKit('char-1', player, characterRepo, false);
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

    const count = await grantStarterKit('char-1', player, characterRepo, true);
    expect(count).toBe(0);
    // Only the lookup query should have been called
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('adds starter items to player inventory (not stash)', async () => {
    // Lookup query returns 3 items
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 'uuid-blade', name: 'Rusty Blade', type: 'weapon', weight: 3, description: 'A rusty blade', base_durability: 30 },
        { id: 'uuid-leather', name: 'Tattered Leather', type: 'armour', weight: 5, description: 'Worn leather', base_durability: 25 },
        { id: 'uuid-potion', name: 'Waterlogged Potion', type: 'consumable', weight: 1, description: 'A damp potion', base_durability: null },
      ],
      command: 'SELECT',
      rowCount: 3,
      oid: 0,
      fields: [],
    });

    const count = await grantStarterKit('char-1', player, characterRepo, true);
    expect(count).toBe(3);

    // Items should be in player inventory, not written to player_stash
    expect(player.inventory.size).toBe(3);
    expect(player.inventory.get('uuid-blade')?.item.name).toBe('Rusty Blade');
    expect(player.inventory.get('uuid-leather')?.item.name).toBe('Tattered Leather');
    expect(player.inventory.get('uuid-potion')?.item.name).toBe('Waterlogged Potion');

    // Only the SELECT for item_definitions should have run (no INSERT into player_stash)
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('item_definitions');
  });

  it('sets starter_kit_granted flag after granting', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 'uuid-blade', name: 'Rusty Blade', type: 'weapon', weight: 3, description: 'A rusty blade', base_durability: 30 },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    await grantStarterKit('char-1', player, characterRepo, true);

    // Flag should be set
    const granted = await characterRepo.isStarterKitGranted('char-1');
    expect(granted).toBe(true);
  });

  it('does not re-grant if starter_kit_granted is already true', async () => {
    // Pre-mark as granted
    await characterRepo.markStarterKitGranted('char-1');

    const count = await grantStarterKit('char-1', player, characterRepo, true);
    expect(count).toBe(0);
    expect(player.inventory.size).toBe(0);
    // No DB queries at all — early return after flag check
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('handles items without durability correctly', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 'uuid-potion', name: 'Waterlogged Potion', type: 'consumable', weight: 1, description: 'A damp potion', base_durability: null },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const count = await grantStarterKit('char-1', player, characterRepo, true);
    expect(count).toBe(1);
    expect(player.inventory.get('uuid-potion')?.item.weight).toBe(1);
  });

  it('respects weight limits — items that do not fit are not granted', async () => {
    // Create a player with very low carry weight
    const heavyPlayer = new PlayerState('session-2', 'room-start', 2);

    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 'uuid-blade', name: 'Rusty Blade', type: 'weapon', weight: 3, description: 'A rusty blade', base_durability: 30 },
        { id: 'uuid-potion', name: 'Waterlogged Potion', type: 'consumable', weight: 1, description: 'A damp potion', base_durability: null },
      ],
      command: 'SELECT',
      rowCount: 2,
      oid: 0,
      fields: [],
    });

    const count = await grantStarterKit('char-1', heavyPlayer, characterRepo, true);
    // Only the potion (weight 1) fits within the 2-unit limit
    expect(count).toBe(1);
    expect(heavyPlayer.inventory.size).toBe(1);
    expect(heavyPlayer.inventory.get('uuid-potion')).toBeDefined();
  });
});
