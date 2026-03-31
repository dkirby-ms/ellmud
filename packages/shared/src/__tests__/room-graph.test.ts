/**
 * Tests for feature room type helpers (Zone Unification Phase 1).
 *
 * Covers isFeatureRoomType, getFeatureKey, and the FeatureRoomType utility type.
 */
import { describe, it, expect } from 'vitest';
import {
  isFeatureRoomType,
  getFeatureKey,
  type RoomType,
  type FeatureRoomType,
} from '../index.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const FEATURE_ROOM_TYPES: RoomType[] = [
  'feature_stash',
  'feature_shardboard',
  'feature_marketplace',
  'feature_crafting',
  'feature_training',
  'feature_contracts',
  'feature_infirmary',
];

const NON_FEATURE_ROOM_TYPES: RoomType[] = [
  'entry',
  'boss',
  'corridor',
  'junction',
  'dead_end',
];

const EXPECTED_FEATURE_KEYS: Record<string, string> = {
  feature_stash: 'stash',
  feature_shardboard: 'shardboard',
  feature_marketplace: 'marketplace',
  feature_crafting: 'crafting',
  feature_training: 'training',
  feature_contracts: 'contracts',
  feature_infirmary: 'infirmary',
};

// ─── isFeatureRoomType ───────────────────────────────────────────────────────

describe('isFeatureRoomType', () => {
  it.each(FEATURE_ROOM_TYPES)(
    'returns true for feature type "%s"',
    (type) => {
      expect(isFeatureRoomType(type)).toBe(true);
    },
  );

  it.each(NON_FEATURE_ROOM_TYPES)(
    'returns false for non-feature type "%s"',
    (type) => {
      expect(isFeatureRoomType(type)).toBe(false);
    },
  );

  it('returns false for empty string', () => {
    expect(isFeatureRoomType('')).toBe(false);
  });

  it('returns false for "feature" without trailing underscore', () => {
    expect(isFeatureRoomType('feature')).toBe(false);
  });

  it('returns false for "feature_" with nothing after the prefix', () => {
    expect(isFeatureRoomType('feature_')).toBe(false);
  });

  it('handles unknown strings gracefully', () => {
    expect(isFeatureRoomType('random_string')).toBe(false);
    expect(isFeatureRoomType('FEATURE_STASH')).toBe(false);
    expect(isFeatureRoomType('Feature_stash')).toBe(false);
    expect(isFeatureRoomType('feature_unknown_type')).toBe(true);
  });

  it('covers all 7 feature room types', () => {
    const trueCount = FEATURE_ROOM_TYPES.filter(isFeatureRoomType).length;
    expect(trueCount).toBe(7);
  });
});

// ─── getFeatureKey ───────────────────────────────────────────────────────────

describe('getFeatureKey', () => {
  it('returns "stash" for "feature_stash"', () => {
    expect(getFeatureKey('feature_stash')).toBe('stash');
  });

  it('returns "shardboard" for "feature_shardboard"', () => {
    expect(getFeatureKey('feature_shardboard')).toBe('shardboard');
  });

  it.each(Object.entries(EXPECTED_FEATURE_KEYS))(
    'returns "%s" key for type "%s"',
    (type, expectedKey) => {
      expect(getFeatureKey(type)).toBe(expectedKey);
    },
  );

  it.each(NON_FEATURE_ROOM_TYPES)(
    'returns null for non-feature type "%s"',
    (type) => {
      expect(getFeatureKey(type)).toBeNull();
    },
  );

  it('returns null for empty string', () => {
    expect(getFeatureKey('')).toBeNull();
  });

  it('returns null for "feature_" (prefix with nothing after it)', () => {
    // Edge case: bare prefix is not a valid feature room type
    expect(getFeatureKey('feature_')).toBeNull();
  });

  it('returns null for "feature" without underscore', () => {
    expect(getFeatureKey('feature')).toBeNull();
  });

  it('handles unknown strings gracefully', () => {
    expect(getFeatureKey('some_random_type')).toBeNull();
    expect(getFeatureKey('FEATURE_STASH')).toBeNull();
  });
});

// ─── FeatureRoomType utility type ────────────────────────────────────────────

describe('FeatureRoomType', () => {
  it('extracts exactly the 7 feature types from RoomType', () => {
    // Compile-time check: each feature type is assignable to FeatureRoomType
    const featureTypes: FeatureRoomType[] = [
      'feature_stash',
      'feature_shardboard',
      'feature_marketplace',
      'feature_crafting',
      'feature_training',
      'feature_contracts',
      'feature_infirmary',
    ];
    expect(featureTypes).toHaveLength(7);
  });

  it('non-feature types are not assignable to FeatureRoomType at runtime', () => {
    // Runtime assertion that the union is correctly separated
    const allRoomTypes: RoomType[] = [...NON_FEATURE_ROOM_TYPES, ...FEATURE_ROOM_TYPES];
    const featureOnly = allRoomTypes.filter(isFeatureRoomType);
    expect(featureOnly).toHaveLength(7);
    expect(featureOnly).toEqual(expect.arrayContaining(FEATURE_ROOM_TYPES));
  });
});
