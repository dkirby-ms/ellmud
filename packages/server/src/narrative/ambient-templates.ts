/**
 * Ambient Narration Templates — fallback prose for Refuge ambient events.
 *
 * Each ambient event type has a template renderer that produces atmospheric
 * prose from state. Templates must be good enough that players don't notice
 * the LLM was skipped. Every word earns its place.
 *
 * GDD §2.1 — The Refuge as a Living World
 */

import type { WeatherState, TimeOfDay, NPCRole } from '@ellmud/shared';

// ─── Weather Descriptions ────────────────────────────────────────────────────

const WEATHER_NARRATIVES: Record<WeatherState, string[]> = {
  clear: [
    'The clouds part. Pale light spills across the Refuge, warming stone long cold.',
    'The sky clears, revealing a bruised canvas of blue-grey above the walls.',
    'The weather breaks. For a moment, the Refuge almost looks peaceful.',
  ],
  cloudy: [
    'Clouds roll in from the west, dimming what little light the Refuge knew.',
    'A grey pall settles over the encampment. Merchants pull awnings lower.',
    'The sky thickens. Shadows deepen between the market stalls.',
  ],
  rain: [
    'Rain begins to fall — a steady, cold drumming on canvas and stone.',
    'The first drops hit the flagstones, spreading dark circles. Then the downpour begins.',
    'Rain sweeps across the Refuge. Puddles form in the ruts between tents.',
  ],
  storm: [
    'Thunder cracks overhead. Lightning illuminates the Refuge in stark, frozen frames.',
    'The storm hits with fury. Wind tears at awnings and scatters loose parchment.',
    'A violent storm rages. The refugees huddle closer to their fires.',
  ],
};

const TIME_NARRATIVES: Record<TimeOfDay, string[]> = {
  dawn: [
    'Grey light seeps through the eastern wall. The Refuge stirs to life.',
    'Dawn breaks — tentative, uncertain, like everything else here.',
    'The first fires are stoked. Smoke rises thin against the paling sky.',
  ],
  morning: [
    'Morning settles in. The market opens, voices rising with the light.',
    'The morning bustle fills the plaza. Merchants call, children run, guards change watch.',
    'By mid-morning the Refuge thrums with purpose. Another day survived.',
  ],
  midday: [
    'The sun, such as it is, reaches its zenith. Shadows shrink to nothing.',
    'Noon arrives. The heat builds, and even the merchants slow their calls.',
    'Midday quiet descends — a brief lull between the morning rush and afternoon trade.',
  ],
  afternoon: [
    'The afternoon stretches long. Traders settle into haggling, steady and unhurried.',
    'Afternoon light slants through the awnings, casting amber stripes across the stone.',
    'The day wears on. Exhaustion shows in faces, but the work continues.',
  ],
  dusk: [
    'Dusk comes quickly here. Torches are lit along the walls, one by one.',
    'The light drains from the sky. The Refuge grows quieter, more cautious.',
    'Evening falls. The market thins. Guards double at the gates.',
  ],
  night: [
    'Night claims the Refuge. Firelight flickers in the darkness between tents.',
    'The Refuge sleeps — or pretends to. Watch-fires burn. Shadows move.',
    'Night descends. The sounds of the day give way to distant whispers and the crackle of embers.',
  ],
};

// ─── NPC Descriptions ────────────────────────────────────────────────────────

const NPC_MOVE_TEMPLATES: Record<NPCRole, (name: string, from: string, to: string) => string> = {
  merchant: (name, _from, to) => `${name} gathers their wares and moves to the ${to.replace(/-/g, ' ')}.`,
  faction_rep: (name, _from, to) => `${name} strides purposefully toward the ${to.replace(/-/g, ' ')}.`,
  refugee: (name, _from, to) => `${name} shuffles toward the ${to.replace(/-/g, ' ')}, head bowed.`,
};

const NPC_IDLE_TEMPLATES: Record<NPCRole, (name: string, action: string) => string> = {
  merchant: (name, action) => `${name} ${action}.`,
  faction_rep: (name, action) => `${name} ${action}.`,
  refugee: (name, action) => `Nearby, ${name} ${action}.`,
};

