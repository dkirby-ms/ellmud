/**
 * Systems module barrel export.
 */

export { TraceSystem, resetTraceIdCounter, MAX_TRACES_PER_ROOM, type TraceDescription, type PlayerSkills } from './TraceSystem.js';
export { AwarenessSystem, type AwarenessSkills, type AwarenessPlayer } from './AwarenessSystem.js';
export { WeatherSystem, type WeatherConfig } from './WeatherSystem.js';
export { NPCSystem, type NPCEvent, REFUGE_NPCS, NPC_IDLE_INTERVAL } from './NPCSystem.js';
export { AmbientSystem, ATMOSPHERE_INTERVAL, type AmbientSystemConfig } from './AmbientSystem.js';
export {
  DowningSystem,
  BLEED_OUT_TICKS,
  BLEED_HP_LOSS,
  STABILIZE_CHANNEL_TICKS,
  BANDAGE_ITEM_ID,
  type DownedPlayer,
  type DownedState,
  type StabilizeChannel,
  type DowningEvent,
  type DowningEventType,
} from './DowningSystem.js';
export {
  calculateStatMultiplier,
  getDeathPenaltyDebuff,
  applyDeathPenalty,
  isDeathPenaltyActive,
  InMemoryDeathPenaltyStore,
  MAX_PENALTY,
  STACK_RATE,
  DEATH_PENALTY_DURATION_S,
  type DeathPenaltyDebuff,
  type DeathPenaltyStore,
  type CombatStatModifiers,
} from './DeathPenalty.js';
export { PgDeathPenaltyStore } from './PgDeathPenaltyStore.js';
export {
  initDeathPenaltyProvider,
  getDeathPenaltyStore,
  resetDeathPenaltyProvider,
} from './death-penalty-provider.js';
export { CorpseSystem, resetCorpseIdCounter, type Corpse } from './CorpseSystem.js';
