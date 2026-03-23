/**
 * Generic hook for admin entity CRUD operations.
 *
 * Handles loading, error states, and CRUD operations for any entity type.
 * Used by all admin detail pages to avoid duplicating fetch/save/error logic.
 */

import { useState, useEffect } from 'react';
import {
  type EntityType,
  getEntity,
  updateEntity,
  createEntity,
} from '../lib/admin-api.js';

export interface UseAdminEntityResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  save: (data: Partial<T>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAdminEntity<T extends { id?: string }>(
  entityType: EntityType,
  id: string | undefined,
  isNew: boolean
): UseAdminEntityResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = async () => {
    if (isNew || !id) return;

    setLoading(true);
    setError(null);

    try {
      const entity = await getEntity<T>(entityType, id);
      setData(entity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [entityType, id, isNew]);

  const save = async (updatedData: Partial<T>) => {
    setSaving(true);
    setSaveError(null);

    try {
      let savedEntity: T;

      if (isNew) {
        savedEntity = await createEntity<T>(entityType, updatedData);
      } else if (id) {
        savedEntity = await updateEntity<T>(entityType, id, updatedData);
      } else {
        throw new Error('Cannot save: missing entity ID');
      }

      setData(savedEntity);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save entity';
      setSaveError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { data, loading, error, saving, saveError, save, refresh };
}
