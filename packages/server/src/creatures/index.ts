/**
 * Creatures module barrel export.
 */

export { CreatureManager } from './CreatureManager.js';

export type {
  Creature,
  CreatureType,
  CreatureTemplate,
  CreatureAction,
  CreatureActionType,
  BehaviorState,
  LootEntry,
  SpawnRules,
} from './types.js';

export { updateCreature, type CreatureWorldState } from './behavior.js';
export { generateLoot, type LootItem } from './loot.js';

// ─── Creature Templates ──────────────────────────────────────────────────────
export { GUTTERSPAWN } from './templates/gutterspawn.js';
export { RUBBLE_SCAVENGER } from './templates/rubble-scavenger.js';
export { DROWNED_REVENANT } from './templates/drowned-revenant.js';
export { HOLLOW_STALKER } from './templates/hollow-stalker.js';
export { CONCRETE_SHAMBLER } from './templates/concrete-shambler.js';
export { RAZORWING_SWARM } from './templates/razorwing-swarm.js';
export { SCRAP_BRUTE } from './templates/scrap-brute.js';
export { MEMORY_ECHO } from './templates/memory-echo.js';
export { RUIN_COLOSSUS } from './templates/ruin-colossus.js';
export { FRACTURE_PHANTOM } from './templates/fracture-phantom.js';
export { ASH_WARDEN } from './templates/ash-warden.js';
export { THE_COLLAPSED_ONE } from './templates/the-collapsed-one.js';
export { THE_SOVEREIGN_OF_DUST } from './templates/the-sovereign-of-dust.js';
export { SLUDGE_CRAWLER } from './templates/sludge-crawler.js';
export { FLOOD_SCUTTLER } from './templates/flood-scuttler.js';
export { DROWNED_SWIMMER } from './templates/drowned-swimmer.js';
export { LAMPREY_MASS } from './templates/lamprey-mass.js';
export { PRESSURE_HORROR } from './templates/pressure-horror.js';
export { RUST_SIREN } from './templates/rust-siren.js';
export { TIDAL_LURKER } from './templates/tidal-lurker.js';
export { ELECTRICAL_EEL_CLUSTER } from './templates/electrical-eel-cluster.js';
export { LEVIATHAN_SPAWN } from './templates/leviathan-spawn.js';
export { DEPTH_SOVEREIGN } from './templates/depth-sovereign.js';
export { CORAL_AMALGAM } from './templates/coral-amalgam.js';
export { THE_DROWNED_CHOIR } from './templates/the-drowned-choir.js';
export { THE_ABYSSAL_MAW } from './templates/the-abyssal-maw.js';
export { BILE_RAT } from './templates/bile-rat.js';
export { MUTANT_HOUND } from './templates/mutant-hound.js';
export { SLIME_CREEPER } from './templates/slime-creeper.js';
export { RUST_BEETLE } from './templates/rust-beetle.js';
export { ACID_SPITTER } from './templates/acid-spitter.js';
export { HAZMAT_HORROR } from './templates/hazmat-horror.js';
export { FUNGAL_SHAMBLER } from './templates/fungal-shambler.js';
export { CHROME_SERPENT } from './templates/chrome-serpent.js';
export { MUTATION_TITAN } from './templates/mutation-titan.js';
export { TOXIC_WRAITH } from './templates/toxic-wraith.js';
export { CRYSTALLINE_BEHEMOTH } from './templates/crystalline-behemoth.js';
export { THE_SPILLMOTHER } from './templates/the-spillmother.js';
export { THORN_CREEPER } from './templates/thorn-creeper.js';
export { MOSS_WALKER } from './templates/moss-walker.js';
export { SPORE_POD } from './templates/spore-pod.js';
export { ROOT_HORROR } from './templates/root-horror.js';
export { BLOOM_BEAST } from './templates/bloom-beast.js';
export { FUNGAL_BRUTE } from './templates/fungal-brute.js';
export { VINE_STALKER } from './templates/vine-stalker.js';
export { POLLEN_WRAITH } from './templates/pollen-wraith.js';
export { FOREST_TITAN } from './templates/forest-titan.js';
export { MYCELIUM_SOVEREIGN } from './templates/mycelium-sovereign.js';
export { VERDANT_PREDATOR } from './templates/verdant-predator.js';
export { THE_GREEN_MOTHER } from './templates/the-green-mother.js';
export { SCRAP_GREMLIN } from './templates/scrap-gremlin.js';
export { SPARKER_DRONE } from './templates/sparker-drone.js';
export { RUST_SHAMBLER } from './templates/rust-shambler.js';
export { OIL_SLICK } from './templates/oil-slick.js';
export { SENTRY_BOT } from './templates/sentry-bot.js';
export { SHREDDER_UNIT } from './templates/shredder-unit.js';
export { ARC_WELDER } from './templates/arc-welder.js';
export { MALWARE_WRAITH } from './templates/malware-wraith.js';
export { DEMOLISHER_MECH } from './templates/demolisher-mech.js';
export { NANO_SWARM } from './templates/nano-swarm.js';
export { AI_CORE_CONSTRUCT } from './templates/ai-core-construct.js';
export { THE_ASSEMBLY_LINE } from './templates/the-assembly-line.js';
export { RAD_ROACH } from './templates/rad-roach.js';
export { IRRADIATED_SCAVENGER } from './templates/irradiated-scavenger.js';
export { DUST_DEVIL } from './templates/dust-devil.js';
export { WASTELAND_HOUND } from './templates/wasteland-hound.js';
export { GAMMA_GHOUL } from './templates/gamma-ghoul.js';
export { SCORCHED_BEHEMOTH } from './templates/scorched-behemoth.js';
export { RAD_WYRM } from './templates/rad-wyrm.js';
export { STORM_ELEMENTAL } from './templates/storm-elemental.js';
export { ATOMIC_COLOSSUS } from './templates/atomic-colossus.js';
export { FALLOUT_PHANTOM } from './templates/fallout-phantom.js';
export { MUTATION_APEX } from './templates/mutation-apex.js';
export { THE_FALLOUT_KING } from './templates/the-fallout-king.js';
export { SHADOW_RAT } from './templates/shadow-rat.js';
export { GLOOM_STALKER } from './templates/gloom-stalker.js';
export { PALE_WANDERER } from './templates/pale-wanderer.js';
export { DARK_WISP } from './templates/dark-wisp.js';
export { VOID_HOUND } from './templates/void-hound.js';
export { ECLIPSE_WRAITH } from './templates/eclipse-wraith.js';
export { SHADOW_WEAVER } from './templates/shadow-weaver.js';
export { MIDNIGHT_SENTINEL } from './templates/midnight-sentinel.js';
export { ABYSS_COLOSSUS } from './templates/abyss-colossus.js';
export { NIGHTMARE_INCARNATE } from './templates/nightmare-incarnate.js';
export { SHADOW_SOVEREIGN } from './templates/shadow-sovereign.js';
export { THE_ENDLESS_DARK } from './templates/the-endless-dark.js';
