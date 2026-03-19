/**
 * Health endpoint — lightweight liveness probe for load balancers and orchestrators.
 *
 * GET /health → 200 { status: 'ok', uptime, timestamp }
 */

import { Router, type Request, type Response } from 'express';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  return router;
}
