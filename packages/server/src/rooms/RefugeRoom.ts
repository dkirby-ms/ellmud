import { Room, Client, matchMaker } from '@colyseus/core';
import {
  type CommandMessage,
  type NarrateMessage,
  type RoomHeaderMessage,
  type RoomSwitchMessage,
  type StashItem,
  type BiomeType,
  type ShardTier,
  type EquipItemMessage,
  type UnequipItemMessage,
  type SwapItemMessage,
  type LoadoutUpdateMessage,
  type StashUpdateMessage,
  type DisplayItem,
  SLOT_ACCEPTS,
  EQUIPMENT_SLOT_ORDER,
  MessageTypes,
} from '@ellmud/shared';
import { RefugeState } from '../state.js';
import { authenticateClient } from '../auth/colyseus-auth.js';
import { StashService, InMemoryStashRepository, getStashRepository, getItemDefs } from '../stash/index.js';
import type { StashRepository } from '../stash/index.js';
import { LoadoutService, getLoadoutRepository } from '../loadout/index.js';
import type { LoadoutRepository } from '../loadout/index.js';
import { getConfig } from '../config.js';
import { AmbientSystem } from '../systems/AmbientSystem.js';
import { getZoneRepository } from '../zones/index.js';
import { convertZoneToRoomGraph } from '../zones/zone-adapter.js';
import { adaptRoomGraph } from '../shard/graph-adapter.js';
import type { RoomGraph, Room as GraphRoom, Direction } from '../shard/RoomGraph.js';

