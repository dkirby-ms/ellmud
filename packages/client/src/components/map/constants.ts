/** Grid cell size in pixels — shared between all map components. */
export const CELL_SIZE = 60;

/** Node dimensions for full map view. */
export const NODE_SIZE = 20;

/** Node dimensions for compact minimap view. */
export const NODE_SIZE_COMPACT = 12;

/** Colors by room type. Matches MUD aesthetic. */
export const ROOM_TYPE_COLORS: Record<string, string> = {
  entry: '#4ade80',
  boss: '#ef4444',
  junction: '#2dd4bf',
  corridor: '#6b7280',
  dead_end: '#6b7280',
  // feature rooms — teal family
  feature_stash: '#2dd4bf',
  feature_expedition_board: '#2dd4bf',
  feature_marketplace: '#2dd4bf',
  feature_crafting: '#2dd4bf',
  feature_training: '#2dd4bf',
  feature_contracts: '#2dd4bf',
  feature_infirmary: '#2dd4bf',
};

export const DEFAULT_ROOM_COLOR = '#6b7280';

/** Edge stroke color — muted to not compete with nodes. */
export const EDGE_STROKE = '#2A2B35';
export const EDGE_STROKE_WIDTH = 1.5;

/** Ghost room opacity. */
export const GHOST_OPACITY = 0.3;

/** Inter-floor exit styling. */
export const INTER_FLOOR_STROKE = '#a78bfa';
export const INTER_FLOOR_STROKE_WIDTH = 1.5;
export const INTER_FLOOR_DASH = '4 3';

/** Ghost (off-floor) room opacity — dimmer than normal ghosts. */
export const GHOST_FLOOR_OPACITY = 0.3;
