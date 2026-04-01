/**
 * Zone card data types for the Expedition Board UI.
 * Defines the shape of zone selection cards displayed to players.
 */

import type { ZoneTier, ZoneModifier } from './index.js';

// ─── Zone Key Types (GDD §10.4) ────────────────────────────────────────────

export type ZoneKeyType = 'bone' | 'iron' | 'crystal' | 'void';

// ─── Zone Card Data ────────────────────────────────────────────────────────

/** Data required to render a zone selection card on the Expedition Board. */
export interface ZoneCardData {
  zoneId: string;
  name: string;
  tier: ZoneTier;
  modifiers: ZoneModifier[];
  currentPlayers: number;
  maxPlayers: number;
  /** Seconds remaining in the entry window. */
  entryWindowSeconds: number;
  keyCost: ZoneKeyType;
}
