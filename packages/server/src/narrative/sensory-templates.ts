/**
 * Sensory Narration Templates — Wave 2 Audio, Traces, and Awareness/Stealth.
 *
 * Three sensory systems require narrative output:
 * 1. Sound: Players hear echoes from adjacent rooms, attenuated by distance
 * 2. Traces: Footprints, blood trails, discarded items tracked by skill
 * 3. Awareness: Detection of other players depends on their stealth vs observer's awareness
 *
 * These templates generate fallback prose when the LLM is unavailable or exceeds budget.
 */

import type { NarrationContext } from '@ellmud/shared';

// ─── Sound Narration Templates ───────────────────────────────────────────────

/** Direction phrases based on bearing. */
const SOUND_DIRECTIONS: Record<string, string> = {
  north: 'from the north',
  south: 'from the south',
  east: 'from the east',
  west: 'from the west',
  up: 'from above',
  down: 'from below',
};

/** Sound descriptors by source type and intensity. */
const SOUND_QUALIFIERS = {
  combat: {
    faint: 'distant clash of steel',
    moderate: 'clash of metal and shouts',
    loud: 'fierce clanging of blades, war cries',
  },
  movement: {
    faint: 'soft footsteps',
    moderate: 'hurried footsteps',
    loud: 'running, heavy boots pounding stone',
  },
  extraction: {
    faint: 'faint grinding',
    moderate: 'grinding of ancient mechanisms',
    loud: 'grinding and shrieking of stone',
  },
  creature: {
    faint: 'distant snarl',
    moderate: 'growl or hiss',
    loud: 'piercing screech',
  },
  environment: {
    faint: 'subtle rumble',
    moderate: 'low rumble',
    loud: 'violent tremor, cracking stone',
  },
  default: {
    faint: 'faint sound',
    moderate: 'sound',
    loud: 'loud noise',
  },
};

function getIntensityLevel(intensity: number): 'faint' | 'moderate' | 'loud' {
  if (intensity < 0.3) return 'faint';
  if (intensity < 0.7) return 'moderate';
  return 'loud';
}

function getSoundQualifier(
  sourceType: string,
  intensity: number,
): string {
  const level = getIntensityLevel(intensity);
  const qualifiers =
    SOUND_QUALIFIERS[sourceType as keyof typeof SOUND_QUALIFIERS] ??
    SOUND_QUALIFIERS.default;
  return qualifiers[level];
}

function getDirection(directionStr: string | undefined): string {
  if (!directionStr) return 'somewhere nearby';
  const dir = SOUND_DIRECTIONS[directionStr];
  return dir || `from the ${directionStr}`;
}

/**
 * Render sound narration (distant sound from another room).
 * Context must include a 'sound' event with direction, type, and intensity.
 */
export function renderSoundDistant(ctx: NarrationContext): string {
  const sound = ctx.room.traces.find((t) => t.type === 'sound_distant');
  if (!sound) {
    return 'You hear a faint, indistinct echo in the distance.';
  }

  const direction = getDirection(sound.direction);
  const qualifier = getSoundQualifier(sound.source || 'default', sound.intensity ?? 0.5);
  return `You hear ${qualifier} ${direction}.`;
}

/**
 * Render sound narration (nearby clear sound from adjacent room).
 */
export function renderSoundNearby(ctx: NarrationContext): string {
  const sound = ctx.room.traces.find((t) => t.type === 'sound_nearby');
  if (!sound) {
    return 'You hear movement close by.';
  }

  const direction = getDirection(sound.direction);
  const qualifier = getSoundQualifier(sound.source || 'default', sound.intensity ?? 0.5);
  return `A clear ${qualifier} reaches you ${direction}.`;
}

/**
 * Render sound narration (sound in current room from direct witness).
 * Note: This is less common as direct witnesses generate 'room' type narration.
 */
export function renderSoundSameRoom(ctx: NarrationContext): string {
  const events = ctx.recent_events;
  if (events.length === 0) {
    return 'Something stirs in the darkness.';
  }

  const lastEvent = events[events.length - 1];
  const eventLower = lastEvent.summary.toLowerCase();

  if (eventLower.includes('strike') || eventLower.includes('combat')) {
    return 'Steel rings against steel, close at hand.';
  }
  if (eventLower.includes('footstep') || eventLower.includes('movement')) {
    return 'Heavy footsteps echo in this chamber.';
  }
  if (eventLower.includes('door') || eventLower.includes('mechanism')) {
    return 'A grinding sound fills the air as stone shifts.';
  }

  return 'A sound breaks the silence.';
}

