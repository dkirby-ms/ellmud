/**
 * Entra OAuth routes — /auth/entra/login and /auth/entra/callback
 *
 * Handles authorization code flow for Microsoft Entra External ID.
 * State stored in cookies for CSRF protection.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import type { AuthService } from './AuthService.js';
import type { EntraAuthService } from './EntraAuthService.js';
import { authLimiter } from '../middleware/rate-limit.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 5 * 60 * 1000, // 5 minutes
  sameSite: 'lax' as const,
};

export function createEntraRouter(
  authService: AuthService,
  entraService: EntraAuthService,
): Router {
  const router = Router();
  router.use(cookieParser());

  /**
   * GET /auth/entra/login
   * Redirect user to Entra External ID for authentication.
   */
  router.get('/auth/entra/login', (req: Request, res: Response) => {
    try {
      const { url, state, nonce } = entraService.getAuthorizationUrl();

      // Store state and nonce in secure cookies for CSRF validation
      res.cookie('entra_state', state, COOKIE_OPTIONS);
      res.cookie('entra_nonce', nonce, COOKIE_OPTIONS);

      res.redirect(url);
    } catch (err) {
      console.error('[Entra] Authorization URL generation failed:', err);
      res.status(500).send('OAuth initialization failed');
    }
  });

  /**
   * GET /auth/entra/callback
   * Handle OAuth callback — exchange code for tokens, create/find player, issue session token.
   */
  router.get('/auth/entra/callback', authLimiter, async (req: Request, res: Response) => {
    const expectedState = req.cookies.entra_state as string | undefined;
    const expectedNonce = req.cookies.entra_nonce as string | undefined;

    // Clear state/nonce cookies
    res.clearCookie('entra_state');
    res.clearCookie('entra_nonce');

    if (!expectedState || !expectedNonce) {
      return res.status(400).send('Missing OAuth state — CSRF protection triggered');
    }

    try {
      // Construct callback URL from request
      const callbackUrl = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);

      // Exchange authorization code for user info
      const userInfo = await entraService.handleCallback(
        callbackUrl,
        expectedState,
        expectedNonce,
      );

      // Login or auto-register via OAuth
      const { playerId, token, username } = await authService.loginOAuth(
        'entra',
        userInfo.oid,
        userInfo.email ?? null,
        userInfo.name ?? userInfo.preferred_username ?? null,
      );

      // Redirect to client with token and playerId as query params
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const params = new URLSearchParams({ token, playerId, username });
      if (userInfo.email) params.set('email', userInfo.email);
      const redirectUrl = `${clientUrl}/auth/callback?${params.toString()}`;
      
      res.redirect(redirectUrl);
    } catch (err) {
      console.error('[Entra] OAuth callback failed:', err);
      res.redirect('/?error=oauth_failed');
    }
  });

  return router;
}
