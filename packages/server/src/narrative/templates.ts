/**
 * Template Fallback — atmospheric prose assembled from state when the LLM
 * is unavailable or exceeds its timeout budget.
 *
 * These templates must be good enough that players don't notice
 * the LLM was skipped. Every template produces evocative prose, not
 * robotic data dumps.
 */

import type { NarrationContext, LLMNarrationType } from '@ellmud/shared';
import { renderSensoryTemplate } from './sensory-templates.js';
import { renderAmbientTemplate } from './ambient-templates.js';

// ─── Atmospheric Fragments ───────────────────────────────────────────────────

const BIOME_ATMOSPHERES: Record<string, string> = {
  flooded_crypt: 'Dark water laps at ancient stone, carrying the scent of rot and forgotten prayers.',
  shattered_bastion: 'Broken ramparts claw at a bruised sky. Dust sifts through shattered masonry.',
  fungal_deep: 'Bioluminescent fungi pulse with sickly light, their spores thick in the stagnant air.',
  ashen_reach: 'Grey ash coats every surface. The air tastes of cinder and distant fire.',
  void_rift: 'Reality frays at the edges here. The darkness between things feels alive.',
};

const LIGHT_DESCRIPTIONS: Record<string, string> = {
  dark: 'Darkness presses in, swallowing detail beyond arm\'s reach.',
  dim: 'A feeble glow barely illuminates the space, leaving much to shadow.',
  moderate: 'Pale light filters through, enough to make out the surroundings.',
  bright: 'The space is well-lit, every corner revealed.',
};

const STABILITY_DESCRIPTIONS: Record<string, string> = {
  stable: '',
  wavering: 'A faint tremor runs through the ground — the shard\'s fabric strains.',
  unstable: 'The walls shudder. Cracks spider through the ceiling. Time grows short.',
  collapsing: 'Reality buckles and tears. The shard is dying — every moment here is borrowed.',
};

const CREATURE_STATE_VERBS: Record<string, string> = {
  patrolling: 'prowls the shadows',
  idle: 'lurks motionless',
  aggressive: 'coils to strike',
  fleeing: 'scrambles for escape',
  wounded: 'staggers, wounded',
  dead: 'lies still',
};

const HP_DESCRIPTIONS: Record<string, string> = {
  healthy: 'You feel steady, whole.',
  wounded: 'Pain pulses at the edges of your awareness. You\'ve been hurt.',
  critical: 'Every breath is a labour. You\'re barely holding together.',
};

const COMBAT_RESULT_VERBS: Record<string, string[]> = {
  strike: [
    'Your blade finds its mark with a sharp crack.',
    'You lash out — steel meets flesh.',
    'A swift strike connects, jarring your arm.',
  ],
  heavy_strike: [
    'You put everything into a crushing blow.',
    'A devastating overhead swing lands with terrible force.',
    'You drive your weapon forward with all your weight behind it.',
  ],
  dodge: [
    'You twist aside at the last instant.',
    'Instinct saves you — you throw yourself clear.',
    'You slip the blow by a hair\'s breadth.',
  ],
  block: [
    'You brace and absorb the impact.',
    'Your guard holds, barely.',
    'Steel rings on steel as you catch the blow.',
  ],
  miss: [
    'Your swing cuts empty air.',
    'The attack goes wide, finding nothing.',
    'You overextend — the blow misses entirely.',
  ],
};

// ─── Helper Functions ────────────────────────────────────────────────────────

function getLightDesc(level: number): string {
  if (level <= 0.2) return LIGHT_DESCRIPTIONS['dark']!;
  if (level <= 0.5) return LIGHT_DESCRIPTIONS['dim']!;
  if (level <= 0.8) return LIGHT_DESCRIPTIONS['moderate']!;
  return LIGHT_DESCRIPTIONS['bright']!;
}

function getStabilityDesc(stability: number): string {
  if (stability > 0.75) return STABILITY_DESCRIPTIONS['stable']!;
  if (stability > 0.5) return STABILITY_DESCRIPTIONS['wavering']!;
  if (stability > 0.25) return STABILITY_DESCRIPTIONS['unstable']!;
  return STABILITY_DESCRIPTIONS['collapsing']!;
}

function getHpDesc(hpPct: number): string {
  if (hpPct > 0.6) return HP_DESCRIPTIONS['healthy']!;
  if (hpPct > 0.3) return HP_DESCRIPTIONS['wounded']!;
  return HP_DESCRIPTIONS['critical']!;
}

function describeCreature(creature: { type: string; state: string; hp_pct: number }): string {
  const name = creature.type.replace(/_/g, ' ');
  const verb = CREATURE_STATE_VERBS[creature.state] ?? 'watches with unknowable intent';
  const wound = creature.hp_pct < 0.5 ? ', bearing grievous wounds' : '';
  return `A ${name} ${verb}${wound}.`;
}

function describeExits(exits: string[]): string {
  if (exits.length === 0) return 'There is no obvious way out.';
  if (exits.length === 1) return `A passage leads ${exits[0]}.`;
  const last = exits[exits.length - 1];
  const rest = exits.slice(0, -1).join(', ');
  return `Passages lead ${rest} and ${last}.`;
}

function describeFeatures(features: string[]): string {
  if (features.length === 0) return '';
  const descs = features.map((f) => f.replace(/_/g, ' '));
  if (descs.length === 1) return `You notice a ${descs[0]}.`;
  return `You notice ${descs.slice(0, -1).join(', ')} and a ${descs[descs.length - 1]}.`;
}

function describeHazards(hazards: string[]): string {
  if (hazards.length === 0) return '';
  const descs = hazards.map((h) => h.replace(/_/g, ' '));
  return `Danger: ${descs.join(', ')}.`;
}

