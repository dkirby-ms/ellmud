/**
 * Health endpoint — lightweight liveness probe for load balancers and orchestrators.
 *
 * GET /health → 200 { status: 'ok', uptime, timestamp, redis }
 */

import { Router, type Request, type Response } from 'express';

export interface HealthRouterDeps {
  isCacheRedis?: boolean;
  isPresenceRedis?: boolean;
  cacheStatus?: () => string;
  presenceStatus?: () => string;
  isStashPg?: boolean;
}

export function createHealthRouter(deps: HealthRouterDeps = {}): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      redis: {
        cache: deps.cacheStatus ? deps.cacheStatus() : (deps.isCacheRedis ? 'redis' : 'in-memory'),
        presence: deps.presenceStatus ? deps.presenceStatus() : (deps.isPresenceRedis ? 'redis' : 'local'),
      },
      persistence: {
        stash: deps.isStashPg ? 'postgresql' : 'in-memory',
      },
    });
  });

  return router;
}
