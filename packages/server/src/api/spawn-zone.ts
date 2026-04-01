/**
 * Spawn Zone API — determines the correct hub zone for a player.
 *
 * GET /api/spawn-zone — Returns the zone target where the player should
 * connect on login, based on their faction membership.
 *
 * - Faction members → their faction's stronghold (e.g. zone:the-foundry)
 * - Unaffiliated players → the Refuge (zone:the-refuge)
 *
 * GDD §6.5 — Players respawn at faction strongholds.
 */

import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/AuthService.js';
import { getFactionRepository } from '../faction/index.js';
import { resolvePlayerHubTarget, resolvePlayerHubSlug } from '../zones/stronghold.js';

export function createSpawnZoneRouter(authService: AuthService): Router {
  const router = Router();

  /** Extract and validate Bearer token → playerId. */
  async function authenticate(req: Request, res: Response): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return null;
    }
    const token = authHeader.slice(7);
    const payload = await authService.validateToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return null;
    }
    return payload.playerId;
  }

  // ─── GET /api/spawn-zone ──────────────────────────────────────────────────

  router.get('/api/spawn-zone', async (req: Request, res: Response) => {
    try {
      const playerId = await authenticate(req, res);
      if (!playerId) return;

      const factionRepo = getFactionRepository();
      const factionSlug = await factionRepo.getPlayerFactionSlug(playerId);

      const target = resolvePlayerHubTarget(factionSlug ?? undefined);
      const zoneSlug = resolvePlayerHubSlug(factionSlug ?? undefined);

      res.status(200).json({ target, zoneSlug, factionSlug: factionSlug ?? null });
    } catch (err) {
      console.error('[SpawnZone] Error resolving spawn zone:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
