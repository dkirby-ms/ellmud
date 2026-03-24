/**
 * Generic hook for admin entity list operations.
 *
 * Handles loading and error states for entity lists.
 * Used by all admin list pages.
 */

import { useState, useEffect } from 'react';
import { type EntityType, listEntities } from '../lib/admin-api.js';

export interface UseAdminEntityListResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminEntityList<T>(entityType: EntityType): UseAdminEntityListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const entities = await listEntities<T>(entityType);
      setData(entities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [entityType]);

  return { data, loading, error, refresh };
}
