/**
 * Admin content module barrel export.
 */

export { ContentStore, ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';
export { createContentRouter, type ContentRouterDeps } from './content-routes.js';
export { createDashboardApiRouter, type DashboardRouterDeps } from './dashboard-routes.js';
export { initializeContentStores } from './init.js';
export { validateContent } from './content-validation.js';
export { CONTENT_ENTITY_TYPES, type ContentEntityType } from './content-types.js';
export type {
  ModifierDefinition,
  SkillDefinition,
  LootTableDefinition,
  FactionDefinition,
  NarrativeTemplateDefinition,
} from './content-types.js';
