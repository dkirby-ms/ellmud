import { Room, Client, matchMaker } from '@colyseus/core';
import {
  type CommandMessage,
  type NarrateMessage,
  type RoomHeaderMessage,
  type RoomSwitchMessage,
  type StashItem,
  type BiomeType,
  type ShardTier,
  MessageTypes,
} from '@ellmud/shared';
import { RefugeState } from '../state.js';
import { authenticateClient } from '../auth/colyseus-auth.js';
import { StashService, InMemoryStashRepository, getStashRepository, getItemDefs } from '../stash/index.js';
import type { StashRepository } from '../stash/index.js';
import { getConfig } from '../config.js';
import { AmbientSystem } from '../systems/AmbientSystem.js';

const TICK_INTERVAL_MS = 1000;

interface RefugeRoomOptions {
  state: RefugeState;
}

interface ShardListing {
  roomId: string;
  biome: BiomeType;
  tier: ShardTier;
  lifecycle: string;
  playerCount: number;
  maxPlayers: number;
  locked: boolean;
}

/**
 * RefugeRoom — The persistent hub / safe zone.
 *
 * Long-lived room with ambient simulation (NPCs, events, faction activity).
 * No combat occurs here. The tick system drives ambient world feel.
 *
 * ARCHITECTURAL CONSTRAINT:
 * - NO Schema state is ever synced to clients.
 * - All client communication uses room.send() with typed messages.
 */
export class RefugeRoom extends Room<RefugeRoomOptions> {
  private stashService!: StashService;
  private ambientSystem!: AmbientSystem;
  /** Maps sessionId → playerId for stash lookups. */
  private playerIds = new Map<string, string>();

  /**
   * Inject dependencies. Called before room lifecycle if provided.
   * Falls back to in-memory defaults for Phase 1.
   */
  initStash(repo?: StashRepository, itemDefs?: Map<string, StashItem>): void {
    this.stashService = new StashService(
      repo ?? new InMemoryStashRepository(),
      itemDefs ?? new Map(),
    );
  }

  onCreate(): void {
    this.setState(new RefugeState());

    // Initialize stash with shared provider if not already injected
    if (!this.stashService) {
      this.initStash(getStashRepository(), getItemDefs());
    }

    // Initialize ambient world simulation
    this.ambientSystem = new AmbientSystem();

    this.onMessage(MessageTypes.COMMAND, (client: Client, message: CommandMessage) => {
      void this.handleCommand(client, message);
    });

    // Ambient tick — drives NPC movement, weather, faction events
    this.setSimulationInterval((deltaTime: number) => this.update(deltaTime), TICK_INTERVAL_MS);

    this.log('RefugeRoom created — The Refuge is open.');
  }

  async onAuth(_client: Client, options: Record<string, unknown>): Promise<unknown> {
    return authenticateClient(options['token'] as string | undefined);
  }