const TICK_INTERVAL_MS = 1000;
const VALID_DIRECTIONS: ReadonlySet<string> = new Set(['north', 'south', 'east', 'west', 'up', 'down']);

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
  private loadoutService!: LoadoutService;
  private ambientSystem!: AmbientSystem;
  /** Maps sessionId → characterId for per-character stash/loadout lookups. */
  private characterIds = new Map<string, string>();
  /** Maps sessionId → playerId for auth-level operations. */
  private playerIds = new Map<string, string>();
  /** Tracks pending shard-enter per session to prevent double-switch. */
  private pendingEnter = new Set<string>();
  /** Room graph for the Refuge zone. */
  private roomGraph!: RoomGraph;
  /** Maps sessionId → current room slug within the Refuge. */
  private currentRoomIds = new Map<string, string>();

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

  /** Inject loadout dependencies. */
  initLoadout(loadoutRepo?: LoadoutRepository, stashRepo?: StashRepository, itemDefs?: Map<string, StashItem>): void {
    if (loadoutRepo) {
      this.loadoutService = new LoadoutService(
        loadoutRepo,
        stashRepo ?? getStashRepository(),
        itemDefs ?? new Map(),
      );
    } else {
      this.loadoutService = new LoadoutService(
        stashRepo ?? getStashRepository(),
        itemDefs ?? new Map(),
      );
    }
  }

  async onCreate(): Promise<void> {
    this.setState(new RefugeState());

    // Initialize stash with shared provider if not already injected
    if (!this.stashService) {
      this.initStash(getStashRepository(), getItemDefs());
    }

    // Initialize loadout with shared provider if not already injected
    if (!this.loadoutService) {
      this.initLoadout(getLoadoutRepository(), getStashRepository(), getItemDefs());
    }

    // Initialize ambient world simulation
    this.ambientSystem = new AmbientSystem();

    // Load refuge zone graph (DB → shared graph → local graph)
    await this.loadRefugeGraph();

    this.onMessage(MessageTypes.COMMAND, (client: Client, message: CommandMessage) => {
      void this.handleCommand(client, message);
    });

    // Equipment message handlers (server-authoritative)
    this.onMessage(MessageTypes.EQUIP_ITEM, (client: Client, message: EquipItemMessage) => {
      void this.handleEquipItem(client, message);
    });

    this.onMessage(MessageTypes.UNEQUIP_ITEM, (client: Client, message: UnequipItemMessage) => {
      void this.handleUnequipItem(client, message);
    });

    this.onMessage(MessageTypes.SWAP_ITEM, (client: Client, message: SwapItemMessage) => {
      void this.handleSwapItem(client, message);
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

    // Resolve player ID: prefer onAuth result (client.auth), then join options, then sessionId fallback.
    // The 'anonymous' sentinel from authenticateClient means no real identity was established.
    const authData = client.auth as { playerId?: string } | undefined;
    const authPlayerId = authData?.playerId && authData.playerId !== 'anonymous' ? authData.playerId : undefined;
    const playerId = authPlayerId || (options['playerId'] as string) || client.sessionId;
    this.playerIds.set(client.sessionId, playerId);

    // Character ID: passed from client after character selection. Falls back to playerId for backwards compat.
    const characterId = (options['characterId'] as string) || playerId;
    this.characterIds.set(client.sessionId, characterId);

    // Place player in the entry room (hearth)
    this.currentRoomIds.set(client.sessionId, this.roomGraph.startRoomId);

    this.log(`Player joined Refuge: ${client.sessionId} (character=${characterId}, ${this.state.playerCount} players)`);

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

    // Room view for starting room (header + description + presence)
    const startRoom = this.roomGraph.rooms.get(this.roomGraph.startRoomId);
    if (startRoom) {
      this.sendRoomView(client, startRoom);
    }

    // Announce arrival to others already in the hearth
    this.announceToRoom(this.roomGraph.startRoomId, client.sessionId, 'An adventurer arrives.');

    // Send full stash + loadout state to client on join
    try {
      await this.sendLoadoutAndStashUpdate(client, characterId);
    } catch (err) {
      this.log(`Failed to send equipment state for ${characterId}: ${err}`);
    }

    // Send stash summary narration
    try {
      const summary = await this.stashService.getStashSummary(characterId);
      client.send(MessageTypes.NARRATE, {
        text: summary,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch (err) {
      this.log(`Failed to load stash summary for ${characterId}: ${err}`);
    }
  }

  onLeave(client: Client): void {
    this.state.playerCount--;
    const departingRoom = this.currentRoomIds.get(client.sessionId);
    if (departingRoom) {
      this.announceToRoom(departingRoom, client.sessionId, 'An adventurer departs.');
    }
    this.playerIds.delete(client.sessionId);
    this.characterIds.delete(client.sessionId);
    this.currentRoomIds.delete(client.sessionId);
    this.pendingEnter.delete(client.sessionId);
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
          this.handleLookCommand(client);
          break;

        case 'go':
          this.handleGoCommand(client, message.args);
          break;

        case 'north':
        case 'south':
        case 'east':
        case 'west':
        case 'up':
        case 'down':
          this.handleGoCommand(client, [message.verb]);
          break;

        case 'shardboard':
          if (!this.requireRoom(client, 'shardboard', 'the Shardboard')) break;
          await this.handleShardboardCommand(client);
          break;

        case 'enter':
          if (!this.requireRoom(client, 'shardboard', 'the Shardboard')) break;
          await this.handleEnterCommand(client, message.args);
          break;

        case 'stash':
          if (!this.requireRoom(client, 'stash-alcove', 'the Stash Alcove')) break;
          await this.handleStashCommand(client);
          break;

        case 'take':
          if (!this.requireRoom(client, 'stash-alcove', 'the Stash Alcove')) break;
          await this.handleTakeCommand(client, message.args);
          break;

        case 'store':
          if (!this.requireRoom(client, 'stash-alcove', 'the Stash Alcove')) break;
          await this.handleStoreCommand(client, message.args);
          break;

        case 'loadout':
        case 'equipment':
          await this.handleLoadoutCommand(client);
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
    // Guard: prevent duplicate enter-shard from the same session (double-click / rapid re-entry)
    if (this.pendingEnter.has(client.sessionId)) {
      client.send(MessageTypes.NARRATE, {
        text: 'You are already stepping through a rift...',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }
    this.pendingEnter.add(client.sessionId);

    const requestedId = args[0]?.trim();
    const listings = await this.getShardListings();

    if (requestedId && requestedId.toLowerCase() !== 'shard') {
      const shard = listings.find((entry) => entry.roomId === requestedId);
      if (!shard) {
        this.pendingEnter.delete(client.sessionId);
        client.send(MessageTypes.NARRATE, {
          text: `No shard with id "${requestedId}" is listed. Check the shardboard for available rifts.`,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      if (!this.isShardJoinable(shard)) {
        this.pendingEnter.delete(client.sessionId);
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
      this.pendingEnter.delete(client.sessionId);
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
    const playerId = this.characterIds.get(client.sessionId) ?? client.sessionId;
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
    const playerId = this.characterIds.get(client.sessionId) ?? client.sessionId;

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

  // ─── Loadout Command ───────────────────────────────────────────────────

  private async handleLoadoutCommand(client: Client): Promise<void> {
    const playerId = this.characterIds.get(client.sessionId) ?? client.sessionId;
    try {
      const summary = await this.loadoutService.getLoadoutSummary(playerId);
      client.send(MessageTypes.NARRATE, {
        text: summary,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch {
      client.send(MessageTypes.NARRATE, {
        text: 'Failed to access your loadout.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  // ─── Equipment Message Handlers (Server-Authoritative) ─────────────────

  private async handleEquipItem(client: Client, message: EquipItemMessage): Promise<void> {
    const playerId = this.characterIds.get(client.sessionId) ?? client.sessionId;

    try {
      const result = await this.loadoutService.equipItem(playerId, message.itemId, message.targetSlot);

      if (!result.ok) {
        client.send(MessageTypes.NARRATE, {
          text: result.error!,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      // Send updated loadout and stash state
      await this.sendLoadoutAndStashUpdate(client, playerId);

      client.send(MessageTypes.NARRATE, {
        text: `Item equipped to ${message.targetSlot}.`,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch (err) {
      this.log(`Equip failed for ${playerId}: ${err}`);
      client.send(MessageTypes.NARRATE, {
        text: 'Failed to equip item.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  private async handleUnequipItem(client: Client, message: UnequipItemMessage): Promise<void> {
    const playerId = this.characterIds.get(client.sessionId) ?? client.sessionId;

    try {
      const result = await this.loadoutService.unequipItem(playerId, message.slot);

      if (!result.ok) {
        client.send(MessageTypes.NARRATE, {
          text: result.error!,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      await this.sendLoadoutAndStashUpdate(client, playerId);

      client.send(MessageTypes.NARRATE, {
        text: `Item unequipped from ${message.slot}.`,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch (err) {
      this.log(`Unequip failed for ${playerId}: ${err}`);
      client.send(MessageTypes.NARRATE, {
        text: 'Failed to unequip item.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  private async handleSwapItem(client: Client, message: SwapItemMessage): Promise<void> {
    const playerId = this.characterIds.get(client.sessionId) ?? client.sessionId;

    try {
      const result = await this.loadoutService.swapItem(playerId, message.itemId, message.targetSlot);

      if (!result.ok) {
        client.send(MessageTypes.NARRATE, {
          text: result.error!,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      await this.sendLoadoutAndStashUpdate(client, playerId);

      client.send(MessageTypes.NARRATE, {
        text: `Item swapped into ${message.targetSlot}.`,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch (err) {
      this.log(`Swap failed for ${playerId}: ${err}`);
      client.send(MessageTypes.NARRATE, {
        text: 'Failed to swap item.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  /** Send updated loadout + stash state to client after any equipment change. */
  private async sendLoadoutAndStashUpdate(client: Client, playerId: string): Promise<void> {
    const loadoutView = await this.loadoutService.getLoadoutView(playerId);
    client.send(MessageTypes.LOADOUT_UPDATE, {
      slots: loadoutView.slots,
    } satisfies LoadoutUpdateMessage);

    const stashView = await this.stashService.loadStash(playerId);
    const stashItems: DisplayItem[] = stashView.entries.map((entry) => {
      const allowedSlots = EQUIPMENT_SLOT_ORDER.filter(
        (s) => SLOT_ACCEPTS[s].includes(entry.definition.type),
      );
      return {
        instanceId: entry.instance.instanceId,
        definitionId: entry.instance.itemId,
        name: entry.definition.name,
        type: entry.definition.type,
        tier: entry.definition.rarity,
        weight: entry.definition.weight,
        description: entry.definition.description,
        allowedSlots,
      };
    });
    client.send(MessageTypes.STASH_UPDATE, {
      items: stashItems,
    } satisfies StashUpdateMessage);
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


  // ─── Room Navigation ─────────────────────────────────────────────────────

  private handleLookCommand(client: Client): void {
    const roomId = this.currentRoomIds.get(client.sessionId) ?? this.roomGraph.startRoomId;
    const room = this.roomGraph.rooms.get(roomId);
    if (room) {
      this.sendRoomView(client, room);
    }
  }

  private handleGoCommand(client: Client, args: string[]): void {
    const dirStr = args[0]?.toLowerCase();
    if (!dirStr || !VALID_DIRECTIONS.has(dirStr)) {
      client.send(MessageTypes.NARRATE, {
        text: 'Go where? Specify a direction: north, south, east, west.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    const direction = dirStr as Direction;
    const currentRoomId = this.currentRoomIds.get(client.sessionId) ?? this.roomGraph.startRoomId;
    const currentRoom = this.roomGraph.rooms.get(currentRoomId);
    if (!currentRoom) return;

    const targetId = currentRoom.exits.get(direction);
    if (!targetId) {
      client.send(MessageTypes.NARRATE, {
        text: `You can't go ${direction} from here.`,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    const targetRoom = this.roomGraph.rooms.get(targetId);
    if (!targetRoom) return;

    // Announce departure to current room
    this.announceToRoom(currentRoomId, client.sessionId, `An adventurer heads ${direction}.`);

    // Move player
    this.currentRoomIds.set(client.sessionId, targetId);

    // Send new room view
    this.sendRoomView(client, targetRoom);

    // Announce arrival to new room
    this.announceToRoom(targetId, client.sessionId, 'An adventurer arrives.');
  }

  /** Returns false (and narrates hint) if the player is not in the required room. */
  private requireRoom(client: Client, roomSlug: string, roomDisplayName: string): boolean {
    const currentRoom = this.currentRoomIds.get(client.sessionId) ?? this.roomGraph.startRoomId;
    if (currentRoom !== roomSlug) {
      const room = this.roomGraph.rooms.get(roomSlug);
      const exitHint = this.findDirectionTo(currentRoom, roomSlug);
      const hint = exitHint ? ` Go ${exitHint} to get there.` : '';
      client.send(MessageTypes.NARRATE, {
        text: `You need to be at ${roomDisplayName} for that.${hint}`,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return false;
    }
    return true;
  }

  /** Find the direction from one room to another (one hop only). */
  private findDirectionTo(fromSlug: string, toSlug: string): string | null {
    const from = this.roomGraph.rooms.get(fromSlug);
    if (!from) return null;
    for (const [dir, target] of from.exits) {
      if (target === toSlug) return dir;
    }
    return null;
  }

  /** Send room header + description + player presence for a room. */
  private sendRoomView(client: Client, room: GraphRoom): void {
    const exits = [...room.exits.keys()];

    client.send(MessageTypes.ROOM_HEADER, {
      roomName: `The Refuge — ${room.name}`,
      exits,
      stability: 1.0,
      zoneName: 'The Refuge',
    } satisfies RoomHeaderMessage);

    client.send(MessageTypes.NARRATE, {
      text: room.description,
      type: 'room',
      timestamp: Date.now(),
    } satisfies NarrateMessage);

    // Player presence
    const othersInRoom = [...this.currentRoomIds.entries()]
      .filter(([sid, rid]) => rid === room.id && sid !== client.sessionId)
      .length;

    if (othersInRoom > 0) {
      const plural = othersInRoom > 1;
      client.send(MessageTypes.NARRATE, {
        text: `${othersInRoom} other adventurer${plural ? 's' : ''} ${plural ? 'are' : 'is'} here.`,
        type: 'awareness',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  /** Broadcast a narration to everyone in a room except the excluded session. */
  private announceToRoom(roomId: string, excludeSessionId: string, text: string): void {
    for (const otherClient of this.clients) {
      const otherRoom = this.currentRoomIds.get(otherClient.sessionId);
      if (otherRoom === roomId && otherClient.sessionId !== excludeSessionId) {
        otherClient.send(MessageTypes.NARRATE, {
          text,
          type: 'awareness',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
      }
    }
  }

  // ─── Zone Loading ──────────────────────────────────────────────────────

  private async loadRefugeGraph(): Promise<void> {
    try {
      const zoneData = await getZoneRepository().getZoneBySlug('the-refuge');
      if (zoneData) {
        const sharedGraph = convertZoneToRoomGraph(zoneData);
        this.roomGraph = adaptRoomGraph(sharedGraph);
        this.log('Refuge zone loaded from repository.');
        return;
      }
    } catch (err) {
      this.log(`Failed to load refuge zone from repository: ${err}`);
    }
    this.roomGraph = createFallbackRefugeGraph();
    this.log('Refuge zone fallback graph loaded.');
  }


  // ─── Logging ─────────────────────────────────────────────────────────────

  private log(message: string): void {
    console.log(`[RefugeRoom] ${message}`);
  }
}

// ─── Fallback Refuge Graph ────────────────────────────────────────────────
// Used when the zone repository has no 'the-refuge' zone (dev/test without DB).

function createFallbackRefugeGraph(): RoomGraph {
  const rooms = new Map<string, GraphRoom>();

  rooms.set('hearth', {
    id: 'hearth',
    name: 'The Hearth',
    description: 'A broad stone chamber warmed by a perpetual fire. Scarred adventurers rest on makeshift benches. The air smells of ash and iron.',
    type: 'entry',
    exits: new Map<Direction, string>([
      ['east', 'stash-alcove'],
      ['north', 'training-grounds'],
      ['west', 'shardboard'],
      ['south', 'market'],
    ]),
    items: [],
  });

  rooms.set('stash-alcove', {
    id: 'stash-alcove',
    name: 'Stash Alcove',
    description: 'A narrow alcove lined with locked chests and hanging satchels. Your belongings are here — what you\'ve kept from the shards.',
    type: 'corridor',
    exits: new Map<Direction, string>([['west', 'hearth']]),
    items: [],
  });

  rooms.set('training-grounds', {
    id: 'training-grounds',
    name: 'Training Grounds',
    description: 'A cleared space where weapons ring against practice dummies. Scratched tally marks cover the walls.',
    type: 'corridor',
    exits: new Map<Direction, string>([
      ['south', 'hearth'],
      ['east', 'war-room'],
    ]),
    items: [],
  });

  rooms.set('shardboard', {
    id: 'shardboard',
    name: 'The Shardboard',
    description: 'A massive board of pinned notes, sketched maps, and shard coordinates. This is where expeditions begin.',
    type: 'corridor',
    exits: new Map<Direction, string>([['east', 'hearth']]),
    items: [],
  });

  rooms.set('market', {
    id: 'market',
    name: 'The Market',
    description: 'Makeshift stalls selling salvaged goods. A gruff quartermaster eyes your coin pouch.',
    type: 'corridor',
    exits: new Map<Direction, string>([
      ['north', 'hearth'],
      ['east', 'infirmary'],
    ]),
    items: [],
  });

  rooms.set('infirmary', {
    id: 'infirmary',
    name: 'The Infirmary',
    description: 'Cots and bandages. A healer tends to the wounded. The smell of poultice lingers.',
    type: 'corridor',
    exits: new Map<Direction, string>([['west', 'market']]),
    items: [],
  });

  rooms.set('war-room', {
    id: 'war-room',
    name: 'The War Room',
    description: 'A locked chamber where faction leaders meet. Maps of known shards cover the walls.',
    type: 'corridor',
    exits: new Map<Direction, string>([['west', 'training-grounds']]),
    items: [],
  });

  return { rooms, startRoomId: 'hearth' };
}