const NPC_ARRIVE_TEMPLATES: Record<NPCRole, (name: string, location: string) => string> = {
  merchant: (name, _loc) => `${name} arrives, laden with goods from the outer camps.`,
  faction_rep: (name, _loc) => `${name} returns, bearing news from beyond the walls.`,
  refugee: (name, _loc) => `${name} stumbles through the south gate, dust-covered and weary.`,
};

const NPC_DEPART_TEMPLATES: Record<NPCRole, (name: string) => string> = {
  merchant: (name) => `${name} packs up and heads for the outer camps.`,
  faction_rep: (name) => `${name} departs on business beyond the walls.`,
  refugee: (name) => `${name} slips quietly away. Whether by choice or necessity, they are gone.`,
};

// ─── Atmosphere ──────────────────────────────────────────────────────────────

interface AtmosphereKey {
  weather: WeatherState;
  timeOfDay: TimeOfDay;
}

const ATMOSPHERE_FRAGMENTS: Record<WeatherState, Record<TimeOfDay, string[]>> = {
  clear: {
    dawn: ['Mist clings to the cobblestones as the first light touches the walls.'],
    morning: ['Pale sunshine warms the market stones. A dog barks somewhere near the gate.'],
    midday: ['The Refuge bakes in thin sunlight. Flies drone over the butcher\'s stall.'],
    afternoon: ['Long shadows stretch between the tents. The air smells of woodsmoke and old iron.'],
    dusk: ['The sky turns copper and ash. Torchlight begins to compete with the fading day.'],
    night: ['Stars pierce the dark above. The Refuge is quiet but never still.'],
  },
  cloudy: {
    dawn: ['A grey dawn filters through overcast skies. The world feels muffled.'],
    morning: ['The morning is dull, cloud-covered. Conversations carry further in the still air.'],
    midday: ['Flat grey light blankets everything. The Refuge goes about its business, joyless but resolute.'],
    afternoon: ['The afternoon grows dim. Lanterns are lit early in the deeper alleys.'],
    dusk: ['Dusk and cloud merge — the sky a uniform slate. Fires are the only colour.'],
    night: ['The clouds swallow the stars. Darkness is total beyond the firelight.'],
  },
  rain: {
    dawn: ['Dawn arrives wet and miserable. The rain began before first light and shows no sign of stopping.'],
    morning: ['Rain patters steadily on tent canvas. Puddles form rivers between the stalls.'],
    midday: ['Noon rain. The market half-deserted, merchants sheltering under dripping awnings.'],
    afternoon: ['The rain continues its dreary work. Everything is damp, everything smells of wet stone.'],
    dusk: ['Rain and twilight. The Refuge retreats indoors. Only the guards remain, cloaks dark with water.'],
    night: ['Rain drums against the Refuge through the night. Sleep comes fitfully, if at all.'],
  },
  storm: {
    dawn: ['Thunder greets the dawn. Lightning outlines the eastern wall in stark white.'],
    morning: ['The storm howls through the morning. Market stalls flap and strain at their moorings.'],
    midday: ['The storm peaks at noon — a wall of wind and water. Nobody ventures into the plaza.'],
    afternoon: ['The storm begins to break, leaving destruction in its wake. Fallen poles, scattered wares.'],
    dusk: ['The last of the storm rumbles away eastward as dusk descends, leaving the air scrubbed clean.'],
    night: ['The storm rages through the night. Between cracks of thunder, you hear the distant howl of something else entirely.'],
  },
};

// ─── Join Snapshot ───────────────────────────────────────────────────────────

