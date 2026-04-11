/**
 * Shared rate-limit factory — wraps express-rate-limit with the
 * ALLOW_LOCAL_AUTH bypass used across the codebase.
 *
 * Usage:
 *   import { createLimiter } from '../middleware/rate-limit.js';
 *   router.post('/foo', createLimiter({ windowMs: 15*60*1000, max: 30 }), handler);
 */

import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const skipRateLimit = process.env.ALLOW_LOCAL_AUTH === 'true';

const noopMiddleware: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

/**
 * Create a rate-limiting middleware. When ALLOW_LOCAL_AUTH is true the limiter
 * is replaced with a no-op so local dev / E2E tests are not throttled.
 */
export function createLimiter(opts: Partial<Options>): RequestHandler {
  if (skipRateLimit) return noopMiddleware;

  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...opts,
  });
}

// ─── Pre-built limiters for common tiers ─────────────────────────────────────

/** General API — 60 req / 15 min per IP. */
export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
});

/** Auth / OAuth callbacks — 20 req / 15 min per IP. */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

/** Admin write endpoints — 100 req / 15 min per IP (already behind adminAuth). */
export const adminWriteLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many admin requests. Please try again later.' },
});

/** Static / catch-all — 200 req / 15 min per IP. */
export const staticLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please try again later.' },
});
