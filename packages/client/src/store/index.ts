/**
 * Store barrel — re-exports all domain stores and provides cross-store helpers.
 *
 * Components should import from domain-specific stores directly for best
 * tree-shaking and re-render isolation. This barrel exists for:
 *   - logoutAll() cross-store cascade
 *   - Test helpers (resetAllStores, initializeAllStores)
 *   - Backward-compatible re-exports during migration
 */

// ─── Domain store re-exports ─────────────────────────────────────────────────

export { createStore } from './createStore.js';

export {
  useAuthStore,
  authReducer,
  initialAuthState,
  resetAuthStore,
  initializeAuthStore,
  type AuthState,
  type AuthAction,
} from './auth.js';

export {
  useTerminalStore,
  terminalReducer,
  initialTerminalState,
  resetTerminalStore,
  initializeTerminalStore,
  type TerminalState,
  type TerminalAction,
  type TerminalMessage,
  type SoundCue,
} from './terminal.js';

export {
  useCombatStore,
  combatReducer,
  initialCombatState,
  resetCombatStore,
  initializeCombatStore,
  getHpTier,
  type CombatState,
  type CombatStoreAction,
  type HpTier,
  type EnemyStatus,
  type StatusEffect,
} from './combat.js';

export {
  useConnectionStore,
  connectionReducer,
  initialConnectionState,
  resetConnectionStore,
  initializeConnectionStore,
  type ConnectionState,
  type ConnectionAction,
} from './connection.js';

export {
  useInventoryStore,
  inventoryReducer,
  initialInventoryState,
  resetInventoryStore,
  initializeInventoryStore,
  type InventoryState,
  type InventoryAction,
  type InventoryItem,
  type EffectiveStats,
  type CombatStats,
} from './inventory.js';

// ─── Cross-store helpers ─────────────────────────────────────────────────────

import { useAuthStore, initialAuthState } from './auth.js';
import { useTerminalStore, initialTerminalState } from './terminal.js';
import { useCombatStore, initialCombatState } from './combat.js';
import { useConnectionStore, initialConnectionState } from './connection.js';
import { useInventoryStore, initialInventoryState } from './inventory.js';

/** Reset ALL domain stores to their initial state. Used for logout cascade. */
export function logoutAll(): void {
  useAuthStore.setState({ ...initialAuthState });
  useTerminalStore.setState({ ...initialTerminalState });
  useCombatStore.setState({ ...initialCombatState });
  useConnectionStore.setState({ ...initialConnectionState });
  useInventoryStore.setState({ ...initialInventoryState });
}

// ─── Test Helpers ────────────────────────────────────────────────────────────

/** Reset all stores to initial state. Call in beforeEach for test isolation. */
export function resetAllStores(): void {
  useAuthStore.setState({ ...initialAuthState });
  useTerminalStore.setState({ ...initialTerminalState });
  useCombatStore.setState({ ...initialCombatState });
  useConnectionStore.setState({ ...initialConnectionState });
  useInventoryStore.setState({ ...initialInventoryState });
}

/**
 * Initialize stores with partial state. Distributes fields to the correct
 * domain stores. Accepts the old flat AppState shape for backward compat.
 */
export function initializeAllStores(partial: Record<string, unknown>): void {
  // Auth fields
  const authFields: (keyof import('./auth.js').AuthState)[] = [
    'authenticated', 'token', 'playerId', 'email', 'username', 'userRole',
  ];
  const authPartial: Record<string, unknown> = {};
  for (const key of authFields) {
    if (key in partial) authPartial[key] = partial[key];
  }
  if (Object.keys(authPartial).length > 0) {
    useAuthStore.setState({ ...initialAuthState, ...authPartial });
  }

  // Terminal fields
  const terminalFields: (keyof import('./terminal.js').TerminalState)[] = [
    'messages', 'soundCues', 'roomHeader', 'zoneState',
  ];
  const terminalPartial: Record<string, unknown> = {};
  for (const key of terminalFields) {
    if (key in partial) terminalPartial[key] = partial[key];
  }
  if (Object.keys(terminalPartial).length > 0) {
    useTerminalStore.setState({ ...initialTerminalState, ...terminalPartial });
  }

  // Combat fields
  const combatFields: (keyof import('./combat.js').CombatState)[] = [
    'inCombat', 'combatTick', 'enemyStatus', 'pendingCombatAction',
    'statusEffects', 'playerHp', 'playerMaxHp', 'playerStamina',
    'playerMaxStamina', 'posture', 'combatCombatants', 'combatHostileIds',
    'combatPlayerTargetId',
  ];
  const combatPartial: Record<string, unknown> = {};
  for (const key of combatFields) {
    if (key in partial) combatPartial[key] = partial[key];
  }
  if (Object.keys(combatPartial).length > 0) {
    useCombatStore.setState({ ...initialCombatState, ...combatPartial });
  }

  // Connection fields
  const connectionFields: (keyof import('./connection.js').ConnectionState)[] = [
    'room', 'connectionStatus', 'error',
  ];
  const connectionPartial: Record<string, unknown> = {};
  for (const key of connectionFields) {
    if (key in partial) connectionPartial[key] = partial[key];
  }
  if (Object.keys(connectionPartial).length > 0) {
    useConnectionStore.setState({ ...initialConnectionState, ...connectionPartial });
  }

  // Inventory fields
  const inventoryFields: (keyof import('./inventory.js').InventoryState)[] = [
    'inventory', 'loadout', 'stashItems', 'pendingEquipAction',
    'combatStats', 'effectiveStats', 'baseStats', 'statPointsAvailable',
    'activeCharacter', 'roomOccupants',
  ];
  const inventoryPartial: Record<string, unknown> = {};
  for (const key of inventoryFields) {
    if (key in partial) inventoryPartial[key] = partial[key];
  }
  if (Object.keys(inventoryPartial).length > 0) {
    useInventoryStore.setState({ ...initialInventoryState, ...inventoryPartial });
  }
}
