/**
 * Admin auth middleware — validates ADMIN_TOKEN from env.
 *
 * Expects: Authorization: Bearer <ADMIN_TOKEN>
 * If ADMIN_TOKEN is not set, all admin requests are rejected (fail-closed).
 */

import type { Request, Response, NextFunction } from 'express';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const adminToken = process.env['ADMIN_TOKEN'];

  if (!adminToken) {
    res.status(503).json({ error: 'Admin access not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== adminToken) {
    res.status(403).json({ error: 'Invalid admin token' });
    return;
  }

  next();
}
