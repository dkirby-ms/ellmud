/**
 * Hall of Fame REST API routes — Permadeath leaderboard.
 *
 * GET /api/hall-of-fame       — paginated list of fallen heroes (sorted by survival time)
 * GET /api/hall-of-fame/stats — aggregate statistics (total deaths, avg survival, deadliest zone/creature)
 */

import { Router, type Request, type Response } from 'express';
import { query } from '../db/index.js';
import { apiLimiter } from '../middleware/rate-limit.js';

export function createHallOfFameRouter(): Router {
  const router = Router();

  // ─── GET /api/hall-of-fame ─────────────────────────────────────────────────
  // Paginated leaderboard sorted by survival time descending.
  router.get('/api/hall-of-fame', apiLimiter, async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await query<{
        id: number;
        character_id: string;
        player_id: string;
        character_name: string;
        level: number;
        total_kills: number;
        total_deaths: number;
        survived_seconds: number;
        cause_of_death: string | null;
        zone_of_death: string | null;
        created_at: Date;
      }>(
        `SELECT id, character_id, player_id, character_name, level, total_kills, 
                total_deaths, survived_seconds, cause_of_death, zone_of_death, created_at
         FROM hall_of_fame
         ORDER BY survived_seconds DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      res.status(200).json({
        entries: result.rows,
        limit,
        offset,
      });
    } catch (err) {
      console.error('[HallOfFame] List error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── GET /api/hall-of-fame/stats ───────────────────────────────────────────
  // Aggregate statistics across all permadeath entries.
  router.get('/api/hall-of-fame/stats', apiLimiter, async (req: Request, res: Response) => {
    try {
      const totalResult = await query<{ total: number; avg_survival: number }>(
        `SELECT COUNT(*) as total, 
                COALESCE(AVG(survived_seconds), 0)::INTEGER as avg_survival
         FROM hall_of_fame`,
        []
      );

      const deadliestZoneResult = await query<{ zone_of_death: string; deaths: number }>(
        `SELECT zone_of_death, COUNT(*) as deaths
         FROM hall_of_fame
         WHERE zone_of_death IS NOT NULL
         GROUP BY zone_of_death
         ORDER BY deaths DESC
         LIMIT 1`,
        []
      );

      const deadliestCreatureResult = await query<{ cause_of_death: string; deaths: number }>(
        `SELECT cause_of_death, COUNT(*) as deaths
         FROM hall_of_fame
         WHERE cause_of_death IS NOT NULL
         GROUP BY cause_of_death
         ORDER BY deaths DESC
         LIMIT 1`,
        []
      );

      res.status(200).json({
        totalPermadeaths: parseInt(String(totalResult.rows[0]?.total || 0), 10),
        averageSurvivalSeconds: totalResult.rows[0]?.avg_survival || 0,
        deadliestZone: deadliestZoneResult.rows[0] || null,
        deadliestCause: deadliestCreatureResult.rows[0] || null,
      });
    } catch (err) {
      console.error('[HallOfFame] Stats error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