  async onJoin(client: Client, options: Record<string, unknown>): Promise<void> {
    this.state.playerCount++;

    // Resolve player ID: from auth context or fallback to sessionId
    const playerId = (options['playerId'] as string) || client.sessionId;
    this.playerIds.set(client.sessionId, playerId);


    this.log(`Player joined Refuge: ${client.sessionId} (${this.state.playerCount} players)`);

    client.send(MessageTypes.NARRATE, {
      text: 'You emerge into the Refuge. The air is warm, the walls are solid. You are safe — for now.',
      type: 'system',
      timestamp: Date.now(),
    } satisfies NarrateMessage);

    // Ambient world snapshot on join
    client.send(MessageTypes.NARRATE, {
      text: this.ambientSystem.getJoinNarration(),
      type: 'ambient',
      timestamp: Date.now(),
    } satisfies NarrateMessage);

    client.send(MessageTypes.ROOM_HEADER, {
      roomName: 'The Refuge — Central Plaza',
      exits: [],
      stability: 1.0,
    } satisfies RoomHeaderMessage);

    // Load stash on Refuge entry and send summary
    try {
      const summary = await this.stashService.getStashSummary(playerId);
      client.send(MessageTypes.NARRATE, {
        text: summary,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch (err) {
      this.log(`Failed to load stash for ${playerId}: ${err}`);
    }
  }

  onLeave(client: Client): void {
    this.state.playerCount--;
    this.playerIds.delete(client.sessionId);
    this.log(`Player left Refuge: ${client.sessionId} (${this.state.playerCount} players)`);
  }

  onDispose(): void {
    this.log('RefugeRoom disposed.');
  }

  // ─── Ambient Tick ────────────────────────────────────────────────────────

  private update(_deltaTime: number): void {
    this.state.tick++;

    // Drive ambient world simulation
    const events = this.ambientSystem.tick();

    // Broadcast ambient events to all connected clients
    for (const event of events) {
      this.broadcast(MessageTypes.NARRATE, {
        text: event.narrative,
        type: 'ambient',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  // ─── Command Handling ────────────────────────────────────────────────────

  private async handleCommand(client: Client, message: CommandMessage): Promise<void> {
    this.log(`Command from ${client.sessionId}: ${message.verb} ${message.args.join(' ')}`);

    try {
      switch (message.verb) {
        case 'look':
          client.send(MessageTypes.NARRATE, {
            text: this.ambientSystem.getJoinNarration(),
            type: 'room',
            timestamp: Date.now(),
          } satisfies NarrateMessage);
          break;

        case 'shardboard':
          await this.handleShardboardCommand(client);
          break;

        case 'enter':
          await this.handleEnterCommand(client, message.args);
          break;

        case 'stash':
          await this.handleStashCommand(client);
          break;

        case 'take':
          await this.handleTakeCommand(client, message.args);
          break;

        case 'store':
          await this.handleStoreCommand(client, message.args);
          break;


        default:
          client.send(MessageTypes.NARRATE, {
            text: `You try to "${message.verb}" but nothing happens here.`,
            type: 'system',
            timestamp: Date.now(),
          } satisfies NarrateMessage);
          break;
      }
    } catch (err) {
      this.log(`Refuge command failed: ${err}`);
      client.send(MessageTypes.NARRATE, {
        text: 'Something went wrong. Try again in a moment.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  // ─── Enter Command ──────────────────────────────────────────────────────

  private async handleEnterCommand(client: Client, args: string[]): Promise<void> {
    const requestedId = args[0]?.trim();
    const listings = await this.getShardListings();

    if (requestedId && requestedId.toLowerCase() !== 'shard') {
      const shard = listings.find((entry) => entry.roomId === requestedId);
      if (!shard) {
        client.send(MessageTypes.NARRATE, {
          text: `No shard with id "${requestedId}" is listed. Check the shardboard for available rifts.`,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      if (!this.isShardJoinable(shard)) {
        client.send(MessageTypes.NARRATE, {
          text: this.describeShardRejection(shard),
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      this.sendShardSwitch(client, shard);
      return;
    }

    let shard = this.pickOpenShard(listings);
    if (!shard) {
      const created = await this.createShardRoom();
      if (created && this.isShardJoinable(created)) {
        shard = created;
      }
    }

    if (!shard) {
      client.send(MessageTypes.NARRATE, {
        text: 'No open rifts are available. Check the shardboard as new shards stabilize.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    this.sendShardSwitch(client, shard);
  }

  private sendShardSwitch(client: Client, shard: ShardListing): void {
    // Narrate the transition, then send ROOM_SWITCH to tell the client to join the shard
    client.send(MessageTypes.NARRATE, {
      text: 'You step toward the rift. Reality bends around you as you are pulled into the shard...',
      type: 'system',
      timestamp: Date.now(),
    } satisfies NarrateMessage);

    client.send(MessageTypes.ROOM_SWITCH, {
      target: 'shard',
      reason: 'enter_shard',
      options: {
        roomId: shard.roomId,
        biome: shard.biome,
        tier: shard.tier,
      },
    } satisfies RoomSwitchMessage);
  }

  private async handleShardboardCommand(client: Client): Promise<void> {
    let listings = await this.getShardListings();
    const hasOpenShard = listings.some((entry) => this.isShardJoinable(entry));

    if (!hasOpenShard) {
      const created = await this.createShardRoom();
      if (created) {
        listings = [...listings.filter((entry) => entry.roomId !== created.roomId), created];
      }
    }

    if (listings.length === 0) {
      client.send(MessageTypes.NARRATE, {
        text: 'The shardboard is empty. The veil is quiet... for now.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    const lines = listings.map((entry) => {
      const biome = this.formatBiome(entry.biome);
      const status = entry.locked
        ? 'locked'
        : entry.playerCount >= entry.maxPlayers
          ? 'full'
          : entry.lifecycle;
      return `  • ${entry.roomId} — ${biome} | Tier ${entry.tier} | ${entry.playerCount}/${entry.maxPlayers} players | ${status}`;
    });

    const hasJoinable = listings.some((entry) => this.isShardJoinable(entry));
    const suffix = hasJoinable
      ? 'Type `enter <shard-id>` to step through a rift.'
      : 'No rifts are open yet. Wait for a shard to stabilize, then enter.';

    client.send(MessageTypes.NARRATE, {
      text: `The Shardboard lists available rifts:\n\n${lines.join('\n')}\n\n${suffix}`,
      type: 'system',
      timestamp: Date.now(),
    } satisfies NarrateMessage);
  }

  // ─── Stash Commands ─────────────────────────────────────────────────────

  private async handleStashCommand(client: Client): Promise<void> {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;
    try {
      const summary = await this.stashService.getStashSummary(playerId);
      client.send(MessageTypes.NARRATE, {
        text: summary,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch {
      client.send(MessageTypes.NARRATE, {
        text: 'Failed to access your stash.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  private async handleTakeCommand(client: Client, args: string[]): Promise<void> {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;

    if (args.length === 0) {
      client.send(MessageTypes.NARRATE, {
        text: 'Take what? Specify an item name. (e.g. "take corroded halberd")',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    const query = args.join(' ');
    const result = await this.stashService.takeItem(playerId, query);

    if (!result.ok) {
      client.send(MessageTypes.NARRATE, {
        text: result.error!,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    const name = result.entry!.definition.name;
    const view = await this.stashService.loadStash(playerId);
    client.send(MessageTypes.NARRATE, {
      text: `You take the ${name} from your stash. (${view.currentWeight.toFixed(1)}/${view.maxWeight} weight remaining)`,
      type: 'room',
      timestamp: Date.now(),
    } satisfies NarrateMessage);
  }

  private async handleStoreCommand(client: Client, args: string[]): Promise<void> {
    if (args.length === 0) {
      client.send(MessageTypes.NARRATE, {
        text: 'Store what? Specify an item name. (e.g. "store corroded halberd")',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    // In Phase 1, store command accepts items by name matching.
    // Full integration with loadout/extraction inventory comes in later phases.
    client.send(MessageTypes.NARRATE, {
      text: 'You have nothing to store. Items are automatically stashed after extraction.',
      type: 'system',
      timestamp: Date.now(),
    } satisfies NarrateMessage);
  }


  // ─── Shardboard Helpers ──────────────────────────────────────────────────

  private async getShardListings(): Promise<ShardListing[]> {
    const rooms = await this.safeQueryRooms();
    const maxPlayers = getConfig().maxPlayersPerShard;

    return rooms
      .filter((room) => room.name === 'shard')
      .map((room) => {
        const localRoom = this.safeGetRoom(room.roomId);
        const state = localRoom?.state as {
          biome?: string;
          tier?: number;
          lifecycle?: string;
          playerCount?: number;
        } | undefined;
        const metadata = (room.metadata ?? {}) as Record<string, unknown>;

        const biome = (state?.biome ?? metadata['biome'] ?? 'flooded_crypt') as BiomeType;
        const tier = (state?.tier ?? metadata['tier'] ?? 1) as ShardTier;
        const lifecycle = (state?.lifecycle ?? metadata['lifecycle'] ?? 'unknown') as string;
        const playerCount = typeof state?.playerCount === 'number'
          ? state.playerCount
          : (room.clients ?? (metadata['playerCount'] as number | undefined) ?? 0);
        const maxPlayersForRoom = (metadata['maxPlayers'] as number | undefined) ?? room.maxClients ?? maxPlayers;

        return {
          roomId: room.roomId,
          biome,
          tier,
          lifecycle,
          playerCount,
          maxPlayers: maxPlayersForRoom,
          locked: room.locked ?? false,
        };
      });
  }

  private pickOpenShard(listings: ShardListing[]): ShardListing | null {
    const open = listings
      .filter((entry) => this.isShardJoinable(entry))
      .sort((a, b) => a.playerCount - b.playerCount);
    return open[0] ?? null;
  }

  private isShardJoinable(entry: ShardListing): boolean {
    return entry.lifecycle === 'open'
      && !entry.locked
      && entry.playerCount < entry.maxPlayers;
  }

  private describeShardRejection(entry: ShardListing): string {
    if (entry.locked) {
      return `Shard "${entry.roomId}" is locked.`;
    }
    if (entry.lifecycle !== 'open') {
      return `Shard "${entry.roomId}" is ${entry.lifecycle}. Wait for it to open.`;
    }
    if (entry.playerCount >= entry.maxPlayers) {
      return `Shard "${entry.roomId}" is full.`;
    }
    return `Shard "${entry.roomId}" is not available.`;
  }

  private formatBiome(biome: string): string {
    return biome
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private async createShardRoom(): Promise<ShardListing | null> {
    const biome: BiomeType = 'flooded_crypt';
    const tier: ShardTier = 1;
    try {
      const roomCache = await matchMaker.createRoom('shard', {
        biome,
        tier,
        seed: Date.now(),
        openDelayMs: 0,
      });

      const localRoom = this.safeGetRoom(roomCache.roomId);
      const state = localRoom?.state as {
        biome?: string;
        tier?: number;
        lifecycle?: string;
        playerCount?: number;
      } | undefined;

      return {
        roomId: roomCache.roomId,
        biome: (state?.biome ?? biome) as BiomeType,
        tier: (state?.tier ?? tier) as ShardTier,
        lifecycle: state?.lifecycle ?? 'open',
        playerCount: state?.playerCount ?? 0,
        maxPlayers: roomCache.maxClients ?? getConfig().maxPlayersPerShard,
        locked: roomCache.locked ?? false,
      };
    } catch (err) {
      this.log(`Failed to create shard: ${err}`);
      return null;
    }
  }

  private async safeQueryRooms(): Promise<Awaited<ReturnType<typeof matchMaker.query>>> {
    try {
      return await matchMaker.query({});
    } catch {
      return [];
    }
  }

  private safeGetRoom(roomId: string): Room | undefined {
    try {
      return matchMaker.getLocalRoomById(roomId) ?? undefined;
    } catch {
      return undefined;
    }
  }


  // ─── Logging ─────────────────────────────────────────────────────────────

  private log(message: string): void {
    console.log(`[RefugeRoom] ${message}`);
  }
}
