/**
 * User Settings REST API routes.
 *
 * GET  /api/user/settings — return player's settings (defaults if none saved)
 * PUT  /api/user/settings — upsert player's config blob
 */

import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../auth/AuthService.js';
import type { UserSettingsRepository } from '../db/UserSettingsRepository.js';
import { getUserSettingsRepository } from '../db/UserSettingsRepository.js';
import type { UserSettingsConfig } from '../db/types.js';

// ─── Validation Constants ────────────────────────────────────────────────────

const VALID_TOP_LEVEL_KEYS = new Set(['display', 'narration', 'gameplay', 'accessibility']);
const VALID_VERBOSITY = new Set(['terse', 'standard', 'verbose']);
const VALID_NARRATION_STYLE = new Set(['default', 'gothic', 'noir', 'clinical']);
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 24;

const DEFAULT_CONFIG: UserSettingsConfig = {
  display: {},
  narration: {},
  gameplay: {},
  accessibility: {},
};

// ─── Validation ──────────────────────────────────────────────────────────────

function validateConfig(config: unknown): { valid: true; value: UserSettingsConfig } | { valid: false; error: string } {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return { valid: false, error: 'config must be a JSON object' };
  }

  const obj = config as Record<string, unknown>;

  // Reject unknown top-level keys
  for (const key of Object.keys(obj)) {
    if (!VALID_TOP_LEVEL_KEYS.has(key)) {
      return { valid: false, error: `Unknown top-level key: "${key}". Allowed: ${[...VALID_TOP_LEVEL_KEYS].join(', ')}` };
    }
  }

  // Validate display
  if (obj.display !== undefined) {
    if (typeof obj.display !== 'object' || obj.display === null || Array.isArray(obj.display)) {
      return { valid: false, error: 'display must be an object' };
    }
    const display = obj.display as Record<string, unknown>;
    if (display.fontSize !== undefined) {
      if (typeof display.fontSize !== 'number' || !Number.isInteger(display.fontSize)) {
        return { valid: false, error: 'fontSize must be an integer' };
      }
      if (display.fontSize < FONT_SIZE_MIN || display.fontSize > FONT_SIZE_MAX) {
        return { valid: false, error: `fontSize must be between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX}` };
      }
    }
  }

  // Validate narration
  if (obj.narration !== undefined) {
    if (typeof obj.narration !== 'object' || obj.narration === null || Array.isArray(obj.narration)) {
      return { valid: false, error: 'narration must be an object' };
    }
    const narration = obj.narration as Record<string, unknown>;
    if (narration.verbosity !== undefined) {
      if (!VALID_VERBOSITY.has(narration.verbosity as string)) {
        return { valid: false, error: `verbosity must be one of: ${[...VALID_VERBOSITY].join(', ')}` };
      }
    }
    if (narration.narrationStyle !== undefined) {
      if (!VALID_NARRATION_STYLE.has(narration.narrationStyle as string)) {
        return { valid: false, error: `narrationStyle must be one of: ${[...VALID_NARRATION_STYLE].join(', ')}` };
      }
    }
  }

  return { valid: true, value: obj as UserSettingsConfig };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function createSettingsRouter({ authService }: { authService: AuthService }): Router {
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

  /** Resolve the repository — lazily so tests can init the provider first. */
  function repo(): UserSettingsRepository {
    return getUserSettingsRepository();
  }

  // ─── GET /api/user/settings ──────────────────────────────────────────────

  router.get('/api/user/settings', async (req: Request, res: Response) => {
    try {
      const playerId = await authenticate(req, res);
      if (!playerId) return;

      const settings = await repo().getSettings(playerId);
      res.status(200).json({
        config: settings?.config ?? DEFAULT_CONFIG,
      });
    } catch (err) {
      console.error('[Settings] GET error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── PUT /api/user/settings ──────────────────────────────────────────────

  router.put('/api/user/settings', async (req: Request, res: Response) => {
    try {
      const playerId = await authenticate(req, res);
      if (!playerId) return;

      const { config } = req.body as { config?: unknown };
      if (config === undefined) {
        res.status(400).json({ error: 'Request body must include "config"' });
        return;
      }

      const result = validateConfig(config);
      if (!result.valid) {
        res.status(400).json({ error: result.error });
        return;
      }

      const settings = await repo().upsertSettings(playerId, result.value as Record<string, unknown>);
      res.status(200).json({ config: settings.config });
    } catch (err) {
      console.error('[Settings] PUT error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
