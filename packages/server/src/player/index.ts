/**
 * Player profile module — persistent progression across sessions.
 */

export type { PlayerProfile, PlayerProfileRepository } from './PlayerProfileRepository.js';
export { InMemoryPlayerProfileRepository, DEFAULT_PROFILE } from './PlayerProfileRepository.js';
export { PgPlayerProfileRepository } from './PgPlayerProfileRepository.js';
export {
  initProfileProvider,
  getProfileRepository,
  isProfilePg,
  resetProfileProvider,
} from './player-profile-provider.js';
