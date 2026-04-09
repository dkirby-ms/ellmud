import { validateCharacterName } from "@ellmud/shared";

/**
 * Curated cyber noir names — dark urban fantasy, not techy.
 * Pre-vetted against naming rules and profanity filter.
 */
const CURATED_NAMES: readonly string[] = [
  "Vex",
  "Nyx",
  "Ash",
  "Dray",
  "Kira",
  "Sable",
  "Riven",
  "Zara",
  "Cole",
  "Mira",
  "Cade",
  "Wren",
  "Jace",
  "Soren",
  "Rhea",
  "Nira",
  "Rook",
  "Slate",
  "Ember",
  "Voss",
  "Kade",
  "Lux",
  "Vale",
  "Raven",
  "Dex",
  "Kai",
  "Rue",
  "Ryn",
  "Zev",
  "Maren",
  "Thane",
  "Lyra",
  "Vesper",
  "Calix",
  "Silas",
  "Valen",
  "Eris",
  "Nox",
  "Ren",
  "Sera",
  "Nova",
  "Flint",
  "Raze",
  "Orla",
  "Pyre",
  "Sevrin",
  "Corven",
  "Haze",
  "Cairn",
  "Syl",
  "Thea",
  "Grim",
  "Talon",
  "Onyx",
  "Wynn",
  "Petra",
  "Bryn",
  "Leith",
  "Draven",
  "Selene",
  "Varis",
  "Cael",
  "Neve",
];

/** Syllable onsets for procedural generation. */
const ONSETS: readonly string[] = [
  "Ar",
  "Az",
  "Cad",
  "Cor",
  "Dra",
  "El",
  "Ev",
  "Fen",
  "Gal",
  "Hav",
  "Iz",
  "Kal",
  "Kir",
  "Lar",
  "Lyr",
  "Mar",
  "Mir",
  "Nev",
  "Nor",
  "Rav",
  "Ren",
  "Riv",
  "Sar",
  "Sel",
  "Sev",
  "Sil",
  "Sol",
  "Sor",
  "Tav",
  "Val",
  "Ves",
  "Vor",
  "Zal",
  "Zar",
  "Zel",
];

/** Syllable codas for procedural generation. */
const CODAS: readonly string[] = [
  "a",
  "an",
  "ax",
  "en",
  "er",
  "ia",
  "in",
  "is",
  "ix",
  "on",
  "or",
  "ra",
  "ren",
  "rin",
  "yn",
  "os",
  "el",
  "ik",
  "ex",
  "al",
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatName(raw: string): string {
  if (raw.length === 0) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function generateFromSyllables(): string {
  return formatName(pickRandom(ONSETS) + pickRandom(CODAS));
}

/**
 * Generate a random cyber noir-ish character name.
 * Uses a mix of curated names and procedural syllable combination.
 * All results are validated against shared naming rules.
 */
export function generateRandomName(): string {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    // 60% curated, 40% procedural for variety
    const name =
      Math.random() < 0.6 ? pickRandom(CURATED_NAMES) : generateFromSyllables();

    if (validateCharacterName(name).valid) {
      return name;
    }
  }
  // Fallback — curated names are pre-vetted, so this is defensive only
  return "Vex";
}
