/**
 * MetricsService — unit tests with mocked pg pool.
 *
 * Validates gameplay metric recording (deaths, kills, loot, combat stats).
 * Tests against Jarlaxle's MetricsService API for issue #360.
 *
 * The public recordX() methods are fire-and-forget (return void).
 * We flush the microtask queue after each call to assert on the mock.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  DeathMetadata,
  KillMetadata,
  LootPickupMetadata,
  CombatStatsMetadata,
  RoomJoinMetadata,
  RoomLeaveMetadata,
  ChatMessageMetadata,
  RoomSnapshotMetadata,
} from '../metrics/MetricsService.js';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

// ─── MetricsService under test ───────────────────────────────────────────────

import { MetricsService } from '../metrics/MetricsService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockInsertResult() {
  return {
    rows: [],
    command: 'INSERT' as const,
    rowCount: 1,
    oid: 0,
    fields: [],
  };
}

/** Flush the fire-and-forget promise chain (.then/.catch on record()). */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MetricsService', () => {
  let service: MetricsService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MetricsService();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ─── recordDeath ──────────────────────────────────────────────────────────

  describe('recordDeath', () => {
    const baseMeta: DeathMetadata = {
      roomId: 'room-12',
      killerIds: ['creature-spider-01'],
      isPvP: false,
      itemsLost: 2,
    };

    it('should insert a death event with correct player and metadata', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordDeath('player-1', baseMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_metrics'),
        expect.arrayContaining(['player-1', 'death']),
      );
    });

    it('should pass event_type as "death"', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordDeath('player-1', baseMeta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      expect(params).toContain('death');
    });

    it('should record PvP death with killer attribution in metadata', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      const pvpMeta: DeathMetadata = {
        roomId: 'room-12',
        killerIds: ['player-2'],
        isPvP: true,
        itemsLost: 5,
      };

      service.recordDeath('player-1', pvpMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [, params] = queryMock.mock.calls[0];
      const serializedMeta = params![2] as string;
      const parsed = JSON.parse(serializedMeta);
      expect(parsed.isPvP).toBe(true);
      expect(parsed.killerIds).toContain('player-2');
    });

    it('should not throw when DB insert fails (non-blocking)', async () => {
      queryMock.mockRejectedValueOnce(new Error('connection refused'));

      // recordDeath returns void — this must not throw
      service.recordDeath('player-1', baseMeta);
      await flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[metrics]'),
        expect.any(Error),
      );
    });

    it('should handle empty killerIds for environmental death', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      const envMeta: DeathMetadata = {
        roomId: 'room-1',
        killerIds: [],
        isPvP: false,
        itemsLost: 0,
      };

      service.recordDeath('player-1', envMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
    });
  });

  // ─── recordKill ───────────────────────────────────────────────────────────

  describe('recordKill', () => {
    const baseMeta: KillMetadata = {
      victimId: 'creature-spider-01',
      victimName: 'Giant Spider',
      roomId: 'room-12',
      isCreature: true,
      damageDealt: 45,
    };

    it('should insert a kill event with attacker and victim data', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordKill('player-1', baseMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_metrics'),
        expect.arrayContaining(['player-1', 'kill']),
      );
    });

    it('should serialize victim info in metadata JSONB', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordKill('player-1', baseMeta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const serializedMeta = params![2] as string;
      const parsed = JSON.parse(serializedMeta);
      expect(parsed.victimId).toBe('creature-spider-01');
      expect(parsed.victimName).toBe('Giant Spider');
      expect(parsed.isCreature).toBe(true);
    });

    it('should record PvP kill with player victim', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      const pvpKill: KillMetadata = {
        victimId: 'player-2',
        victimName: 'UnluckyBob',
        roomId: 'room-12',
        isCreature: false,
      };

      service.recordKill('player-1', pvpKill);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.isCreature).toBe(false);
    });

    it('should not throw when DB insert fails (non-blocking)', async () => {
      queryMock.mockRejectedValueOnce(new Error('table does not exist'));

      service.recordKill('player-1', baseMeta);
      await flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[metrics]'),
        expect.any(Error),
      );
    });

    it('should handle optional damageDealt being undefined', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      const noDmg: KillMetadata = {
        victimId: 'creature-01',
        victimName: 'Goblin',
        roomId: 'room-1',
        isCreature: true,
      };

      service.recordKill('player-1', noDmg);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
    });
  });

  // ─── recordLootPickup ─────────────────────────────────────────────────────

  describe('recordLootPickup', () => {
    const baseMeta: LootPickupMetadata = {
      itemId: 'iron-ore',
      itemName: 'Iron Ore',
      roomId: 'room-12',
      source: 'corpse',
    };

    it('should insert a loot_pickup event with item details', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordLootPickup('player-1', baseMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_metrics'),
        expect.arrayContaining(['player-1', 'loot_pickup']),
      );
    });

    it('should serialize item info in metadata JSONB', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordLootPickup('player-1', baseMeta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.itemId).toBe('iron-ore');
      expect(parsed.itemName).toBe('Iron Ore');
      expect(parsed.source).toBe('corpse');
    });

    it('should handle room-source loot (not from corpse)', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      const roomLoot: LootPickupMetadata = {
        itemId: 'gold-coin',
        itemName: 'Gold Coin',
        roomId: 'room-1',
        source: 'room',
      };

      service.recordLootPickup('player-1', roomLoot);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.source).toBe('room');
    });

    it('should not throw when DB insert fails (non-blocking)', async () => {
      queryMock.mockRejectedValueOnce(new Error('disk full'));

      service.recordLootPickup('player-1', baseMeta);
      await flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[metrics]'),
        expect.any(Error),
      );
    });
  });

  // ─── recordCombatStats ────────────────────────────────────────────────────

  describe('recordCombatStats', () => {
    const baseMeta: CombatStatsMetadata = {
      roomId: 'room-12',
      damageDealt: 150,
      damageTaken: 80,
      hits: 5,
      misses: 2,
    };

    it('should insert combat_stats event with damage breakdown', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordCombatStats('player-1', baseMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_metrics'),
        expect.arrayContaining(['player-1', 'combat_stats']),
      );
    });

    it('should store full combat stats as JSONB metadata', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordCombatStats('player-1', baseMeta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.damageDealt).toBe(150);
      expect(parsed.damageTaken).toBe(80);
      expect(parsed.hits).toBe(5);
      expect(parsed.misses).toBe(2);
    });

    it('should include optional encounterId when provided', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      const withEncounter: CombatStatsMetadata = {
        ...baseMeta,
        encounterId: 'encounter-abc123',
      };

      service.recordCombatStats('player-1', withEncounter);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.encounterId).toBe('encounter-abc123');
    });

    it('should not throw when DB insert fails (non-blocking)', async () => {
      queryMock.mockRejectedValueOnce(new Error('syntax error'));

      service.recordCombatStats('player-1', baseMeta);
      await flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[metrics]'),
        expect.any(Error),
      );
    });
  });

  describe('recordRoomJoin', () => {
    const baseMeta: RoomJoinMetadata = {
      roomId: 'zone-room-1',
      roomName: 'zone:warrens',
      zoneSlug: 'warrens',
      playerCount: 12,
    };

    it('should insert a room_join event with occupancy metadata', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordRoomJoin('player-1', baseMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_metrics'),
        expect.arrayContaining(['player-1', 'room_join']),
      );
    });

    it('should serialize room join metadata', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordRoomJoin('player-1', baseMeta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.roomName).toBe('zone:warrens');
      expect(parsed.playerCount).toBe(12);
      expect(parsed.zoneSlug).toBe('warrens');
    });
  });

  describe('recordRoomLeave', () => {
    const baseMeta: RoomLeaveMetadata = {
      roomId: 'zone-room-1',
      roomName: 'zone:warrens',
      zoneSlug: 'warrens',
      playerCount: 11,
      reason: 'transfer',
    };

    it('should insert a room_leave event with leave reason', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordRoomLeave('player-1', baseMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_metrics'),
        expect.arrayContaining(['player-1', 'room_leave']),
      );
    });

    it('should serialize leave reason and next occupancy', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordRoomLeave('player-1', baseMeta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.reason).toBe('transfer');
      expect(parsed.playerCount).toBe(11);
    });
  });

  describe('recordChatMessage', () => {
    const baseMeta: ChatMessageMetadata = {
      roomId: 'zone-room-1',
      roomName: 'zone:warrens',
      zoneSlug: 'warrens',
      channelType: 'group',
    };

    it('should insert a chat_message event with channel metadata', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordChatMessage('player-1', baseMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_metrics'),
        expect.arrayContaining(['player-1', 'chat_message']),
      );
    });

    it('should serialize chat channel metadata', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordChatMessage('player-1', baseMeta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.channelType).toBe('group');
      expect(parsed.roomName).toBe('zone:warrens');
    });
  });

  describe('recordRoomSnapshot', () => {
    const baseMeta: RoomSnapshotMetadata = {
      roomId: 'zone-room-1',
      roomName: 'zone:warrens',
      zoneSlug: 'warrens',
      playerCount: 10,
      uptimeSeconds: 60,
    };

    it('should insert a room_snapshot event without requiring player scope', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordRoomSnapshot(baseMeta);
      await flush();

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_metrics'),
        [null, 'room_snapshot', JSON.stringify(baseMeta)],
      );
    });

    it('should serialize snapshot uptime metadata', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordRoomSnapshot(baseMeta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.playerCount).toBe(10);
      expect(parsed.uptimeSeconds).toBe(60);
    });
  });

  // ─── Metadata JSONB serialization ─────────────────────────────────────────

  describe('JSONB metadata', () => {
    it('should correctly serialize nested metadata to JSON string', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      const meta: CombatStatsMetadata = {
        roomId: 'room-1',
        damageDealt: 100,
        damageTaken: 50,
        hits: 3,
        misses: 1,
        encounterId: 'enc-1',
      };

      service.recordCombatStats('player-1', meta);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      // Third param should be a JSON string
      expect(typeof params![2]).toBe('string');
      expect(() => JSON.parse(params![2] as string)).not.toThrow();
    });

    it('should handle metadata with all fields populated', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      const fullDeath: DeathMetadata = {
        roomId: 'room-99',
        killerIds: ['player-2', 'creature-wolf-03'],
        isPvP: true,
        itemsLost: 7,
      };

      service.recordDeath('player-1', fullDeath);
      await flush();

      const [, params] = queryMock.mock.calls[0];
      const parsed = JSON.parse(params![2] as string);
      expect(parsed.roomId).toBe('room-99');
      expect(parsed.killerIds).toHaveLength(2);
      expect(parsed.itemsLost).toBe(7);
    });
  });

  // ─── SQL structure ────────────────────────────────────────────────────────

  describe('SQL structure', () => {
    it('should insert into game_metrics table', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordDeath('player-1', {
        roomId: 'room-1',
        isPvP: false,
        itemsLost: 0,
      });
      await flush();

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toContain('game_metrics');
    });

    it('should use parameterized queries (not string interpolation)', async () => {
      queryMock.mockResolvedValueOnce(mockInsertResult());

      service.recordKill('player-1', {
        victimId: 'c-1',
        victimName: 'Goblin',
        roomId: 'r-1',
        isCreature: true,
      });
      await flush();

      const [sql, params] = queryMock.mock.calls[0];
      // Should use $1, $2, $3 placeholders
      expect(sql).toContain('$1');
      expect(sql).toContain('$2');
      expect(sql).toContain('$3');
      expect(params).toHaveLength(3);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle concurrent metric writes independently', async () => {
      queryMock.mockResolvedValue(mockInsertResult());

      for (let i = 0; i < 10; i++) {
        service.recordKill(`player-${i}`, {
          victimId: `creature-${i}`,
          victimName: `Creature ${i}`,
          roomId: 'room-1',
          isCreature: true,
        });
      }
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(10);
    });

    it('should survive mixed success and failure in concurrent writes', async () => {
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          queryMock.mockResolvedValueOnce(mockInsertResult());
        } else {
          queryMock.mockRejectedValueOnce(new Error(`fail-${i}`));
        }
      }

      for (let i = 0; i < 5; i++) {
        service.recordDeath(`player-${i}`, {
          roomId: 'room-1',
          isPvP: false,
          itemsLost: 0,
        });
      }
      await flush();

      // All 5 writes attempted, 2 failed
      expect(queryMock).toHaveBeenCalledTimes(5);
      // Failures logged but never thrown
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it('should log specific event type and player in error message', async () => {
      queryMock.mockRejectedValueOnce(new Error('boom'));

      service.recordDeath('player-99', {
        roomId: 'room-1',
        isPvP: false,
        itemsLost: 0,
      });
      await flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('death'),
        expect.any(Error),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('player-99'),
        expect.any(Error),
      );
    });

    it('should correctly distinguish all supported event types', async () => {
      queryMock.mockResolvedValue(mockInsertResult());

      service.recordDeath('p1', { roomId: 'r1', isPvP: false, itemsLost: 0 });
      service.recordKill('p1', { victimId: 'c1', victimName: 'G', roomId: 'r1', isCreature: true });
      service.recordLootPickup('p1', { itemId: 'i1', itemName: 'I', roomId: 'r1', source: 'room' });
      service.recordCombatStats('p1', { roomId: 'r1', damageDealt: 1, damageTaken: 1, hits: 1, misses: 0 });
      service.recordRoomJoin('p1', { roomId: 'zone-1', roomName: 'zone:warrens', playerCount: 2 });
      service.recordRoomLeave('p1', { roomId: 'zone-1', roomName: 'zone:warrens', playerCount: 1, reason: 'disconnect' });
      service.recordChatMessage('p1', { roomId: 'zone-1', roomName: 'zone:warrens', channelType: 'say' });
      service.recordRoomSnapshot({ roomId: 'zone-1', roomName: 'zone:warrens', playerCount: 1, uptimeSeconds: 60 });
      await flush();

      const eventTypes = queryMock.mock.calls.map((c) => (c[1] as unknown[])[1]);
      expect(eventTypes).toContain('death');
      expect(eventTypes).toContain('kill');
      expect(eventTypes).toContain('loot_pickup');
      expect(eventTypes).toContain('combat_stats');
      expect(eventTypes).toContain('room_join');
      expect(eventTypes).toContain('room_leave');
      expect(eventTypes).toContain('chat_message');
      expect(eventTypes).toContain('room_snapshot');
    });
  });

  // ─── Provider integration ─────────────────────────────────────────────────

  describe('metrics-provider', () => {
    it('should return a no-op service when initialized without PG', async () => {
      const { initMetricsProvider, getMetricsService, resetMetricsProvider } =
        await import('../metrics/metrics-provider.js');

      resetMetricsProvider();
      initMetricsProvider(false);
      const svc = getMetricsService();

      // No-op service should not call query at all
      svc.recordDeath('p1', { roomId: 'r1', isPvP: false, itemsLost: 0 });
      await flush();

      // queryMock should NOT have been called for no-op
      const callsBeforeProvider = queryMock.mock.calls.length;
      expect(callsBeforeProvider).toBe(0);

      resetMetricsProvider();
    });

    it('should return a live service when initialized with PG', async () => {
      const { initMetricsProvider, getMetricsService, resetMetricsProvider } =
        await import('../metrics/metrics-provider.js');

      queryMock.mockResolvedValueOnce(mockInsertResult());

      resetMetricsProvider();
      initMetricsProvider(true);
      const svc = getMetricsService();

      svc.recordDeath('p1', { roomId: 'r1', isPvP: false, itemsLost: 0 });
      await flush();

      expect(queryMock).toHaveBeenCalledTimes(1);

      resetMetricsProvider();
    });

    it('should fall back to no-op when not initialized', async () => {
      const { getMetricsService, resetMetricsProvider } =
        await import('../metrics/metrics-provider.js');

      resetMetricsProvider();
      const svc = getMetricsService();

      svc.recordKill('p1', { victimId: 'c1', victimName: 'G', roomId: 'r1', isCreature: true });
      await flush();

      expect(queryMock).not.toHaveBeenCalled();

      resetMetricsProvider();
    });
  });
});