function describeItems(items: { name: string }[]): string {
  if (items.length === 0) return '';
  const names = items.map((i) => i.name.replace(/_/g, ' '));
  if (names.length === 1) return `Something catches your eye — a ${names[0]}.`;
  return `Several things catch your eye: ${names.join(', ')}.`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ─── Template Renderers ──────────────────────────────────────────────────────

function renderRoomDescription(ctx: NarrationContext): string {
  const parts: string[] = [];

  const atmosphere = BIOME_ATMOSPHERES[ctx.room.biome] ?? 'The air hangs heavy in this place.';
  parts.push(atmosphere);
  parts.push(getLightDesc(ctx.room.light_level));

  const featuresDesc = describeFeatures(ctx.room.features);
  if (featuresDesc) parts.push(featuresDesc);

  const hazardsDesc = describeHazards(ctx.room.hazards);
  if (hazardsDesc) parts.push(hazardsDesc);

  for (const creature of ctx.room.creatures) {
    parts.push(describeCreature(creature));
  }

  const itemsDesc = describeItems(ctx.room.items_visible);
  if (itemsDesc) parts.push(itemsDesc);

  parts.push(describeExits(ctx.room.exits));

  const stabilityDesc = getStabilityDesc(ctx.room.shard_stability);
  if (stabilityDesc) parts.push(stabilityDesc);

  return parts.join(' ');
}

function renderCombatAction(ctx: NarrationContext): string {
  const parts: string[] = [];
  const lastEvent = ctx.recent_events[ctx.recent_events.length - 1];

  if (lastEvent) {
    const summary = lastEvent.summary.toLowerCase();
    let actionType = 'strike';
    if (summary.includes('dodge')) actionType = 'dodge';
    else if (summary.includes('block')) actionType = 'block';
    else if (summary.includes('miss') || summary.includes('0dmg')) actionType = 'miss';
    else if (summary.includes('heavy')) actionType = 'heavy_strike';

    const verbs = COMBAT_RESULT_VERBS[actionType] ?? COMBAT_RESULT_VERBS['strike']!;
    parts.push(pickRandom(verbs));
  } else {
    parts.push('Steel clashes in the dim light.');
  }

  parts.push(getHpDesc(ctx.player.hp_pct));

  for (const creature of ctx.room.creatures) {
    if (creature.hp_pct < 1.0 && creature.hp_pct > 0) {
      const name = creature.type.replace(/_/g, ' ');
      const desc =
        creature.hp_pct < 0.3
          ? 'falters, near collapse'
          : creature.hp_pct < 0.6
            ? 'shows signs of weakening'
            : 'still stands strong';
      parts.push(`The ${name} ${desc}.`);
    }
  }

  return parts.join(' ');
}

function renderCombatRound(ctx: NarrationContext): string {
  const parts: string[] = ['The clash continues.'];

  for (const event of ctx.recent_events.slice(-3)) {
    const summary = event.summary.toLowerCase();
    if (summary.includes('hit')) {
      parts.push('A blow lands with sickening force.');
    } else if (summary.includes('miss') || summary.includes('dodge')) {
      parts.push('A strike whistles through empty air.');
    } else if (summary.includes('block')) {
      parts.push('An impact rings out as a blow is caught.');
    } else {
      parts.push('Combatants trade positions, circling warily.');
    }
  }

  parts.push(getHpDesc(ctx.player.hp_pct));
  return parts.join(' ');
}

function renderMovement(ctx: NarrationContext): string {
  const parts: string[] = [];

  const direction = ctx.recent_events.find((e) => e.type === 'movement')?.summary ?? '';
  if (direction) {
    const dir = direction.replace(/_/g, ' ');
    parts.push(`You press ${dir}, leaving the previous chamber behind.`);
  } else {
    parts.push('You move onward.');
  }

  const atmosphere = BIOME_ATMOSPHERES[ctx.room.biome] ?? 'A new space opens before you.';
  parts.push(atmosphere);
  parts.push(getLightDesc(ctx.room.light_level));
  parts.push(describeExits(ctx.room.exits));

  const stabilityDesc = getStabilityDesc(ctx.room.shard_stability);
  if (stabilityDesc) parts.push(stabilityDesc);

  return parts.join(' ');
}

function renderEvent(ctx: NarrationContext): string {
  const parts: string[] = [];
  const lastEvent = ctx.recent_events[ctx.recent_events.length - 1];

  if (lastEvent) {
    const desc = lastEvent.summary.replace(/_/g, ' ');
    parts.push(`Something stirs — ${desc}.`);
  } else {
    parts.push('The world shifts around you.');
  }

  const stabilityDesc = getStabilityDesc(ctx.room.shard_stability);
  if (stabilityDesc) parts.push(stabilityDesc);

  return parts.join(' ');
}

// ─── Public API ──────────────────────────────────────────────────────────────

const RENDERERS: Record<LLMNarrationType, (ctx: NarrationContext) => string> = {
  room_description: renderRoomDescription,
  combat_action: renderCombatAction,
  combat_round: renderCombatRound,
  movement: renderMovement,
  event: renderEvent,
  sound_narration: (ctx) => renderSensoryTemplate('sound', 'nearby', ctx),
  trace_narration: (ctx) => renderSensoryTemplate('trace', 'medium', ctx),
  awareness_narration: (ctx) => renderSensoryTemplate('awareness', 'partial', ctx),
  ambient_narration: () => renderAmbientTemplate('ambient_atmosphere', {}),
};

/**
 * Render a template-based fallback narration from state.
 * Designed to be atmospheric enough that players don't notice the LLM was skipped.
 */
export function renderTemplate(type: LLMNarrationType, context: NarrationContext): string {
  const renderer = RENDERERS[type];
  return renderer(context);
}
