/**
 * Admin module barrel export.
 */

export { createAdminRouter, type AdminRouterDeps } from './routes.js';
export { createDashboardRouter } from './dashboard.js';
export { adminAuth } from './middleware.js';
export type {
  AdminRoomSummary,
  AdminShardDetail,
  AdminRefugeDetail,
  AdminPlayerInfo,
  AdminCreatureInfo,
  AdminMetrics,
  AdminSSEEvent,
} from './types.js';