// ─── Trace Narration Templates ───────────────────────────────────────────────

/** Age descriptors for traces. */
const TRACE_AGES = {
  fresh: { adjective: 'fresh', context: 'within moments' },
  recent: { adjective: 'recent', context: 'within the last few minutes' },
  old: { adjective: 'old', context: 'hours or more ago' },
  fading: { adjective: 'fading', context: 'days past' },
};

function getTraceAge(ageSeconds: number | undefined): keyof typeof TRACE_AGES {
  if (!ageSeconds) return 'recent';
  if (ageSeconds < 60) return 'fresh';
  if (ageSeconds < 600) return 'recent';
  if (ageSeconds < 3600) return 'old';
  return 'fading';
}

/**
 * Low tracking skill — minimal detail.
 */
export function renderTraceLow(ctx: NarrationContext): string {
  const traces = ctx.room.traces.filter((t) => t.type !== 'sound_distant' && t.type !== 'sound_nearby');
  if (traces.length === 0) {
    return 'You notice no obvious signs of passage.';
  }

  const trace = traces[0];
  const parts: string[] = [];

  switch (trace.type) {
    case 'footprint':
      parts.push(`Footprints lead ${trace.direction || 'onward'}.`);
      break;
    case 'blood':
      parts.push('Dark stains mar the stone.');
      break;
    case 'container':
      parts.push('A container has been disturbed here.');
      break;
    case 'corpse':
      parts.push('Remains lie scattered.');
      break;
    case 'residue':
      parts.push('Residue marks this place.');
      break;
    default:
      parts.push('Signs of activity are scattered here.');
  }

  return parts.join(' ');
}

/**
 * Medium tracking skill — more descriptive.
 */
export function renderTraceMedium(ctx: NarrationContext): string {
  const traces = ctx.room.traces.filter((t) => t.type !== 'sound_distant' && t.type !== 'sound_nearby');
  if (traces.length === 0) {
    return 'The stone is unmarked. No trace of passage here.';
  }

  const trace = traces[0];
  const age = getTraceAge(trace.age_seconds);
  const ageDesc = TRACE_AGES[age];
  const parts: string[] = [];

  switch (trace.type) {
    case 'footprint':
      parts.push(
        `${ageDesc.adjective.charAt(0).toUpperCase() + ageDesc.adjective.slice(1)} bootprints head ${trace.direction || 'onward'}, ${ageDesc.context}.`,
      );
      break;
    case 'blood':
      parts.push(`${ageDesc.adjective} blood stains the stone, still ${ageDesc.adjective === 'recent' ? 'glistening' : 'dark'}.`);
      break;
    case 'container':
      parts.push(
        `A container here shows signs of being opened ${ageDesc.context}. Its contents are disturbed.`,
      );
      break;
    case 'corpse':
      parts.push(
        `A body lies here, fallen ${ageDesc.context}. Decomposition is ${ageDesc.adjective}.`,
      );
      break;
    case 'residue':
      parts.push(
        `${ageDesc.adjective} residue marks the floor — something was extracted or spilled here.`,
      );
      break;
    default:
      parts.push(`${ageDesc.adjective} signs of activity scattered here.`);
  }

  return parts.join(' ');
}

/**
 * High tracking skill — maximum detail.
 */
export function renderTraceHigh(ctx: NarrationContext): string {
  const traces = ctx.room.traces.filter((t) => t.type !== 'sound_distant' && t.type !== 'sound_nearby');
  if (traces.length === 0) {
    return 'The stone is pristine. You find no trace of passage or disturbance.';
  }

  const trace = traces[0];
  const age = getTraceAge(trace.age_seconds);
  const ageDesc = TRACE_AGES[age];
  const parts: string[] = [];

  switch (trace.type) {
    case 'footprint':
      parts.push(
        `${ageDesc.adjective} muddy boots, heavy-shod, likely a warrior. Tracks lead ${trace.direction || 'onward'}, passing through ${ageDesc.context}.`,
      );
      break;
    case 'blood':
      parts.push(
        `Arterial blood, ${ageDesc.adjective}${trace.source ? ` from a ${trace.source}` : ''}. A significant wound — within the last ${ageDesc.context.split(' ')[0]} ${ageDesc.context.split(' ')[1] || 'minutes'}.`,
      );
      break;
    case 'container':
      parts.push(
        `A container expertly opened ${ageDesc.context}. Careful work — likely a skilled hand. Contents fully inventoried and removed.`,
      );
      break;
    case 'corpse':
      parts.push(
        `${trace.source ? `A ${trace.source} lies here` : 'Remains lie here'}, dead ${ageDesc.context}. Wounds suggest ${trace.description || 'violence'}.`,
      );
      break;
    case 'residue':
      parts.push(
        `${ageDesc.adjective} extraction residue — arcane, potent. ${trace.description ? `Likely from a ${trace.description}` : 'Source unclear'}.`,
      );
      break;
    default:
      parts.push(
        `${ageDesc.adjective} evidence of ${trace.description || 'activity'}, left ${ageDesc.context}.`,
      );
  }

  return parts.join(' ');
}

