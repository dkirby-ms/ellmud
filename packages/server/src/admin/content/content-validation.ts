/**
 * Content validation — basic schema checks for create/update operations.
 *
 * Each entity type has a validator that checks required fields and basic types.
 * Returns an array of error strings (empty = valid).
 *
 * Validation is intentionally permissive for Phase 1 — admin users can define
 * content with flexible schemas. Required fields: at minimum `name` for all types.
 */

import type { ContentEntityType } from './content-types.js';

type Validator = (data: Record<string, unknown>, isUpdate: boolean) => string[];

function requireString(data: Record<string, unknown>, field: string, errors: string[]): void {
  if (typeof data[field] !== 'string' || (data[field] as string).trim() === '') {
    errors.push(`'${field}' is required and must be a non-empty string`);
  }
}

// ─── Items ───────────────────────────────────────────────────────────────────

const VALID_ITEM_TYPES = ['weapon', 'armour', 'consumable', 'material', 'tool', 'key'];

function validateItem(data: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate) {
    requireString(data, 'name', errors);
    if (data['type'] !== undefined && !VALID_ITEM_TYPES.includes(data['type'] as string)) {
      errors.push(`'type' must be one of: ${VALID_ITEM_TYPES.join(', ')}`);
    }
    requireString(data, 'description', errors);
  } else {
    if (data['type'] !== undefined && !VALID_ITEM_TYPES.includes(data['type'] as string)) {
      errors.push(`'type' must be one of: ${VALID_ITEM_TYPES.join(', ')}`);
    }
  }
  return errors;
}

// ─── Creatures ───────────────────────────────────────────────────────────────

function validateCreature(data: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate) {
    requireString(data, 'name', errors);
    requireString(data, 'type', errors);
  }
  return errors;
}

// ─── Modifiers ───────────────────────────────────────────────────────────────

function validateModifier(data: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate) {
    requireString(data, 'name', errors);
    requireString(data, 'description', errors);
  }
  return errors;
}

// ─── Skills ──────────────────────────────────────────────────────────────────

function validateSkill(data: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate) {
    requireString(data, 'name', errors);
    requireString(data, 'description', errors);
  }
  return errors;
}

// ─── Loot Tables ─────────────────────────────────────────────────────────────

function validateLootTable(data: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate) {
    requireString(data, 'name', errors);
    if (!Array.isArray(data['entries'])) {
      errors.push(`'entries' is required and must be an array`);
    }
  }
  return errors;
}

// ─── Factions ────────────────────────────────────────────────────────────────

function validateFaction(data: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate) {
    requireString(data, 'name', errors);
    requireString(data, 'description', errors);
  }
  return errors;
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

function validateRoom(data: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate) {
    requireString(data, 'name', errors);
    requireString(data, 'description', errors);
  }
  return errors;
}

// ─── Narrative ───────────────────────────────────────────────────────────────

function validateNarrative(data: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate) {
    requireString(data, 'name', errors);
    requireString(data, 'template', errors);
  }
  return errors;
}

// ─── Validator Map ───────────────────────────────────────────────────────────

const validators: Record<ContentEntityType, Validator> = {
  items: validateItem,
  creatures: validateCreature,
  modifiers: validateModifier,
  skills: validateSkill,
  'loot-tables': validateLootTable,
  factions: validateFaction,
  rooms: validateRoom,
  narrative: validateNarrative,
};

export function validateContent(
  entityType: ContentEntityType,
  data: Record<string, unknown>,
  isUpdate: boolean,
): string[] {
  const validator = validators[entityType];
  if (!validator) {
    return [`Unknown entity type: ${entityType}`];
  }
  return validator(data, isUpdate);
}
