/**
 * role-hierarchy.test.ts — Role hierarchy and comparison utility (Issue #373).
 *
 * Design Decision: player < content-dev < admin
 *
 * Tests the role type, ordering, and comparison functions that Jarlaxle
 * will implement in auth/roles.ts. These tests define the contract.
 *
 * TDD: Will fail until auth/roles.ts is created with:
 *   - UserRole type: 'player' | 'content-dev' | 'admin'
 *   - ROLE_HIERARCHY: ordered list of roles
 *   - hasRole(userRole, requiredRole): boolean — returns true if userRole >= requiredRole
 *   - isAdmin(role): boolean — shorthand for hasRole(role, 'admin')
 *   - isContentDev(role): boolean — shorthand for hasRole(role, 'content-dev')
 */

import { describe, it, expect } from 'vitest';
import {
  type UserRole,
  ROLE_HIERARCHY_LIST as ROLE_HIERARCHY,
  hasRole,
  isAdmin,
  isContentDev,
} from '../auth/roles.js';

// ─── Role Type Tests ─────────────────────────────────────────────────────────

describe('Role Hierarchy (Issue #373)', () => {
  describe('ROLE_HIERARCHY ordering', () => {
    it('defines exactly three roles', () => {
      expect(ROLE_HIERARCHY).toHaveLength(3);
    });

    it('orders player < content-dev < admin', () => {
      expect(ROLE_HIERARCHY).toEqual(['player', 'content-dev', 'admin']);
    });

    it('player is the lowest role (index 0)', () => {
      expect(ROLE_HIERARCHY[0]).toBe('player');
    });

    it('admin is the highest role (index 2)', () => {
      expect(ROLE_HIERARCHY[2]).toBe('admin');
    });
  });

  // ─── hasRole() — "does this user meet the minimum required role?" ────────

  describe('hasRole(userRole, requiredRole)', () => {
    describe('player role', () => {
      it('player meets player requirement', () => {
        expect(hasRole('player', 'player')).toBe(true);
      });

      it('player does NOT meet content-dev requirement', () => {
        expect(hasRole('player', 'content-dev')).toBe(false);
      });

      it('player does NOT meet admin requirement', () => {
        expect(hasRole('player', 'admin')).toBe(false);
      });
    });

    describe('content-dev role', () => {
      it('content-dev meets player requirement', () => {
        expect(hasRole('content-dev', 'player')).toBe(true);
      });

      it('content-dev meets content-dev requirement', () => {
        expect(hasRole('content-dev', 'content-dev')).toBe(true);
      });

      it('content-dev does NOT meet admin requirement', () => {
        expect(hasRole('content-dev', 'admin')).toBe(false);
      });
    });

    describe('admin role', () => {
      it('admin meets player requirement', () => {
        expect(hasRole('admin', 'player')).toBe(true);
      });

      it('admin meets content-dev requirement', () => {
        expect(hasRole('admin', 'content-dev')).toBe(true);
      });

      it('admin meets admin requirement', () => {
        expect(hasRole('admin', 'admin')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('unknown role does not meet any requirement', () => {
        expect(hasRole('unknown' as UserRole, 'player')).toBe(false);
      });

      it('same role always meets itself', () => {
        const roles: UserRole[] = ['player', 'content-dev', 'admin'];
        for (const role of roles) {
          expect(hasRole(role, role)).toBe(true);
        }
      });
    });
  });

  // ─── Convenience helpers ─────────────────────────────────────────────────

  describe('isAdmin(role)', () => {
    it('returns true for admin', () => {
      expect(isAdmin('admin')).toBe(true);
    });

    it('returns false for content-dev', () => {
      expect(isAdmin('content-dev')).toBe(false);
    });

    it('returns false for player', () => {
      expect(isAdmin('player')).toBe(false);
    });
  });

  describe('isContentDev(role)', () => {
    it('returns true for content-dev', () => {
      expect(isContentDev('content-dev')).toBe(true);
    });

    it('returns true for admin (admin outranks content-dev)', () => {
      expect(isContentDev('admin')).toBe(true);
    });

    it('returns false for player', () => {
      expect(isContentDev('player')).toBe(false);
    });
  });
});