// ─── Awareness/Stealth Narration Templates ──────────────────────────────────

/**
 * No detection — player sees nothing (typically no message sent).
 */
export function renderAwarenessNone(): string {
  return ''; // Empty — system should not send a message
}

/**
 * Vague detection — player senses presence but no details.
 */
export function renderAwarenessVague(): string {
  const variants = [
    'You sense you are not alone.',
    'A shadow shifts at the edge of your vision.',
    'The air grows heavier — someone else is here.',
    'You feel watched, though from where you cannot say.',
    'An unfamiliar presence stirs the atmosphere.',
  ];
  return variants[Math.floor(Math.random() * variants.length)]!;
}

/**
 * Partial detection — some details visible but not clear identification.
 */
export function renderAwarenessPartial(ctx: NarrationContext): string {
  // Equipment hints from visible gear — never a name
  const gearHints = [
    'a figure in dark leather lingers',
    'a cloaked figure moves carefully',
    'a stealthy silhouette passes by',
    'a figure armored in dented plate',
    'a robed figure crouches in shadow',
    'someone in battered mail watches',
    'a figure with twin blades draws close',
    'a lightly-armed shadow',
  ];

  const locations = [
    'near the doorway',
    'at the far wall',
    'by the entrance',
    'in the alcove',
    'against the stone',
    'near the ruins',
  ];

  const gear = gearHints[Math.floor(Math.random() * gearHints.length)]!;
  const location = locations[Math.floor(Math.random() * locations.length)]!;
  return `A ${gear} ${location}.`;
}

/**
 * Full detection — clear description of equipment and bearing.
 */
export function renderAwarenessFullDetection(ctx: NarrationContext): string {
  // Detailed equipment description — still no name
  const sizes = ['tall', 'lean', 'broad-shouldered', 'wiry', 'imposing'];
  const armors = [
    'battered chainmail',
    'leather plate',
    'mismatched plate',
    'worn robes',
    'fur-trimmed leather',
    'reinforced mail',
  ];
  const weapons = [
    'a notched blade at their side',
    'twin daggers in their belt',
    'a heavy axe across their back',
    'a bow slung over shoulder',
    'a staff gripped tightly',
    'no visible weapon',
  ];
  const postures = [
    'stands poised',
    'crouches ready',
    'loiters watchfully',
    'stands vigilant',
    'waits coiled to strike',
  ];

  const size = sizes[Math.floor(Math.random() * sizes.length)]!;
  const armor = armors[Math.floor(Math.random() * armors.length)]!;
  const weapon = weapons[Math.floor(Math.random() * weapons.length)]!;
  const posture = postures[Math.floor(Math.random() * postures.length)]!;

  return `A ${size} figure in ${armor} stands near the altar, ${weapon}. They ${posture}.`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Render sensory narration based on type and context.
 * Note: These are called from the main narration pipeline for 'sound_narration',
 * 'trace_narration', and 'awareness_narration' types.
 */
export function renderSensoryTemplate(
  sensorType: 'sound' | 'trace' | 'awareness',
  variant: string,
  context: NarrationContext,
): string {
  // Sound templates
  if (sensorType === 'sound') {
    if (variant === 'distant') return renderSoundDistant(context);
    if (variant === 'nearby') return renderSoundNearby(context);
    if (variant === 'same_room') return renderSoundSameRoom(context);
    return 'You hear something in the darkness.';
  }

  // Trace templates
  if (sensorType === 'trace') {
    if (variant === 'low') return renderTraceLow(context);
    if (variant === 'medium') return renderTraceMedium(context);
    if (variant === 'high') return renderTraceHigh(context);
    return 'You notice nothing remarkable about this place.';
  }

  // Awareness/Stealth templates
  if (sensorType === 'awareness') {
    if (variant === 'none') return renderAwarenessNone();
    if (variant === 'vague') return renderAwarenessVague();
    if (variant === 'partial') return renderAwarenessPartial(context);
    if (variant === 'full') return renderAwarenessFullDetection(context);
    return '';
  }

  return '';
}
