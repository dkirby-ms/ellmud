/**
 * Flooded Crypt biome — room templates for Tier 1 shards.
 * GDD §10.2: "Waterlogged tombs, dripping stone"
 */

import type { RoomType } from '@ellmud/shared';

// ─── Room Name Templates ────────────────────────────────────────────────────

export const ROOM_NAMES: Record<RoomType, readonly string[]> = {
  entry: [
    'Drowned Vestibule',
    'Sunken Threshold',
    'Waterlogged Gate',
    'Flooded Antechamber',
  ],
  extraction: [
    'Crumbling Breach',
    'Fissure Ascent',
    'Collapsed Stairwell',
    'Eroded Vent',
  ],
  boss: [
    'Sanctum of the Drowned',
    'Revenants\' Throne',
    'The Ossuary Heart',
  ],
  corridor: [
    'Submerged Gallery',
    'Waterlogged Passage',
    'Dripping Corridor',
    'Moss-Choked Tunnel',
    'Brackish Channel',
    'Sunken Walkway',
    'Fungal-Lit Passage',
    'Silted Hallway',
  ],
  junction: [
    'Flooded Crossroads',
    'Tidal Junction',
    'Rotting Intersection',
    'Branching Cistern',
    'Cracked Atrium',
    'Collapsed Forum',
  ],
  dead_end: [
    'Waterlogged Alcove',
    'Sealed Reliquary',
    'Drowned Cell',
    'Stagnant Niche',
    'Bone-Strewn Recess',
  ],
  // Feature rooms — placeholders; biome-specific names TBD when feature rooms enter generation
  feature_stash: ['Secure Alcove'],
  feature_shardboard: ['Etched Vestibule'],
  feature_marketplace: ['Sunken Bazaar'],
  feature_crafting: ['Flooded Workshop'],
  feature_training: ['Drowned Sparring Hall'],
  feature_contracts: ['Waterlogged Notice Board'],
  feature_infirmary: ['Damp Infirmary'],
};

// ─── Room Description Templates ─────────────────────────────────────────────

export const ROOM_DESCRIPTIONS: Record<RoomType, readonly string[]> = {
  entry: [
    'Pale light seeps through cracked stone above. Ankle-deep water sloshes with each step. This is where the shard begins — and where retreat is still possible.',
    'A jagged opening in the earth leads down into darkness. Water drips steadily from the ceiling, pooling on worn flagstones.',
  ],
  extraction: [
    'A narrow fissure in the wall reveals a sliver of grey sky. The water here is shallower — the ground slopes upward. This could be a way out.',
    'Broken masonry has created a gap in the ceiling. Cold air rushes down. With effort, one could climb free of this place.',
  ],
  boss: [
    'The water here is waist-deep and unnervingly still. Ancient pillars ring a raised stone platform. Something stirs beneath the surface — something that has waited a very long time.',
    'A vast chamber opens before you, its ceiling lost in shadow. The air is thick with the stench of brine and old death. The water pulses with a slow, rhythmic current, as if the crypt itself breathes.',
  ],
  corridor: [
    'Water seeps through cracks in the stone walls. The passage stretches ahead, slick and dark.',
    'Dripping echoes fill this narrow tunnel. The flagstones are uneven, some submerged entirely.',
    'Green algae clings to the walls. The water here is knee-deep and murky.',
    'A long gallery, its walls lined with empty niches. Water laps gently against eroded stone.',
  ],
  junction: [
    'Several passages branch from this flooded chamber. Water flows in conflicting directions, making it impossible to tell which path leads deeper.',
    'A wide room where corridors converge. The ceiling is higher here, and the sound of dripping echoes from every direction.',
  ],
  dead_end: [
    'The passage narrows to nothing. Water pools here, deeper than elsewhere — something may be hidden beneath.',
    'A collapsed wall blocks further progress. Among the rubble, you spot the glint of something half-buried.',
    'A small alcove, barely large enough to stand in. The walls are carved with worn symbols.',
  ],
  // Feature rooms — placeholders; biome-specific descriptions TBD when feature rooms enter generation
  feature_stash: ['A recessed alcove sealed by a heavy iron grate. The air smells of rust and damp cloth.'],
  feature_shardboard: ['Faded etchings cover a smooth stone slab set into the wall. Notices have been pinned with bone splints.'],
  feature_marketplace: ['A vaulted chamber where merchants once gathered. Waterlogged stalls line the perimeter.'],
  feature_crafting: ['Workbenches and scattered tools suggest this was once a place of making. The forge is cold.'],
  feature_training: ['A wide, low-ceilinged room with weapon racks and scarred practice dummies.'],
  feature_contracts: ['A sodden board mounted on the wall bears curled parchment — bounties and tasks, half-legible.'],
  feature_infirmary: ['Stone cots line the walls. A faint herbal scent lingers beneath the ever-present damp.'],
};

// ─── Loot Table Placeholder ─────────────────────────────────────────────────

export interface LootEntry {
  itemId: string;
  weight: number;  // relative drop weight
  type: 'crate' | 'chest' | 'altar' | 'corpse';
}

export const LOOT_TABLE: readonly LootEntry[] = [
  { itemId: 'rusty_blade', weight: 20, type: 'crate' },
  { itemId: 'waterlogged_potion', weight: 25, type: 'crate' },
  { itemId: 'corroded_shield', weight: 10, type: 'crate' },
  { itemId: 'crypt_key_fragment', weight: 5, type: 'chest' },
  { itemId: 'revenant_bone', weight: 15, type: 'corpse' },
  { itemId: 'sodden_scroll', weight: 12, type: 'crate' },
  { itemId: 'tarnished_amulet', weight: 8, type: 'chest' },
  { itemId: 'drowned_offering', weight: 5, type: 'altar' },
];

// ─── Hazard Placeholder ─────────────────────────────────────────────────────

export interface HazardTemplate {
  type: string;
  baseSeverity: number;
}

/** GDD §10.2: Signature hazard — "Rising water (room floods over time, reducing actions)" */
export const HAZARD_TEMPLATES: readonly HazardTemplate[] = [
  { type: 'rising_water', baseSeverity: 0.3 },
  { type: 'slippery_floor', baseSeverity: 0.1 },
  { type: 'crumbling_ceiling', baseSeverity: 0.2 },
  { type: 'submerged_trap', baseSeverity: 0.4 },
];
