/**
 * Character REST API routes.
 *
 * GET    /api/characters         — list characters for authenticated player
 * POST   /api/characters         — create character (validate name, assign starter kit)
 * PUT    /api/characters/:id/select — set as active character
 * DELETE /api/characters/:id     — soft-delete
 */

import { Router, type Request, type Response } from 'express';
import { validateCharacterName } from '@ellmud/shared';
import type { AuthService } from '../auth/AuthService.js';
import { getCharacterRepository } from '../character/index.js';
import { grantStarterKit } from './starter-kit.js';

export function createCharacterRouter(authService: AuthService, usePg: boolean): Router {
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

  // ─── GET /api/characters ───────────────────────────────────────────────────

  router.get('/api/characters', async (req: Request, res: Response) => {
    try {
      const playerId = await authenticate(req, res);
      if (!playerId) return;

      const repo = getCharacterRepository();
      const characters = await repo.list(playerId);
      res.status(200).json({ characters });
    } catch (err) {
      console.error('[Characters] List error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── POST /api/characters ──────────────────────────────────────────────────

  router.post('/api/characters', async (req: Request, res: Response) => {
    try {
      const playerId = await authenticate(req, res);
      if (!playerId) return;

      const { name, startingZoneSlug } = req.body as { name?: string; startingZoneSlug?: string };

      if (!name || !startingZoneSlug) {
        res.status(400).json({ error: 'name and startingZoneSlug are required' });
        return;
      }

      // Validate character name
      const validation = validateCharacterName(name);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      // Validate starting zone slug
      const validStartingZones = ['the-reliquary', 'the-bloom-observatory', 'the-carrion-court'];
      if (!validStartingZones.includes(startingZoneSlug)) {
        res.status(400).json({ error: `Invalid starting zone. Choose from: ${validStartingZones.join(', ')}` });
        return;
      }

      const repo = getCharacterRepository();
      const character = await repo.create(playerId, name, startingZoneSlug);

      // Grant starter kit (weapon + armour + consumable)
      try {
        await grantStarterKit(playerId, character.id, usePg);
      } catch (kitErr) {
        console.warn('[Characters] Starter kit grant failed (non-fatal):', kitErr);
      }

      // Auto-select if it's the player's first character
      const allChars = await repo.list(playerId);
      if (allChars.length === 1) {
        await repo.setActive(playerId, character.id);
      }

      const updated = await repo.getById(character.id);
      res.status(201).json({ character: updated });
    } catch (err) {
      if (err instanceof Error && err.message.includes('already in use')) {
        res.status(409).json({ error: err.message });
        return;
      }
      // Handle Postgres unique violation
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
        res.status(409).json({ error: 'Character name already in use' });
        return;
      }
      console.error('[Characters] Create error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── PUT /api/characters/:id/select ────────────────────────────────────────

  router.put('/api/characters/:id/select', async (req: Request, res: Response) => {
    try {
      const playerId = await authenticate(req, res);
      if (!playerId) return;

      const repo = getCharacterRepository();
      const character = await repo.getById(req.params.id);
      if (!character || character.playerId !== playerId) {
        res.status(404).json({ error: 'Character not found' });
        return;
      }

      await repo.setActive(playerId, req.params.id);
      res.status(200).json({ message: 'Character selected' });
    } catch (err) {
      console.error('[Characters] Select error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── DELETE /api/characters/:id ────────────────────────────────────────────

  router.delete('/api/characters/:id', async (req: Request, res: Response) => {
    try {
      const playerId = await authenticate(req, res);
      if (!playerId) return;

      const repo = getCharacterRepository();
      const character = await repo.getById(req.params.id);
      if (!character || character.playerId !== playerId) {
        res.status(404).json({ error: 'Character not found' });
        return;
      }

      await repo.softDelete(req.params.id);
      res.status(200).json({ message: 'Character deleted' });
    } catch (err) {
      console.error('[Characters] Delete error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
