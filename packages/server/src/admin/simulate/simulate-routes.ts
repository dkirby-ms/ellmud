/**
 * Simulation routes — endpoints for testing game mechanics (loot drops, creature stats).
 *
 * Provides:
 *   POST /admin/api/simulate/loot-table/:id?count=10 — Simulate N loot drops
 *   POST /admin/api/simulate/creature/:id/reroll?count=5 — Simulate N creature stat rolls
 *
 * All routes are protected by adminAuth middleware.
 */

import { Router, type Request, type Response } from 'express';
import { adminAuth } from '../middleware.js';
import type { ContentEntity, IContentStore } from '../content/ContentStore.js';
import type { ContentEntityType } from '../content/content-types.js';

export interface SimulateRouterDeps {
  stores: Map<ContentEntityType, IContentStore<ContentEntity>>;
}

interface LootTableEntry {
  itemId: string;
  dropWeight: number;
  minQuantity: number;
  maxQuantity: number;
}

interface LootTableDefinition {
  id: string;
  name: string;
  description: string;
  entries: LootTableEntry[];
  minDrops: number;
  maxDrops: number;
}

interface CreatureDefinition {
  id: string;
  type: string;
  name: string;
  maxHp: number;
  attack: number;
  defence: number;
  armour: number;
}

interface DroppedItem {
  itemId: string;
  quantity: number;
  chance: number;
}

interface DropResult {
  items: DroppedItem[];
  totalWeight: number;
}

interface SimulationSummary {
  totalDrops: number;
  itemDistribution: Record<string, number>;
  averageItemsPerDrop: number;
}

interface CreatureRoll {
  stats: {
    maxHp: number;
    attack: number;
    defence: number;
    armour: number;
  };
  variance: {
    hpVariance: number;
    attackVariance: number;
    defenceVariance: number;
    armourVariance: number;
  };
}

export function createSimulateRouter(deps: SimulateRouterDeps): Router {
  const router = Router();
  const { stores } = deps;

  // ─── POST /admin/api/simulate/loot-table/:id ─────────────────────────
  router.post('/admin/api/simulate/loot-table/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const count = Math.min(parseInt(req.query.count as string) || 10, 100);

      const lootTableStore = stores.get('loot-tables');
      if (!lootTableStore) {
        res.status(500).json({ error: 'Loot table store not initialized' });
        return;
      }

      const lootTable = (await lootTableStore.getById(id)) as unknown as LootTableDefinition | undefined;
      if (!lootTable) {
        res.status(404).json({ error: `Loot table '${id}' not found` });
        return;
      }

      if (!lootTable.entries || lootTable.entries.length === 0) {
        res.json({
          drops: [],
          summary: {
            totalDrops: 0,
            itemDistribution: {},
            averageItemsPerDrop: 0,
          },
        });
        return;
      }

      // Run simulation
      const drops: DropResult[] = [];
      const itemDistribution: Record<string, number> = {};

      for (let i = 0; i < count; i++) {
        const drop = simulateDrop(lootTable);
        drops.push(drop);

        // Track item distribution
        for (const item of drop.items) {
          itemDistribution[item.itemId] = (itemDistribution[item.itemId] || 0) + item.quantity;
        }
      }

      // Calculate summary stats
      const totalItems = drops.reduce((sum, drop) => sum + drop.items.length, 0);
      const summary: SimulationSummary = {
        totalDrops: count,
        itemDistribution,
        averageItemsPerDrop: totalItems / count,
      };

      res.json({ drops, summary });
    } catch (err) {
      console.error('[Admin] Failed to simulate loot table:', err);
      res.status(500).json({ error: 'Failed to simulate loot table' });
    }
  });

  // ─── POST /admin/api/simulate/creature/:id/reroll ────────────────────
  router.post('/admin/api/simulate/creature/:id/reroll', adminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const count = Math.min(parseInt(req.query.count as string) || 5, 20);

      const creatureStore = stores.get('creatures');
      if (!creatureStore) {
        res.status(500).json({ error: 'Creature store not initialized' });
        return;
      }

      const creature = (await creatureStore.getById(id)) as unknown as CreatureDefinition | undefined;
      if (!creature) {
        res.status(404).json({ error: `Creature '${id}' not found` });
        return;
      }

      // Construct baseline stats from flat entity properties
      const baseline = {
        maxHp: creature.maxHp,
        attack: creature.attack,
        defence: creature.defence,
        armour: creature.armour,
      };

      if (baseline.maxHp == null && baseline.attack == null) {
        res.status(400).json({ error: 'Creature has no stats defined' });
        return;
      }

      // Generate N stat variations
      const rolls: CreatureRoll[] = [];
      for (let i = 0; i < count; i++) {
        rolls.push(rollCreatureStats(baseline));
      }

      res.json({ baseline, rolls, count });
    } catch (err) {
      console.error('[Admin] Failed to simulate creature reroll:', err);
      res.status(500).json({ error: 'Failed to simulate creature reroll' });
    }
  });

  return router;
}

// ─── Simulation Logic ────────────────────────────────────────────────────────

/**
 * Simulate a single loot drop from a loot table.
 * Uses weighted random selection based on dropWeight.
 */
function simulateDrop(lootTable: LootTableDefinition): DropResult {
  const { entries, minDrops, maxDrops } = lootTable;

  // Determine number of items to drop (random between minDrops and maxDrops)
  const numDrops = Math.floor(Math.random() * (maxDrops - minDrops + 1)) + minDrops;

  // Calculate total weight
  const totalWeight = entries.reduce((sum, entry) => sum + entry.dropWeight, 0);

  const items: DroppedItem[] = [];

  for (let i = 0; i < numDrops; i++) {
    const roll = Math.random() * totalWeight;
    let cumulative = 0;

    for (const entry of entries) {
      cumulative += entry.dropWeight;
      if (roll <= cumulative) {
        // This entry was selected
        const quantity = Math.floor(
          Math.random() * (entry.maxQuantity - entry.minQuantity + 1)
        ) + entry.minQuantity;

        const chance = (entry.dropWeight / totalWeight) * 100;

        items.push({
          itemId: entry.itemId,
          quantity,
          chance: Math.round(chance * 100) / 100,
        });
        break;
      }
    }
  }

  return { items, totalWeight };
}

interface BaselineStats {
  maxHp: number;
  attack: number;
  defence: number;
  armour: number;
}

/**
 * Roll creature stats with variance.
 * Applies ±10% variance to each stat for simulation purposes.
 */
function rollCreatureStats(baseline: BaselineStats): CreatureRoll {
  const variance = 0.1; // ±10%

  const hpVariance = (Math.random() * 2 - 1) * variance;
  const attackVariance = (Math.random() * 2 - 1) * variance;
  const defenceVariance = (Math.random() * 2 - 1) * variance;
  const armourVariance = (Math.random() * 2 - 1) * variance;

  return {
    stats: {
      maxHp: Math.round(baseline.maxHp * (1 + hpVariance)),
      attack: Math.round(baseline.attack * (1 + attackVariance)),
      defence: Math.round(baseline.defence * (1 + defenceVariance)),
      armour: Math.round(baseline.armour * (1 + armourVariance)),
    },
    variance: {
      hpVariance: Math.round(hpVariance * 100),
      attackVariance: Math.round(attackVariance * 100),
      defenceVariance: Math.round(defenceVariance * 100),
      armourVariance: Math.round(armourVariance * 100),
    },
  };
}
