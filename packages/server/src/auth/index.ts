export { AuthService, AuthError } from './AuthService.js';
export { InMemoryTokenStore, type TokenStore, type TokenData } from './TokenStore.js';
export {
  InMemoryPlayerRepository,
  DuplicateUsernameError,
  type PlayerRepository,
} from './PlayerRepository.js';
export { PgPlayerRepository } from './PgPlayerRepository.js';
export { createAuthRouter } from './routes.js';
export { authenticateClient, initColyseusAuth, resetColyseusAuth } from './colyseus-auth.js';
export { EntraAuthService, type EntraConfig } from './EntraAuthService.js';
export { createEntraRouter } from './entra-routes.js';
