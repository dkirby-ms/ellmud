/**
 * seed-player-stash.ts — One-shot utility to populate a player's stash
 * with Volo's seed item catalog via direct DB insertion.
 *
 * Usage:
 *   DATABASE_URL=postgresql://ellmud:ellmud_dev@localhost:5434/ellmud \
 *     npx tsx packages/server/src/dev/seed-player-stash.ts [player-username]
 *
 * If no username is given, picks the first player found.
 */

import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://ellmud:ellmud_dev@localhost:5434/ellmud';

// ─── Seed Item Catalog (mirrors seed-items.ts, flattened for raw SQL) ───────

interface SeedItem {
  name: string;
  type: string;
  tier: string;
  weight: number;
  description: string;
  baseDurability: number | null;
}

const SEED_ITEMS: SeedItem[] = [
  // Weapons
  { name: 'Rusty Shiv',         type: 'weapon',     tier: 'scrap',      weight: 2,  description: 'A jagged shard of metal wrapped in sinew. Better than bare fists.', baseDurability: 20 },
  { name: 'Ash-Forged Axe',     type: 'weapon',     tier: 'common',     weight: 7,  description: 'A heavy hatchet blackened by cinder. Splits bone and wood alike.', baseDurability: 45 },
  { name: 'Bonecleaver',        type: 'weapon',     tier: 'sturdy',     weight: 9,  description: 'A brutal falchion edged with riveted bone. It does not cut clean.', baseDurability: 60 },
  { name: 'Shardsteel Glaive',  type: 'weapon',     tier: 'refined',    weight: 10, description: 'A polearm of shard-infused metal. Hums faintly in the dark.', baseDurability: 80 },
  { name: 'The Pale Edge',      type: 'weapon',     tier: 'masterwork', weight: 5,  description: 'A longsword white as drowned bone. The edge never dulls.', baseDurability: 120 },
  { name: "Entropy's Maw",      type: 'weapon',     tier: 'anomalous',  weight: 4,  description: 'A blade that unravels what it touches. Looking at it hurts.', baseDurability: 150 },
  // Head armour
  { name: 'Dented Skullcap',    type: 'armour',     tier: 'scrap',      weight: 3,  description: 'A bent iron cap. Stops one hit, maybe two.', baseDurability: 20 },
  { name: 'Iron Casque',        type: 'armour',     tier: 'common',     weight: 5,  description: 'Standard helm with a narrow visor. Limits sight, saves skulls.', baseDurability: 40 },
  { name: "Warden's Halfhelm",  type: 'armour',     tier: 'sturdy',     weight: 6,  description: 'Open-faced helm from the old Refuge guard. Still bears their crest.', baseDurability: 55 },
  // Chest armour
  { name: "Scavenger's Vest",   type: 'armour',     tier: 'scrap',      weight: 6,  description: 'Layers of scrap leather stitched over rags. Smells of rot.', baseDurability: 25 },
  { name: 'Boiled Leather Cuirass', type: 'armour',  tier: 'common',    weight: 12, description: 'Hardened leather torso armour. Reliable, if unlovely.', baseDurability: 50 },
  { name: 'Shardweave Hauberk', type: 'armour',     tier: 'refined',    weight: 14, description: 'Chain links woven with shard-metal threads. Light for its strength.', baseDurability: 75 },
  // Legs armour
  { name: 'Patched Breeches',   type: 'armour',     tier: 'scrap',      weight: 3,  description: 'More patch than cloth. They hold together, mostly.', baseDurability: 15 },
  { name: 'Chainmail Greaves',  type: 'armour',     tier: 'common',     weight: 8,  description: 'Chain leggings buckled over padded linen.', baseDurability: 45 },
  { name: 'Masterwork Cuisses', type: 'armour',     tier: 'masterwork', weight: 10, description: 'Articulated thigh plates of flawless craft. Move like a second skin.', baseDurability: 100 },
  // Feet armour
  { name: 'Rag-Wrapped Boots',  type: 'armour',     tier: 'scrap',      weight: 2,  description: 'Strips of cloth over cracked soles. Better than barefoot in the shards.', baseDurability: 10 },
  { name: 'Ironshod Treads',    type: 'armour',     tier: 'common',     weight: 5,  description: 'Sturdy boots with iron-capped toes. Good on wet stone.', baseDurability: 40 },
  { name: 'Voidwalker Sabatons',type: 'armour',     tier: 'anomalous',  weight: 4,  description: 'Footwear from beyond the collapse. They leave no prints.', baseDurability: 130 },
  // Hands armour
  { name: 'Fingerless Wraps',   type: 'armour',     tier: 'scrap',      weight: 1,  description: 'Frayed linen wound tight around the knuckles.', baseDurability: 10 },
  { name: 'Riveted Gauntlets',  type: 'armour',     tier: 'common',     weight: 4,  description: 'Iron-studded leather gloves. Grip like a vice.', baseDurability: 35 },
  { name: 'Flayed-Hide Grips',  type: 'armour',     tier: 'sturdy',     weight: 3,  description: 'Cured from something that once lived in the shards. Supple and warm.', baseDurability: 50 },
  // Offhand / tools
  { name: 'Rusted Lantern',     type: 'tool',       tier: 'common',     weight: 3,  description: 'A battered oil lantern. Throws weak light but it beats the dark.', baseDurability: 30 },
  { name: 'Iron Buckler',       type: 'tool',       tier: 'sturdy',     weight: 6,  description: "A small round shield. Won't stop a halberd, but deflects the rest.", baseDurability: 55 },
  { name: 'Bone Stiletto',      type: 'weapon',     tier: 'common',     weight: 1,  description: 'A needle of sharpened femur. Offhand favourite of the desperate.', baseDurability: 25 },
  // Rings (material type)
  { name: 'Tarnished Band',     type: 'material',   tier: 'scrap',      weight: 0.5, description: 'A corroded ring of unknown metal. Might be copper. Might be worse.', baseDurability: null },
  { name: 'Whispering Ring',    type: 'material',   tier: 'sturdy',     weight: 0.5, description: 'Faint voices leak from the stone. You learn to ignore them.', baseDurability: null },
  { name: 'Blightstone Ring',   type: 'material',   tier: 'refined',    weight: 0.5, description: 'Cut from cursed quartzite. Warm to the touch, always.', baseDurability: null },
  // Amulets (material type)
  { name: 'Hollow-Eye Pendant', type: 'material',   tier: 'common',     weight: 1,  description: 'A bone disc with a hole bored through centre. Ward against the deep.', baseDurability: null },
  { name: 'Shard-Touched Medallion', type: 'material', tier: 'masterwork', weight: 1, description: 'Metal fused with crystallised shard-energy. Pulses like a heartbeat.', baseDurability: null },
  // Shard keys
  { name: 'Bone Shard Key',     type: 'key',        tier: 'common',     weight: 1,  description: 'A key carved from revenant bone. Opens Tier 1 shards.', baseDurability: null },
  { name: 'Iron Shard Key',     type: 'key',        tier: 'sturdy',     weight: 1,  description: 'A blackened iron key etched with shard-glyphs. Opens Tier 2 shards.', baseDurability: null },
  { name: 'Crystal Shard Key',  type: 'key',        tier: 'refined',    weight: 1,  description: 'A translucent key that refracts light wrong. Opens Tier 3 shards.', baseDurability: null },
  // Consumables
  { name: 'Stale Ration',       type: 'consumable', tier: 'scrap',      weight: 1,  description: 'Hard bread and salt meat. Tastes like regret. Heals a little.', baseDurability: null },
  { name: 'Blackmoss Salve',    type: 'consumable', tier: 'common',     weight: 1,  description: 'A poultice brewed from shard-grown moss. Stings, but mends flesh.', baseDurability: null },
  { name: 'Bottled Vigour',     type: 'consumable', tier: 'sturdy',     weight: 1,  description: 'Amber liquid that burns going down. Restores stamina fast.', baseDurability: null },
  { name: 'Elixir of Mending',  type: 'consumable', tier: 'refined',    weight: 2,  description: 'A rare draught from Refuge alchemists. Knits wounds shut in seconds.', baseDurability: null },
  // Crafting materials / junk
  { name: 'Corroded Nails',     type: 'material',   tier: 'scrap',      weight: 1,  description: 'A fistful of bent nails scavenged from a collapsed doorframe.', baseDurability: null },
  { name: 'Revenant Marrow',    type: 'material',   tier: 'common',     weight: 2,  description: 'Viscous black marrow from a shard creature. Alchemists pay well.', baseDurability: null },
  { name: 'Void Residue',       type: 'material',   tier: 'anomalous',  weight: 1,  description: 'A shimmering dust that floats upward. Handle with extreme care.', baseDurability: null },
  { name: 'Waterlogged Crate',  type: 'material',   tier: 'scrap',      weight: 40, description: 'A heavy salvage crate. Contents unknown. Too stubborn to abandon.', baseDurability: null },
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });

  try {
    // 1. Resolve target player
    const targetUsername = process.argv[2];
    const playerResult = targetUsername
      ? await pool.query('SELECT id, username FROM players WHERE username = $1', [targetUsername])
      : await pool.query('SELECT id, username FROM players ORDER BY created_at LIMIT 1');

    if (playerResult.rows.length === 0) {
      console.error('❌ No player found. Create a character first.');
      process.exit(1);
    }

    const player = playerResult.rows[0];
    console.log(`🎯 Target player: "${player.username}" (${player.id})`);

    // 2. Insert item definitions (idempotent — skip if name already exists)
    const itemIdMap = new Map<string, string>(); // name → UUID

    for (const item of SEED_ITEMS) {
      // Check if already catalogued (no unique constraint on name)
      const existing = await pool.query<{ id: string }>(
        'SELECT id FROM item_definitions WHERE name = $1 LIMIT 1',
        [item.name],
      );

      if (existing.rows.length > 0) {
        itemIdMap.set(item.name, existing.rows[0].id);
        continue;
      }

      const stats = {
        weight: item.weight,
        ...(item.baseDurability != null ? { baseDurability: item.baseDurability } : {}),
      };

      const res = await pool.query<{ id: string }>(
        `INSERT INTO item_definitions (name, type, tier, stats, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [item.name, item.type, item.tier, JSON.stringify(stats), item.description],
      );

      itemIdMap.set(item.name, res.rows[0].id);
    }

    console.log(`📦 ${itemIdMap.size} item definitions in catalog.`);

    // 3. Clear existing stash for a clean slate
    const deleted = await pool.query(
      'DELETE FROM player_stash WHERE player_id = $1',
      [player.id],
    );
    if (deleted.rowCount && deleted.rowCount > 0) {
      console.log(`🗑️  Cleared ${deleted.rowCount} existing stash entries.`);
    }

    // 4. Insert stash entries — one per item, plus bonus stacks for testing
    let inserted = 0;

    for (const item of SEED_ITEMS) {
      const itemDefId = itemIdMap.get(item.name);
      if (!itemDefId) continue;

      const metadata: Record<string, unknown> = {};
      if (item.baseDurability != null) {
        metadata.maxDurability = item.baseDurability;
      }

      await pool.query(
        `INSERT INTO player_stash (player_id, item_id, quantity, durability, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          player.id,
          itemDefId,
          1,
          item.baseDurability,
          JSON.stringify(metadata),
        ],
      );
      inserted++;
    }

    // Bonus stacks: extra Corroded Nails (×5) and Stale Rations (×3)
    const nailsId = itemIdMap.get('Corroded Nails');
    if (nailsId) {
      await pool.query(
        `INSERT INTO player_stash (player_id, item_id, quantity, durability, metadata)
         VALUES ($1, $2, $3, NULL, '{}')`,
        [player.id, nailsId, 5],
      );
      inserted++;
    }

    const rationsId = itemIdMap.get('Stale Ration');
    if (rationsId) {
      await pool.query(
        `INSERT INTO player_stash (player_id, item_id, quantity, durability, metadata)
         VALUES ($1, $2, $3, NULL, '{}')`,
        [player.id, rationsId, 3],
      );
      inserted++;
    }

    console.log(`✅ Inserted ${inserted} stash entries for "${player.username}".`);
    console.log('   Stash is loaded. Go test your loadout.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('💀 Fatal:', err.message);
  process.exit(1);
});
