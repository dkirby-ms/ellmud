/**
 * Systems module barrel export.
 */

export { TraceSystem, resetTraceIdCounter, MAX_TRACES_PER_ROOM, type TraceDescription, type PlayerSkills } from './TraceSystem.js';
export { AwarenessSystem, type AwarenessSkills, type AwarenessPlayer } from './AwarenessSystem.js';
export {
  DowningSystem,
  BLEED_OUT_TICKS,
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
  getShardSicknessDebuff,
  applyShardSickness,
  isShardSicknessActive,
  InMemoryShardSicknessStore,
  MAX_PENALTY,
  STACK_RATE,
  SHARD_SICKNESS_DURATION_S,
  type ShardSicknessDebuff,
  type ShardSicknessStore,
  type CombatStatModifiers,
} from './ShardSickness.js';
