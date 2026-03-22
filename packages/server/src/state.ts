import { Schema, defineTypes } from '@colyseus/schema';

/**
 * Internal server-only state for a shard room.
 *
 * CRITICAL: This Schema is NEVER synchronized to clients.
 * Colyseus Schema is used here for server-internal state tracking,
 * serialization/snapshots, and admin dashboard only.
 * The client receives narrated prose via messages.
 */
export class ShardState extends Schema {
  shardId: string = '';
  biome: string = 'flooded_crypt';
  tier: number = 1;
  lifecycle: string = 'seeding';
  stability: number = 1.0;
  collapseTimer: number = 0;
  tick: number = 0;
  playerCount: number = 0;
}

defineTypes(ShardState, {
  shardId: 'string',
  biome: 'string',
  tier: 'number',
  lifecycle: 'string',
  stability: 'number',
  collapseTimer: 'number',
  tick: 'number',
  playerCount: 'number',
});

/**
 * Internal server-only state for the Refuge hub.
 */
export class RefugeState extends Schema {
  tick: number = 0;
  playerCount: number = 0;
}

defineTypes(RefugeState, {
  tick: 'number',
  playerCount: 'number',
});
