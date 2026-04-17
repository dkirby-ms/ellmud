/**
 * Progression system — barrel export.
 */

export {
  type CombatSkillSlug,
  type XpGainResult,
  type CombatXpEvent,
  WEAPON_TYPE_TO_SKILL,
  BASE_XP_PER_ACTION,
  ZONE_TIER_XP_MULTIPLIER,
  SOFT_CAP_THRESHOLD,
  SOFT_CAP_DECAY_RATE,
  MIN_XP_GAIN,
  xpForNextLevel,
  cumulativeXpForLevel,
  softCapMultiplier,
  calculateXpGain,
  applyXpGain,
  skillForWeaponType,
} from './SkillProgression.js';

export type { PlayerSkillRecord, PlayerSkillsRepository } from './PlayerSkillsRepository.js';
export { PgPlayerSkillsRepository } from './PgPlayerSkillsRepository.js';
export { getSkillCategory } from './PgPlayerSkillsRepository.js';
export { InMemoryPlayerSkillsRepository } from './InMemoryPlayerSkillsRepository.js';
export {
  initSkillsProvider,
  getSkillsRepository,
  isSkillsPg,
  resetSkillsProvider,
} from './skills-provider.js';
