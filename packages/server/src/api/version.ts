/**
 * Version API route.
 *
 * GET /api/version — returns server version, start time, and environment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router, type Request, type Response } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf-8'),
);

const SERVER_START_TIME = new Date().toISOString();

export function createVersionRouter(): Router {
  const router = Router();

  router.get('/api/version', (_req: Request, res: Response) => {
    res.json({
      version: rootPkg.version,
      buildTime: SERVER_START_TIME,
      nodeEnv: process.env.NODE_ENV || 'development',
    });
  });

  return router;
}
