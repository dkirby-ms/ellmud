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
export { createContentRouter, initializeContentStores, type ContentRouterDeps } from './content/index.js';
export { createUserRouter } from './users/index.js';
export { createDashboardApiRouter, type DashboardRouterDeps } from './content/index.js';
export { createAuditRouter } from './audit/audit-routes.js';
export { createSimulateRouter, type SimulateRouterDeps } from './simulate/index.js';
