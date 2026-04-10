import { validateCharacterName } from "@ellmud/shared";

/**
 * Curated names across short / medium / long buckets for variety.
 * Pre-vetted against naming rules and profanity filter.
 */
const SHORT_NAMES: readonly string[] = [
  "Vex", "Nyx", "Ash", "Kai", "Rue", "Lux", "Ren", "Syl",
  "Ryn", "Zev", "Nox", "Wren", "Cole", "Dex", "Bryn",
];

const MEDIUM_NAMES: readonly string[] = [
  "Kira", "Sable", "Riven", "Maren", "Thane", "Ember", "Slate",
  "Vesper", "Calix", "Silas", "Valen", "Lyra", "Talon", "Petra",
  "Soren", "Flint", "Cairn", "Haze", "Orla", "Pyre", "Sera",
  "Nova", "Onyx", "Leith", "Draven", "Selene", "Corven", "Sevrin",
  "Raven", "Grim", "Rhea", "Thea", "Voss", "Cael", "Neve",
];

const LONG_NAMES: readonly string[] = [
  "Obsidian", "Morthalon", "Seraphine", "Valdremor", "Silvanthi",
  "Kaelindra", "Thornwick", "Ashenmire", "Nighthollow", "Ravencrest",
  "Duskmantle", "Grimsorrow", "Elowynn", "Stormveil", "Cindervane",
  "Blackthorn", "Ironshadow", "Mistwalker", "Emberlith", "Darkholme",
  "Voidrender", "Gallowmere", "Frostweald", "Astorian", "Calanthir",
  "Varethane", "Morvaine", "Thalindor", "Korvandis", "Lytheron",
];

/** First syllables for procedural names. */
const ONSETS: readonly string[] = [
  "Ar", "Az", "Bal", "Cad", "Cor", "Dra", "El", "Ev", "Fen",
  "Gal", "Hav", "Iz", "Kal", "Kir", "Lar", "Lyr", "Mar", "Mir",
  "Nev", "Nor", "Oth", "Rav", "Ren", "Riv", "Sar", "Sel", "Sev",
  "Sil", "Sol", "Sor", "Tav", "Thal", "Val", "Ves", "Vor", "Zan",
  "Zel", "Mor", "Grim", "Ash", "Storm", "Dark", "Dusk", "Night",
];

/** Middle syllables for 3-part procedural names. */
const MIDS: readonly string[] = [
  "an", "el", "or", "al", "en", "ir", "av", "un", "eth", "ol",
  "ar", "is", "oth", "em", "il", "ven", "dar", "mor", "kal",
];

/** Ending syllables for procedural names. */
const CODAS: readonly string[] = [
  "a", "an", "ax", "en", "er", "ia", "in", "is", "ix", "on",
  "or", "ra", "ren", "rin", "yn", "os", "el", "ik", "ex", "al",
  "ius", "oth", "ane", "iel", "wyn", "ven", "ith", "orn",
  "ier", "and", "esh", "ire",
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatName(raw: string): string {
  if (raw.length === 0) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Build a procedural name from 2 or 3 syllable parts. */
function generateFromSyllables(): string {
  const useMid = Math.random() < 0.45;
  const raw = useMid
    ? pickRandom(ONSETS) + pickRandom(MIDS) + pickRandom(CODAS)
    : pickRandom(ONSETS) + pickRandom(CODAS);
  return formatName(raw);
}

/**
 * Generate a random character name with varied length.
 * Blends curated short/medium/long names with procedural syllable
 * combination (2 or 3 parts) for a wide range of 3–12+ character names.
 */
export function generateRandomName(): string {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const roll = Math.random();
    let name: string;
    if (roll < 0.35) {
      // 35% procedural — widest variety
      name = generateFromSyllables();
    } else if (roll < 0.50) {
      // 15% short curated (3-4 chars)
      name = pickRandom(SHORT_NAMES);
    } else if (roll < 0.80) {
      // 30% medium curated (5-7 chars)
      name = pickRandom(MEDIUM_NAMES);
    } else {
      // 20% long curated (8-12 chars)
      name = pickRandom(LONG_NAMES);
    }

    if (validateCharacterName(name).valid) {
      return name;
    }
  }
  return "Vex";
}
