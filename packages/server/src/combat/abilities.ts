/**
 * Ability system — definitions, effects, and resolution logic.
 *
 * GDD §6.3: Players have 5 ability slots with cooldowns and stamina costs.
 * Each ability has a type, effects, and resource requirements.
 */

// ─── Ability Types ──────────────────────────────────────────────────────────

export type AbilityType =
  | 'attack'
  | 'defence'
  | 'utility'
  | 'aoe_attack'
  | 'group_buff'
  | 'group_heal'
  | 'taunt';

// ─── Ability Effects ────────────────────────────────────────────────────────

/** Effect applied when an ability is used. */
export interface AbilityEffect {
  type: 'damage' | 'damage_reduction' | 'reveal_stats' | 'heal' | 'buff' | 'debuff';
  /** Damage multiplier for attack abilities (e.g., 1.5 for Heavy Strike). */
  damageMultiplier?: number;
  /** Flat damage reduction for defence abilities (e.g., 5 for Block). */
  damageReduction?: number;
  /** Duration in ticks for buffs/debuffs. */
  duration?: number;
  /** Additional properties for future expansion. */
  [key: string]: unknown;
}

// ─── Ability Definition ─────────────────────────────────────────────────────

export interface AbilityDefinition {
  id: string;
  name: string;
  type: AbilityType;
  /** Cooldown in ticks before ability can be used again. */
  cooldownTicks: number;
  /** Stamina cost to use the ability. */
  staminaCost: number;
  /** Effects applied when ability is used. */
  effects: AbilityEffect[];
}

// ─── Default Abilities ──────────────────────────────────────────────────────

/** Heavy Strike — higher damage, longer cooldown (GDD §6.3). */
export const HEAVY_STRIKE: AbilityDefinition = {
  id: 'heavy_strike',
  name: 'Heavy Strike',
  type: 'attack',
  cooldownTicks: 3,
  staminaCost: 15,
  effects: [{ type: 'damage', damageMultiplier: 1.5 }],
};

/** Block — damage reduction for this tick (GDD §6.3). */
export const BLOCK: AbilityDefinition = {
  id: 'block',
  name: 'Block',
  type: 'defence',
  cooldownTicks: 2,
  staminaCost: 10,
  effects: [{ type: 'damage_reduction', damageReduction: 5 }],
};

/** Observe — reveals creature stats/health (GDD §6.3). */
export const OBSERVE: AbilityDefinition = {
  id: 'observe',
  name: 'Observe',
  type: 'utility',
  cooldownTicks: 0,
  staminaCost: 5,
  effects: [{ type: 'reveal_stats' }],
};

/** Registry of all default abilities. */
export const DEFAULT_ABILITIES = new Map<string, AbilityDefinition>([
  [HEAVY_STRIKE.id, HEAVY_STRIKE],
  [BLOCK.id, BLOCK],
  [OBSERVE.id, OBSERVE],
]);

// ─── Ability Slots ──────────────────────────────────────────────────────────

/** Player ability loadout — 5 slots mapped to hotkeys 1-5 (GDD §6.3). */
export interface AbilitySlots {
  slot1?: string; // ability ID
  slot2?: string;
  slot3?: string;
  slot4?: string;
  slot5?: string;
}

/** Get ability definition by ID. */
export function getAbilityDefinition(abilityId: string): AbilityDefinition | undefined {
  return DEFAULT_ABILITIES.get(abilityId);
}
