/**
 * Content store initialization — creates all 8 content stores.
 *
 * When usePg=true (DATABASE_URL set), every entity type routes to a
 * dedicated relational store backed by its own table:
 *   items       → PgItemDefinitionsStore         (migration 002)
 *   modifiers   → PgModifierDefinitionsStore     (migration 021)
 *   narrative   → PgNarrativeDefinitionsStore    (migration 022)
 *   creatures   → PgCreatureDefinitionsStore     (migration 023)
 *   factions    → PgFactionDefinitionsStore      (migration 004+025)
 *   skills      → PgSkillDefinitionsStore        (migration 026)
 *   loot-tables → PgLootTableDefinitionsStore    (migration 027)
 *   rooms       → PgRoomDefinitionsStore         (migration 028)
 *
 * The legacy content_definitions JSONB table is dropped in migration 029.
 *
 * When usePg=false (dev mode), returns in-memory ContentStore instances
 * pre-populated from existing game registries:
 *   - Items: from ContentRegistry (DB-driven)
 *   - Creatures: from creature template exports
 *   - Modifiers: 5 shard modifiers
 *   - Factions: 3 known factions
 *
 * Skills, loot-tables, rooms, and narrative start empty in dev mode.
 */

import { ContentStore, type ContentEntity, type IContentStore } from './ContentStore.js';
import type { ContentEntityType } from './content-types.js';
import { PgItemDefinitionsStore } from './PgItemDefinitionsStore.js';
import { PgModifierDefinitionsStore } from './PgModifierDefinitionsStore.js';
import { PgNarrativeDefinitionsStore } from './PgNarrativeDefinitionsStore.js';
import { PgCreatureDefinitionsStore } from './PgCreatureDefinitionsStore.js';
import { PgFactionDefinitionsStore } from './PgFactionDefinitionsStore.js';
import { PgSkillDefinitionsStore } from './PgSkillDefinitionsStore.js';
import { PgLootTableDefinitionsStore } from './PgLootTableDefinitionsStore.js';
import { PgRoomDefinitionsStore } from './PgRoomDefinitionsStore.js';
import { getAllItemDefinitions } from '../../items/registry.js';
import { DROWNED_REVENANT } from '../../creatures/templates/drowned-revenant.js';


export function initializeContentStores(usePg = false): Map<ContentEntityType, IContentStore<ContentEntity>> {
  if (usePg) {
    return initializePgStores();
  }
  return initializeInMemoryStores();
}

function initializePgStores(): Map<ContentEntityType, IContentStore<ContentEntity>> {
  const stores = new Map<ContentEntityType, IContentStore<ContentEntity>>();
  stores.set('items', new PgItemDefinitionsStore());
  stores.set('modifiers', new PgModifierDefinitionsStore());
  stores.set('narrative', new PgNarrativeDefinitionsStore());
  stores.set('creatures', new PgCreatureDefinitionsStore());
  stores.set('factions', new PgFactionDefinitionsStore());
  stores.set('skills', new PgSkillDefinitionsStore());
  stores.set('loot-tables', new PgLootTableDefinitionsStore());
  stores.set('rooms', new PgRoomDefinitionsStore());
  return stores;
}

function initializeInMemoryStores(): Map<ContentEntityType, IContentStore<ContentEntity>> {
  const stores = new Map<ContentEntityType, IContentStore<ContentEntity>>();

  // ─── Items — seed from existing registry ─────────────────────────
  const items = getAllItemDefinitions().map((item) => ({
    ...item,
    baseStats: { ...item.baseStats },
  }));
  stores.set('items', new ContentStore('items', items as unknown as ContentEntity[]));

  // ─── Creatures — seed from templates (add 'id' = 'type' for store) ─
  const creatureTemplates = [DROWNED_REVENANT].map((t) => ({
    ...t,
    id: t.type, // ContentStore keyed by 'id'
    stats: { ...t.stats },
    lootTable: t.lootTable.map((l) => ({ ...l })),
    spawnRules: { ...t.spawnRules },
  }));
  stores.set('creatures', new ContentStore('creatures', creatureTemplates as unknown as ContentEntity[]));

  // ─── Modifiers — seed from ZoneModifier enum ─────────────────────
  const modifiers = [
    { id: 'darkness', name: 'Darkness', description: 'Reduced visibility. Sound-based detection emphasized.', effects: { visibility: -50, soundRange: 2 }, stackable: false, tags: ['environmental', 'stealth'] },
    { id: 'hunted', name: 'Hunted', description: 'Creatures are aggressive and patrol more frequently.', effects: { creatureAggro: 2, patrolSpeed: 1.5 }, stackable: false, tags: ['creature', 'danger'] },
    { id: 'silent', name: 'Silent', description: 'Sound propagation severely dampened.', effects: { soundRange: -3, stealthBonus: 20 }, stackable: false, tags: ['environmental', 'stealth'] },
    { id: 'echoing', name: 'Echoing', description: 'Sound carries further. Stealth is harder.', effects: { soundRange: 3, stealthPenalty: -15 }, stackable: false, tags: ['environmental', 'sound'] },
    { id: 'bountiful', name: 'Bountiful', description: 'Increased loot quality and quantity.', effects: { lootMultiplier: 1.5, rarityBonus: 1 }, stackable: false, tags: ['loot', 'reward'] },
  ];
  stores.set('modifiers', new ContentStore('modifiers', modifiers as unknown as ContentEntity[]));

  // ─── Factions — seed from known factions ──────────────────────────
  const factions = [
    { id: 'ironhearth', name: 'Ironhearth', description: 'Builders and defenders. They forge the Refuge\'s walls.', milestones: [{ name: 'Wall Menders', threshold: 100, description: 'Basic fortifications restored.' }], events: [] },
    { id: 'veilwalkers', name: 'Veilwalkers', description: 'Scouts and scholars who chart the unknown.', milestones: [{ name: 'Pathfinders', threshold: 100, description: 'New routes mapped.' }], events: [] },
    { id: 'ashborn', name: 'Ashborn', description: 'Warriors hardened by loss. They push deeper than anyone.', milestones: [{ name: 'First Blood', threshold: 100, description: 'Veteran status recognized.' }], events: [] },
  ];
  stores.set('factions', new ContentStore('factions', factions as unknown as ContentEntity[]));

  // ─── Skills — start empty ─────────────────────────────────────────
  stores.set('skills', new ContentStore('skills'));

  // ─── Loot Tables — start empty ────────────────────────────────────
  stores.set('loot-tables', new ContentStore('loot-tables'));

  // ─── Room Templates — start empty ─────────────────────────────────
  stores.set('rooms', new ContentStore('rooms'));

  // ─── Narrative Templates — start empty ────────────────────────────
  stores.set('narrative', new ContentStore('narrative'));

  return stores;
}
