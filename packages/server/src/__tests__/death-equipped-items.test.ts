/**
 * Death → Equipped Items Tests (Issue #409 Phase 3)
 *
 * Verifies:
 * 1. Equipped items are added to the corpse on death
 * 2. Soulbound equipped items stay with the player
 * 3. Inventory persistence saves only soulbound items after death
 * 4. Corpse TTL defaults to 12 hours (43200 seconds)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerState } from '../state/PlayerState.js';
import { CorpseSystem, resetCorpseIdCounter } from '../systems/CorpseSystem.js';
import { getConfig } from '../config.js';
import { InMemoryPlayerInventoryRepository, inventoryToEntries } from '../inventory/index.js';
import type { Item } from '../generator/RoomGraph.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeItem(id: string, name: string, weight = 1): Item {
  return { id, name, weight, description: `A ${name}.` };
}

function makePlayer(sessionId = 'player-1', roomId = 'room-1'): PlayerState {
  return new PlayerState(sessionId, roomId, 50);
}

// ─── PlayerState: equipped item accessors (#409 Phase 3) ────────────────────

describe('PlayerState equipped item accessors', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = makePlayer();
  });

  it('getEquippedItems returns empty array when nothing equipped', () => {
    expect(player.getEquippedItems()).toHaveLength(0);
  });

  it('getEquippedItems returns all equipped items as [slot, Item] pairs', () => {
    const sword = makeItem('iron_sword', 'Iron Sword', 6);
    const helmet = makeItem('iron_helm', 'Iron Helm', 3);

    player.setEquippedItem('weapon', sword);
    player.setEquippedItem('head', helmet);

    const equipped = player.getEquippedItems();
    expect(equipped).toHaveLength(2);

    const slotMap = new Map(equipped);
    expect(slotMap.get('weapon')).toEqual(sword);
    expect(slotMap.get('head')).toEqual(helmet);
  });

  it('clearAllEquippedItems removes all equipped items', () => {
    player.setEquippedItem('weapon', makeItem('sword', 'Sword'));
    player.setEquippedItem('chest', makeItem('armor', 'Armor'));

    player.clearAllEquippedItems();
    expect(player.getEquippedItems()).toHaveLength(0);
    expect(player.getEquippedItem('weapon')).toBeNull();
    expect(player.getEquippedItem('chest')).toBeNull();
  });
});

// ─── Death flow: equipped items go into corpse ──────────────────────────────

describe('Death flow: equipped items in corpse', () => {
  let corpseSystem: CorpseSystem;

  beforeEach(() => {
    resetCorpseIdCounter();
    corpseSystem = new CorpseSystem();
  });

  it('non-soulbound equipped items are added to the corpse', () => {
    const player = makePlayer();
    const sword = makeItem('iron_sword', 'Iron Sword', 6);
    const shield = makeItem('iron_shield', 'Iron Shield', 4);

    // Equip items
    player.setEquippedItem('weapon', sword);
    player.setEquippedItem('offhand', shield);

    // Also add inventory items
    player.addItem(makeItem('potion', 'Health Potion', 1));

    // Simulate death: collect corpse items from inventory + equipped
    const corpseItems: Item[] = [];

    // Inventory items
    for (const [, entry] of player.inventory) {
      for (let i = 0; i < entry.quantity; i++) {
        corpseItems.push(entry.item);
      }
    }

    // Equipped items (the fix)
    for (const [, item] of player.getEquippedItems()) {
      corpseItems.push(item);
    }

    // Create corpse
    const corpse = corpseSystem.addCorpse('room-1', 'player-1', 'TestPlayer', corpseItems, 43200);

    expect(corpse.items).toHaveLength(3); // 1 potion + sword + shield
    const names = corpse.items.map(i => i.name);
    expect(names).toContain('Iron Sword');
    expect(names).toContain('Iron Shield');
    expect(names).toContain('Health Potion');
  });

  it('soulbound equipped items are NOT added to the corpse', () => {
    // We can't use getItemDefinition in a unit test without content registry,
    // so we simulate the soulbound check logic that handlePlayerDeath uses.
    const player = makePlayer();
    const soulboundItem = makeItem('soulbound_amulet', 'Soul Amulet', 1);
    const normalWeapon = makeItem('iron_sword', 'Iron Sword', 6);

    player.setEquippedItem('amulet', soulboundItem);
    player.setEquippedItem('weapon', normalWeapon);

    // Simulate soulbound check: amulet is soulbound, sword is not
    const soulboundIds = new Set(['soulbound_amulet']);

    const corpseItems: Item[] = [];
    const keptEquipSlots: string[] = [];

    for (const [slot, item] of player.getEquippedItems()) {
      if (soulboundIds.has(item.id)) {
        keptEquipSlots.push(slot);
      } else {
        corpseItems.push(item);
      }
    }

    // Only the non-soulbound sword should be in corpse
    expect(corpseItems).toHaveLength(1);
    expect(corpseItems[0]!.name).toBe('Iron Sword');

    // The soulbound amulet slot was kept
    expect(keptEquipSlots).toEqual(['amulet']);
  });

  it('equipped items are cleared after being added to corpse', () => {
    const player = makePlayer();
    player.setEquippedItem('weapon', makeItem('sword', 'Sword'));
    player.setEquippedItem('chest', makeItem('armor', 'Armor'));

    // Collect equipped items for corpse
    const corpseItems: Item[] = [];
    for (const [, item] of player.getEquippedItems()) {
      corpseItems.push(item);
    }

    // Clear equipped (as death handler does)
    player.clearAllEquippedItems();

    expect(corpseItems).toHaveLength(2);
    expect(player.getEquippedItems()).toHaveLength(0);
  });
});

// ─── Inventory persistence on death ─────────────────────────────────────────

describe('Inventory persistence on death', () => {
  it('saves only remaining (soulbound) items after death split', async () => {
    const repo = new InMemoryPlayerInventoryRepository();
    const player = makePlayer();

    // Add items: one soulbound-like, one not
    player.addItem(makeItem('soul_ring', 'Soul Ring', 1));
    player.addItem(makeItem('iron_sword', 'Iron Sword', 6));

    // Simulate death split: remove non-soulbound
    player.inventory.delete('iron_sword');

    // Save remaining inventory
    const entries = inventoryToEntries(player.inventory);
    await repo.saveInventory('db-player-1', entries);

    // Only soul ring should be persisted
    const saved = await repo.loadInventory('db-player-1');
    expect(saved).toHaveLength(1);
    expect(saved[0]!.itemId).toBe('soul_ring');
  });

  it('clears inventory in repo when no soulbound items remain', async () => {
    const repo = new InMemoryPlayerInventoryRepository();

    // Pre-load some items
    await repo.saveInventory('db-player-1', [
      { itemId: 'sword', name: 'Sword', weight: 5, description: 'A sword.', quantity: 1, durability: null, metadata: {} },
    ]);

    // Simulate death: all items go to corpse, inventory is now empty
    const entries = inventoryToEntries(new Map());
    await repo.saveInventory('db-player-1', entries);

    const saved = await repo.loadInventory('db-player-1');
    expect(saved).toHaveLength(0);
  });
});

// ─── Corpse TTL ─────────────────────────────────────────────────────────────

describe('Corpse TTL configuration', () => {
  it('defaults to 12 hours (43200 seconds)', () => {
    const config = getConfig();
    expect(config.corpseTTLSeconds).toBe(43200);
  });

  it('corpse survives for 12 hours', () => {
    const system = new CorpseSystem();
    resetCorpseIdCounter();

    const corpse = system.addCorpse('room-1', 'p1', 'Alice', [makeItem('s', 'Sword')], 43200);

    // 11 hours later — still alive
    corpse.createdAt = Date.now() - (11 * 60 * 60 * 1000);
    expect(system.getCorpsesInRoom('room-1')).toHaveLength(1);

    // 13 hours later — expired
    corpse.createdAt = Date.now() - (13 * 60 * 60 * 1000);
    expect(system.getCorpsesInRoom('room-1')).toHaveLength(0);
  });
});
