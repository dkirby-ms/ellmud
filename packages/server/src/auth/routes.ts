/**
 * Auth HTTP routes — mounted on the Express app that Colyseus uses.
 *
 * POST /auth/register — create account, return token
 * POST /auth/login    — verify credentials, return token
 * POST /auth/logout   — invalidate token
 * GET  /auth/me       — validate token, return player info
 */

import { Router, type Request, type Response } from 'express';
import type { AuthService } from './AuthService.js';
import { AuthError, DuplicateUsernameError } from './AuthService.js';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post('/auth/register', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      const result = await authService.register(username as string, password as string);
      res.status(201).json(result);
    } catch (err) {
      handleAuthError(res, err);
    }
  });

  router.post('/auth/login', async (req: Request, res: Response) => {
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
    res.status(200).json({ playerId: payload.playerId, username: payload.username });
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