function renderJoinSnapshot(ctx: AmbientTemplateContext): string {
  const weather = ctx.weather ?? 'clear';
  const time = ctx.timeOfDay ?? 'morning';
  const npcCount = ctx.npcCount ?? 0;
  const merchants = ctx.merchantNames ?? [];

  const parts: string[] = [];

  // Atmosphere
  const fragments = ATMOSPHERE_FRAGMENTS[weather]?.[time];
  if (fragments && fragments.length > 0) {
    parts.push(fragments[Math.floor(Math.random() * fragments.length)]!);
  }

  // NPC presence
  if (npcCount > 5) {
    parts.push('The Refuge is busy — voices mix with the clatter of commerce and the low murmur of council.');
  } else if (npcCount > 2) {
    parts.push('A handful of souls move about their business in the plaza.');
  } else if (npcCount > 0) {
    parts.push('The Refuge is quiet. A few figures linger near the fires.');
  } else {
    parts.push('The Refuge stands nearly empty. An eerie stillness hangs over the plaza.');
  }

  // Wandering merchants
  if (merchants.length > 0) {
    parts.push(`A rare sight — ${merchants.join(' and ')} ${merchants.length > 1 ? 'have' : 'has'} set up shop nearby.`);
  }

  return parts.join(' ');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface AmbientTemplateContext {
  weather?: WeatherState;
  previousWeather?: WeatherState;
  timeOfDay?: TimeOfDay;
  previousTime?: TimeOfDay;
  npcName?: string;
  role?: NPCRole;
  location?: string;
  previousLocation?: string;
  idleAction?: string;
  npcCount?: number;
  merchantNames?: string[];
}

type AmbientTemplateType =
  | 'weather_change'
  | 'time_change'
  | 'npc_movement'
  | 'npc_idle'
  | 'npc_arrival'
  | 'npc_departure'
  | 'faction_event'
  | 'merchant_arrival'
  | 'merchant_departure'
  | 'ambient_atmosphere'
  | 'join_snapshot';

/**
 * Render an ambient narration template from context.
 * Always returns atmospheric prose — never an empty string.
 */
export function renderAmbientTemplate(
  type: AmbientTemplateType,
  ctx: AmbientTemplateContext,
): string {
  switch (type) {
    case 'weather_change': {
      const weather = ctx.weather ?? 'clear';
      const narratives = WEATHER_NARRATIVES[weather];
      return narratives[Math.floor(Math.random() * narratives.length)]!;
    }

    case 'time_change': {
      const time = ctx.timeOfDay ?? 'morning';
      const narratives = TIME_NARRATIVES[time];
      return narratives[Math.floor(Math.random() * narratives.length)]!;
    }

    case 'npc_movement': {
      const role = ctx.role ?? 'merchant';
      const name = ctx.npcName ?? 'A figure';
      const from = ctx.previousLocation ?? 'nearby';
      const to = ctx.location ?? 'the plaza';
      return NPC_MOVE_TEMPLATES[role](name, from, to);
    }

    case 'npc_idle': {
      const role = ctx.role ?? 'merchant';
      const name = ctx.npcName ?? 'A figure';
      const action = ctx.idleAction ?? 'stands quietly';
      return NPC_IDLE_TEMPLATES[role](name, action);
    }

    case 'npc_arrival': {
      const role = ctx.role ?? 'refugee';
      const name = ctx.npcName ?? 'A stranger';
      const location = ctx.location ?? 'the gate';
      return NPC_ARRIVE_TEMPLATES[role](name, location);
    }

    case 'npc_departure': {
      const role = ctx.role ?? 'refugee';
      const name = ctx.npcName ?? 'A figure';
      return NPC_DEPART_TEMPLATES[role](name);
    }

    case 'ambient_atmosphere': {
      const weather = ctx.weather ?? 'clear';
      const time = ctx.timeOfDay ?? 'morning';
      const fragments = ATMOSPHERE_FRAGMENTS[weather]?.[time];
      if (fragments && fragments.length > 0) {
        return fragments[Math.floor(Math.random() * fragments.length)]!;
      }
      return 'The Refuge endures.';
    }

    case 'join_snapshot':
      return renderJoinSnapshot(ctx);

    // Faction/merchant events use pre-written narratives from definitions
    case 'faction_event':
    case 'merchant_arrival':
    case 'merchant_departure':
      return 'Something stirs in the Refuge.';

    default:
      return 'The Refuge endures.';
  }
}
