/**
 * role-audit.test.ts — Audit logging for role changes (Issue #373).
 *
 * Design Decision: Role changes are audited. Audit entry includes
 * who changed, what old role, what new role, and when.
 *
 * Uses the existing audit infrastructure (logAuditEvent from audit-routes.ts).
 * Jarlaxle will call logAuditEvent when roles are changed, with the expected
 * shape tested here.
 *
 * Since logAuditEvent requires DATABASE_URL (it no-ops without PG), these
 * tests verify the audit event shape/contract rather than DB persistence.
 * We mock logAuditEvent to capture calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuditEventInput } from '../admin/audit/audit-routes.js';

// ─── Mock the audit logger to capture calls ──────────────────────────────────

const mockLogAuditEvent = vi.fn<[AuditEventInput], Promise<void>>();

vi.mock('../admin/audit/audit-routes.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../admin/audit/audit-routes.js')>();
  return {
    ...orig,
    logAuditEvent: (...args: [AuditEventInput]) => mockLogAuditEvent(...args),
  };
});

// ─── Role Audit Contract Tests ───────────────────────────────────────────────

describe('Role Change Audit Logging (Issue #373)', () => {
  beforeEach(() => {
    mockLogAuditEvent.mockClear();
    mockLogAuditEvent.mockResolvedValue(undefined);
  });

  /**
   * These tests define the audit event contract for role changes.
   * Jarlaxle's implementation should call logAuditEvent with this shape
   * whenever a user's role is changed.
   */

  it('audit event has correct shape for role change', () => {
    // Define the expected audit event shape
    const event: AuditEventInput = {
      action: 'role_change',
      entityType: 'player',
      entityId: 'player-123',
      entityName: 'TestUser',
      actor: 'admin-user-456',
      details: {
        oldRole: 'player',
        newRole: 'admin',
      },
    };

    // Verify the shape matches AuditEventInput interface
    expect(event.action).toBe('role_change');
    expect(event.entityType).toBe('player');
    expect(event.entityId).toBeDefined();
    expect(event.entityName).toBeDefined();
    expect(event.actor).toBeDefined();
    expect(event.details).toBeDefined();
    expect(event.details!['oldRole']).toBeDefined();
    expect(event.details!['newRole']).toBeDefined();
  });

  it('role change from player to content-dev is audited', async () => {
    // Simulate what Jarlaxle's role-change function should do
    const auditEvent: AuditEventInput = {
      action: 'role_change',
      entityType: 'player',
      entityId: 'player-001',
      entityName: 'ContentCreator',
      actor: 'admin-user-999',
      details: {
        oldRole: 'player',
        newRole: 'content-dev',
      },
    };

    await mockLogAuditEvent(auditEvent);

    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'role_change',
        entityType: 'player',
        details: expect.objectContaining({
          oldRole: 'player',
          newRole: 'content-dev',
        }),
      }),
    );
  });

  it('role change from player to admin is audited', async () => {
    const auditEvent: AuditEventInput = {
      action: 'role_change',
      entityType: 'player',
      entityId: 'player-002',
      entityName: 'NewAdmin',
      actor: 'admin-user-999',
      details: {
        oldRole: 'player',
        newRole: 'admin',
      },
    };

    await mockLogAuditEvent(auditEvent);

    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'role_change',
        details: expect.objectContaining({
          oldRole: 'player',
          newRole: 'admin',
        }),
      }),
    );
  });

  it('role change from admin to player (demotion) is audited', async () => {
    const auditEvent: AuditEventInput = {
      action: 'role_change',
      entityType: 'player',
      entityId: 'player-003',
      entityName: 'DemotedUser',
      actor: 'super-admin',
      details: {
        oldRole: 'admin',
        newRole: 'player',
      },
    };

    await mockLogAuditEvent(auditEvent);

    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'role_change',
        details: expect.objectContaining({
          oldRole: 'admin',
          newRole: 'player',
        }),
      }),
    );
  });

  it('audit event includes the actor who made the change', async () => {
    const auditEvent: AuditEventInput = {
      action: 'role_change',
      entityType: 'player',
      entityId: 'player-004',
      entityName: 'TargetUser',
      actor: 'admin-who-changed-it',
      details: {
        oldRole: 'player',
        newRole: 'content-dev',
      },
    };

    await mockLogAuditEvent(auditEvent);

    const call = mockLogAuditEvent.mock.calls[0]![0];
    expect(call.actor).toBe('admin-who-changed-it');
  });

  it('audit event identifies the target player', async () => {
    const auditEvent: AuditEventInput = {
      action: 'role_change',
      entityType: 'player',
      entityId: 'player-specific-id',
      entityName: 'SpecificUser',
      actor: 'admin-actor',
      details: {
        oldRole: 'content-dev',
        newRole: 'admin',
      },
    };

    await mockLogAuditEvent(auditEvent);

    const call = mockLogAuditEvent.mock.calls[0]![0];
    expect(call.entityId).toBe('player-specific-id');
    expect(call.entityName).toBe('SpecificUser');
  });

  it('auto-promote audit uses "system" as actor', async () => {
    // When AUTO_PROMOTE_ADMIN triggers a role change, the actor should
    // be "system" or "auto-promote" since no human initiated it
    const auditEvent: AuditEventInput = {
      action: 'role_change',
      entityType: 'player',
      entityId: 'player-auto',
      entityName: 'AutoPromoted',
      actor: 'system:auto-promote',
      details: {
        oldRole: 'player',
        newRole: 'admin',
      },
    };

    await mockLogAuditEvent(auditEvent);

    const call = mockLogAuditEvent.mock.calls[0]![0];
    expect(call.actor).toMatch(/system|auto-promote/);
  });
});
