/**
 * Effective stat calculations — resolves base stats + equipment into runtime values.
 *
 * Phase 1: weapon skill + weapon damage = attack, base armour + gear armour, etc.
 * No buff layer, no zone modifiers yet.
 */

import type { CombatStats, EquipmentBonuses, WeaponType, ItemStats } from './CombatState.js';

/** Map WeaponType to the corresponding base stat key on CombatStats. */
const WEAPON_SKILL_KEY: Record<WeaponType, keyof CombatStats> = {
  unarmed: 'unarmed',
  one_handed: 'oneHanded',
  two_handed: 'twoHanded',
  ranged: 'ranged',
};

/** Effective combat values after equipment is applied. */
export interface EffectiveStats {
  maxHp: number;
  attack: number;
  armour: number;
  shieldBlock: number;
  dodge: number;
}

/**
 * Calculate equipment bonuses from a loadout.
 *
 * @param slots  Map of slot name → item stats (or null when empty).
 *               Callers extract ItemStats from their loadout data before calling.
 */
export function calculateEquipmentBonuses(
  slotItems: { slot: string; stats: ItemStats | null }[],
): EquipmentBonuses {
  let weaponSkill: WeaponType = 'unarmed';
  let weaponDamage = 0;
  let armour = 0;
  let shieldBlock = 0;

  for (const { slot, stats } of slotItems) {
    if (!stats) continue;

    // Weapon slots: main_hand (and off_hand for dual-wield in the future)
    if (slot === 'main_hand' && stats.weaponType) {
      weaponSkill = stats.weaponType;
      weaponDamage += stats.weaponDamage ?? 0;
    }

    // Armour from any slot
    if (stats.armour) {
      armour += stats.armour;
    }

    // Shield block from off_hand (shields go in off_hand)
    if (slot === 'off_hand' && stats.shieldBlock) {
      shieldBlock += stats.shieldBlock;
    }
  }

  return { weaponSkill, weaponDamage, armour, shieldBlock };
}

/**
 * Merge base player stats with equipment bonuses into runtime effective values.
 *
 * - attack = weapon skill value (from base stats) + weapon damage (from equipment)
 * - armour = base armour + equipment armour
 * - shieldBlock = base shieldBlock + equipment shieldBlock
 * - dodge = base dodge (no equipment modifier in Phase 1)
 */
export function calculatePlayerEffectiveStats(
  base: CombatStats,
  equipment: EquipmentBonuses,
): EffectiveStats {
  const skillKey = WEAPON_SKILL_KEY[equipment.weaponSkill];
  const weaponSkillValue = base[skillKey] as number;

  return {
    maxHp: base.maxHp,
    attack: weaponSkillValue + equipment.weaponDamage,
    armour: base.armour + equipment.armour,
    shieldBlock: equipment.shieldBlock > 0 ? base.shieldBlock + equipment.shieldBlock : 0,
    dodge: base.dodge,
  };
}

/**
 * Calculate effective stats for a creature (no equipment layer).
 * Creature's "attack" is its highest weapon skill value.
 */
export function calculateCreatureEffectiveStats(base: CombatStats): EffectiveStats {
  const bestSkill = Math.max(base.unarmed, base.oneHanded, base.twoHanded, base.ranged);
  return {
    maxHp: base.maxHp,
    attack: bestSkill,
    armour: base.armour,
    shieldBlock: base.shieldBlock,
    dodge: base.dodge,
  };
}

/**
 * Extract combat-relevant ItemStats from an item_definitions.base_stats JSONB blob.
 *
 * Handles both the legacy seed format ({damage, speed, armour, weight}) and the
 * canonical combat ItemStats format ({weaponType, weaponDamage, armour, shieldBlock}).
 */
export function extractCombatItemStats(
  itemType: string,
  baseStats: Record<string, unknown>,
): ItemStats {
  const stats: ItemStats = {};

  if (itemType === 'weapon') {
    stats.weaponType = (baseStats.weaponType as WeaponType | undefined) ?? 'one_handed';
    stats.weaponDamage =
      (typeof baseStats.weaponDamage === 'number' ? baseStats.weaponDamage : undefined) ??
      (typeof baseStats.damage === 'number' ? baseStats.damage : 0);
  }

  if (typeof baseStats.armour === 'number') stats.armour = baseStats.armour;
  if (typeof baseStats.shieldBlock === 'number') stats.shieldBlock = baseStats.shieldBlock;

  return stats;
}
