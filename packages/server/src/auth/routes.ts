/**
 * Auth HTTP routes — mounted on the Express app that Colyseus uses.
 *
 * POST /auth/register — create account, return token
 * POST /auth/login    — verify credentials, return token
 * POST /auth/logout   — invalidate token
 * GET  /auth/me       — validate token, return player info
 */

import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import type { AuthService } from './AuthService.js';
import { AuthError, DuplicateUsernameError } from './AuthService.js';
import type { PlayerRepository } from './PlayerRepository.js';

/** Rate limit config for login: 10 attempts per 15 min per IP. */
export const LOGIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 } as const;

/** Rate limit config for registration: 5 attempts per hour per IP. */
export const REGISTER_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 } as const;

export function createAuthRouter(authService: AuthService, playerRepo?: PlayerRepository): Router {
  const router = Router();

  const loginLimiter = rateLimit({
    ...LOGIN_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' },
  });

  const registerLimiter = rateLimit({
    ...REGISTER_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many registration attempts. Please try again later.' },
  });

  router.post('/auth/register', registerLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      const result = await authService.register(username as string, password as string);
      res.status(201).json(result);
    } catch (err) {
      handleAuthError(res, err);
    }
  });

  router.post('/auth/login', loginLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      const result = await authService.login(username as string, password as string);
      res.status(200).json(result);
    } catch (err) {
      handleAuthError(res, err);
    }
  });

  router.post('/auth/logout', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(400).json({ error: 'Missing or invalid Authorization header' });
        return;
      }
      const token = authHeader.slice(7);
      await authService.logout(token);
      res.status(200).json({ message: 'Logged out' });
    } catch (err) {
      handleAuthError(res, err);
    }
  });

  router.get('/auth/me', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }
    const token = authHeader.slice(7);
    const payload = await authService.validateToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    // Look up role from identity table if we have a player repo
    let role = 'player';
    if (playerRepo) {
      try {
        role = await playerRepo.getRoleByPlayerId(payload.playerId);
      } catch {
        // Fall back to 'player' if lookup fails
      }
    }

    res.status(200).json({ playerId: payload.playerId, username: payload.username, role });
  });

  return router;
}

function handleAuthError(res: Response, err: unknown): void {
  if (err instanceof DuplicateUsernameError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('[Auth] Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
