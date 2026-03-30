import { Room, Client } from '@colyseus/core';
import {
  type CommandMessage,
  type NarrateMessage,
  type RoomHeaderMessage,
  type RoomSwitchMessage,
  type ShardState as SharedShardState,
  type ShardStateMessage,
  type StashItem,
  type BiomeType,
  type ShardTier,
  type ExtractionMessage,
  type PvPKillEvent,
  type EquipItemMessage,
  type UnequipItemMessage,
  type SwapItemMessage,
  type LoadoutUpdateMessage,
  type PlayerStateMessage,
  type ZoneTransferMessage,
  type ExploredRoomData,
  type ExplorationDataMessage,
  type ExplorationUpdateMessage,
  SHARD_SICKNESS_DEFAULTS,
  MessageTypes,
} from '@ellmud/shared';
import { ShardState } from '../state.js';
import { parseCommand } from '../commands/parser.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph, type RoomGraph, type Direction } from '../shard/RoomGraph.js';
import { generateShardGraph } from '../shard/generator.js';
import { adaptRoomGraph } from '../shard/graph-adapter.js';
import { handleLook } from '../commands/handlers/look.js';
import { CombatSystem, type TickResult, createCombatant } from '../combat/index.js';
import { SoundSystem } from '../sound/index.js';
import { TraceSystem } from '../systems/index.js';
import { AwarenessSystem, type AwarenessPlayer } from '../systems/index.js';
import { DowningSystem, type DowningEvent } from '../systems/DowningSystem.js';
import { type ShardSicknessStore, getShardSicknessStore } from '../systems/index.js';
import {
  NOISE_VALUES,
  SOUND_DESCRIPTIONS,
  type SoundType,
  BLOOD_TRAIL_DAMAGE_THRESHOLD,
  TRACKING_THRESHOLDS,
} from '@ellmud/shared';
import { ExtractionSystem } from '../extraction/index.js';
import { authenticateClient } from '../auth/colyseus-auth.js';
import { getConfig, getMaxPlayersForTier } from '../config.js';
import { StashService, InMemoryStashRepository, getStashRepository, getItemDefs } from '../stash/index.js';
import type { StashRepository } from '../stash/index.js';
import { transferInventoryToStash } from '../extraction/stash-transfer.js';
import { CreatureManager, DROWNED_REVENANT, type CreatureAction } from '../creatures/index.js';
import type { CreatureWorldState } from '../creatures/behavior.js';
import { createPRNG } from '../shard/prng.js';
import {
  type PlayerProfileRepository,
  InMemoryPlayerProfileRepository,
  getProfileRepository,
  DEFAULT_PROFILE,
} from '../player/index.js';
import type { PlayerProfile } from '../player/index.js';
import type { FactionRepository } from '../faction/index.js';
import { InMemoryFactionRepository, getFactionRepository } from '../faction/index.js';
import type { RunHistoryRepository, RunRecord } from '../run-history/index.js';
import { InMemoryRunHistoryRepository, getRunHistoryRepository } from '../run-history/index.js';
import { LoadoutService, getLoadoutRepository } from '../loadout/index.js';
import type { LoadoutRepository } from '../loadout/index.js';
import { getZoneRepository } from '../zones/index.js';
import type { ZoneData } from '../zones/index.js';
import { convertZoneToRoomGraph } from '../zones/zone-adapter.js';
import { getItemDefinition } from '../items/registry.js';
import type { Item } from '../shard/RoomGraph.js';
import type { ExplorationRepository } from '../exploration/index.js';
import { getExplorationRepository } from '../exploration/index.js';
import type { CharacterRepository } from '../character/index.js';
import { InMemoryCharacterRepository, getCharacterRepository } from '../character/index.js';

const TICK_INTERVAL_MS = 1000;

interface ShardRoomOptions {
  state: ShardState;
}

/**
 * ShardRoom — A procedurally generated shard instance.
 *
 * Lifecycle: Seeding → Open → Active → Destabilising → Collapse
 *
 * ARCHITECTURAL CONSTRAINT:
 * - NO Schema state is ever synced to clients.
 * - All client communication uses room.send() with typed messages.
 * - The client is a dumb terminal receiving narrated prose only.
 */
export class ShardRoom extends Room<ShardRoomOptions> {
  private lifecycle: SharedShardState = 'seeding';
  private collapseTimerSeconds = 1200; // 20 minutes default
  private openDelayMs = 1000;
  private roomGraph!: RoomGraph;
  private entryRoomIds: string[] = []; // Multiple entry points for player distribution
  private players = new Map<string, PlayerState>();
  /** Maps sessionId → characterId for all gameplay operations. */
  private playerIds = new Map<string, string>();
  /** Maps characterId → players-table UUID for DB persistence. */
  private ownerPlayerIds = new Map<string, string>();
  private combatSystem!: CombatSystem;
  private soundSystem!: SoundSystem;
  private traceSystem!: TraceSystem;
  private awarenessSystem!: AwarenessSystem;
  private downingSystem!: DowningSystem;
  private shardSicknessStore!: ShardSicknessStore;
  private extractionSystem!: ExtractionSystem;
  private creatureManager!: CreatureManager;
  private stashService?: StashService;
  private loadoutService?: LoadoutService;
  private itemDefs = new Map<string, StashItem>();
  private shardTier: ShardTier = 1;
  private profileRepo: PlayerProfileRepository = new InMemoryPlayerProfileRepository();
  private factionRepo: FactionRepository = new InMemoryFactionRepository();
  private runHistoryRepo: RunHistoryRepository = new InMemoryRunHistoryRepository();
  private characterRepo: CharacterRepository = new InMemoryCharacterRepository();
  private explorationRepo: ExplorationRepository = getExplorationRepository();
  /** Tracks when each player joined the shard (for run duration calculation). */
  private playerJoinTimes = new Map<string, number>();
  /** Maps playerId → character name for log formatting. */
  private characterNames = new Map<string, string>();

  // ─── Zone-specific fields ──────────────────────────────────────────────────
  private zoneSlug?: string;
  private zoneData?: ZoneData;
  private isZone = false;
  private repopTimer?: ReturnType<typeof setInterval>;

  /**
   * Inject profile repository. Called before room lifecycle if provided.
   * Falls back to in-memory defaults.
   */
  initProfile(repo?: PlayerProfileRepository): void {
    this.profileRepo = repo ?? new InMemoryPlayerProfileRepository();
  }

  /** Inject faction repository for testing. */
  initFaction(repo?: FactionRepository): void {
    this.factionRepo = repo ?? new InMemoryFactionRepository();
  }

  /** Inject run history repository for testing. */
  initRunHistory(repo?: RunHistoryRepository): void {
    this.runHistoryRepo = repo ?? new InMemoryRunHistoryRepository();
  }

  /** Inject character repository for testing. */
  initCharacter(repo?: CharacterRepository): void {
    this.characterRepo = repo ?? new InMemoryCharacterRepository();
  }

  /**
   * Inject stash dependencies. Called before room lifecycle if provided.
   * Falls back to in-memory defaults for Phase 1.
   */
  initStash(repo?: StashRepository, itemDefs?: Map<string, StashItem>): void {
    this.itemDefs = itemDefs ?? new Map();
    this.stashService = new StashService(
      repo ?? new InMemoryStashRepository(),
      this.itemDefs,
    );
  }

  /** Inject loadout dependencies for testing. */
  initLoadout(loadoutRepo?: LoadoutRepository, stashRepo?: StashRepository, itemDefs?: Map<string, StashItem>): void {
    if (loadoutRepo) {
      this.loadoutService = new LoadoutService(
        loadoutRepo,
        stashRepo ?? getStashRepository(),
        itemDefs ?? this.itemDefs,
      );
    } else {
      this.loadoutService = new LoadoutService(
        stashRepo ?? getStashRepository(),
        itemDefs ?? this.itemDefs,
      );
    }
  }

  async onCreate(options: Record<string, unknown>): Promise<void> {
    // Initialize server-internal state (never sent to clients)
    this.setState(new ShardState());
    this.state.shardId = this.roomId;
    
    // Parse tier first (needed for max players)
    if (typeof options['tier'] === 'number' && [1, 2, 3].includes(options['tier'])) {
      this.shardTier = options['tier'] as ShardTier;
    }
    this.state.tier = this.shardTier;
    
    // Set tier-based max players
    this.maxClients = getMaxPlayersForTier(this.shardTier, getConfig());

    if (typeof options['biome'] === 'string') {
      this.state.biome = options['biome'];
    }
    if (typeof options['collapseTimer'] === 'number') {
      this.collapseTimerSeconds = options['collapseTimer'];
    }
    if (typeof options['openDelayMs'] === 'number') {
      this.openDelayMs = Math.max(0, options['openDelayMs']);
    }

    this.state.collapseTimer = this.collapseTimerSeconds;

    // Derive zoneSlug from room name if not explicitly provided
    const roomNameStr = this.roomName;
    if (roomNameStr.startsWith('zone:') && !options['zoneSlug']) {
      options['zoneSlug'] = roomNameStr.substring(5);
    }

    // Initialize room graph — zone-based, procedural, or test graph
    this.creatureManager = new CreatureManager();

    if (options['zoneSlug'] && typeof options['zoneSlug'] === 'string') {
      // Zone-based room: load from repository (with fallback for the-refuge)
      const zoneRepo = getZoneRepository();
      const zoneData = await zoneRepo.getZoneBySlug(options['zoneSlug']);

      if (zoneData) {
        const sharedGraph = convertZoneToRoomGraph(zoneData);
        this.roomGraph = adaptRoomGraph(sharedGraph);
        this.entryRoomIds = sharedGraph.entryRoomIds;
        this.shardTier = sharedGraph.tier;
        this.state.biome = sharedGraph.biome;
      } else if (options['zoneSlug'] === 'the-refuge') {
        // B7: Fallback hardcoded graph when DB zone data is missing
        this.roomGraph = createFallbackRefugeGraph();
        this.entryRoomIds = [this.roomGraph.startRoomId];
        this.log('Zone "the-refuge" not in DB — using fallback graph.');
      } else {
        throw new Error(`Zone '${options['zoneSlug']}' not found`);
      }

      // Store zone metadata for repop and inter-zone features
      this.zoneSlug = options['zoneSlug'];
      this.zoneData = zoneData ?? undefined;
      this.isZone = true;

      // Zone-level max players override (0 = unlimited, keep tier default)
      if (zoneData && zoneData.zone.maxPlayers > 0) {
        this.maxClients = zoneData.zone.maxPlayers;
      }

      // Spawn creatures from zone NPC definitions
      if (zoneData) {
        this.creatureManager.spawnCreaturesFromZone(zoneData);
      }
    } else if (options['useTestGraph'] === true) {
      this.roomGraph = createTestRoomGraph();
      this.entryRoomIds = [this.roomGraph.startRoomId]; // Test graph has single entry
    } else {
      const seed = typeof options['seed'] === 'number' ? options['seed'] : Date.now();
      const biome = (typeof options['biome'] === 'string' ? options['biome'] : 'flooded_crypt') as BiomeType;
      const sharedGraph = generateShardGraph({ tier: this.shardTier, biome, seed });
      this.roomGraph = adaptRoomGraph(sharedGraph);
      this.entryRoomIds = sharedGraph.entryRoomIds; // Store all entry points

      // Spawn creatures using a derived seed (distinct from generator's PRNG)
      const creaturePrng = createPRNG(seed + 7919);
      this.creatureManager.spawnCreatures(sharedGraph, DROWNED_REVENANT, creaturePrng);
    }

    // Initialize combat system with room exit resolver
    this.combatSystem = new CombatSystem((roomId: string) => {
      const room = this.roomGraph.rooms.get(roomId);
      return room ? Array.from(room.exits.values()) : [];
    });

    // Initialize sound propagation system (GDD §12)
    this.soundSystem = new SoundSystem((roomId: string) => {
      const room = this.roomGraph.rooms.get(roomId);
      if (!room) return undefined;
      return { id: room.id, exits: room.exits, properties: room.properties };
    });

    // Initialize trace system (GDD §11.2)
    this.traceSystem = new TraceSystem();

    // Initialize awareness/stealth detection system (GDD §8.1)
    this.awarenessSystem = new AwarenessSystem();

    // Initialize downing system (GDD §6.4 — bleed-out timers, stabilization)
    this.downingSystem = new DowningSystem();
    this.shardSicknessStore = getShardSicknessStore();

    // Initialize extraction system (default 5-tick channel)
    this.extractionSystem = new ExtractionSystem();

    // Initialize stash with shared provider if not already injected
    if (!this.stashService) {
      this.initStash(getStashRepository(), getItemDefs());
    }

    // Initialize loadout with shared provider if not already injected
    if (!this.loadoutService) {
      this.initLoadout(getLoadoutRepository(), getStashRepository(), getItemDefs());
    }

    // Initialize profile repo with shared provider
    if (this.profileRepo instanceof InMemoryPlayerProfileRepository) {
      this.profileRepo = getProfileRepository();
    }

    // Initialize faction repo with shared provider
    if (this.factionRepo instanceof InMemoryFactionRepository) {
      this.factionRepo = getFactionRepository();
    }

    // Initialize run history repo with shared provider
    if (this.runHistoryRepo instanceof InMemoryRunHistoryRepository) {
      this.runHistoryRepo = getRunHistoryRepository();
    }

    // Initialize character repo with shared provider
    if (this.characterRepo instanceof InMemoryCharacterRepository) {
      this.characterRepo = getCharacterRepository();
    }

    // Register message handlers
    this.onMessage(MessageTypes.COMMAND, (client: Client, message: CommandMessage) => {
      this.handleCommandMessage(client, message);
    });

    // Equipment message handlers (server-authoritative — players can equip mid-shard)
    this.onMessage(MessageTypes.EQUIP_ITEM, (client: Client, message: EquipItemMessage) => {
      void this.handleEquipItem(client, message);
    });

    this.onMessage(MessageTypes.UNEQUIP_ITEM, (client: Client, message: UnequipItemMessage) => {
      void this.handleUnequipItem(client, message);
    });

    this.onMessage(MessageTypes.SWAP_ITEM, (client: Client, message: SwapItemMessage) => {
      void this.handleSwapItem(client, message);
    });

    // 1-second tick for all game simulation
    this.setSimulationInterval((deltaTime: number) => this.update(deltaTime), TICK_INTERVAL_MS);

    this.updateMetadata();

    this.log(`ShardRoom created: ${this.roomId} (biome=${this.state.biome}, tier=${this.shardTier}${this.isZone ? `, zone=${this.zoneSlug}` : ''})`);

    // Start repop timer for zone-based rooms
    if (this.isZone) {
      this.startRepopTimer();
    }

    // Begin lifecycle: zones stay 'open', shards follow seeding→active→collapse flow
    if (this.isZone) {
      this.transitionTo('open');
      this.log('Zone initialized: persistent open state (no collapse)');
    } else {
      this.transitionTo('seeding');
      this.seedShard();
    }
  }

  async onAuth(_client: Client, options: Record<string, unknown>): Promise<unknown> {
    return authenticateClient(options['token'] as string | undefined);
  }

  async onJoin(client: Client, options: Record<string, unknown>): Promise<void> {
    // Resolve player ID: prefer onAuth result (client.auth), then join options, then sessionId fallback.
    // The 'anonymous' sentinel from authenticateClient means no real identity was established.
    const authData = client.auth as { playerId?: string } | undefined;
    const authPlayerId = authData?.playerId && authData.playerId !== 'anonymous' ? authData.playerId : undefined;
    const rawPlayerId = authPlayerId || (options['playerId'] as string) || client.sessionId;

    // Character ID: passed from client after character selection. Falls back to playerId for backwards compat.
    const playerId = (options['characterId'] as string) || rawPlayerId;

    // Guard against the same playerId joining twice (double-click / client race condition).
    // If the player is already present, displace the old session rather than corrupting state.
    if (this.players.has(playerId)) {
      this.log(`Duplicate join detected: ${this.playerTag(playerId)} (new session=${client.sessionId}). Displacing old session.`);

      // Remove old session→playerId mapping so its onLeave becomes a cleanup no-op
      for (const [sid, pid] of this.playerIds) {
        if (pid === playerId) {
          this.playerIds.delete(sid);
          const oldClient = this.clients.find((c) => c.sessionId === sid);
          if (oldClient) {
            try { oldClient.leave(4001); } catch { /* already disconnecting */ }
          }
          break;
        }
      }

      // Player is already counted — don't increment again
    } else {
      // Enforce tier-based max players (only for genuinely new players)
      const maxPlayers = this.maxClients ?? getMaxPlayersForTier(this.shardTier, getConfig());
      if (this.state.playerCount >= maxPlayers) {
        throw new Error(`Shard is full (${maxPlayers}/${maxPlayers} players).`);
      }
      this.state.playerCount++;
    }

    this.updateMetadata();
    this.playerIds.set(client.sessionId, playerId);
    // Track the real players-table ID for DB persistence (characterId FKs to characters, not players).
    this.ownerPlayerIds.set(playerId, rawPlayerId);

    // Load persisted profile (skills, carry weight, equipment) or use defaults
    let profile: PlayerProfile;
    try {
      const saved = await this.profileRepo.load(this.dbPlayerId(playerId));
      profile = saved ?? { ...DEFAULT_PROFILE };
    } catch (err) {
      this.log(`Failed to load profile for ${this.playerTag(playerId)}: ${err}`);
      profile = { ...DEFAULT_PROFILE };
    }

    // Load faction membership (fire-and-forget — faction data is informational)
    try {
      const factions = await this.factionRepo.getPlayerFactions(this.dbPlayerId(playerId));
      if (factions.length > 0) {
        this.log(`Player ${this.playerTag(playerId)} faction: ${factions[0].faction_id}`);
      }
    } catch (err) {
      this.log(`Failed to load factions for ${this.playerTag(playerId)}: ${err}`);
    }

    // Load character name for combat narration and log formatting.
    // Try by character ID first, then by active character for the player account.
    try {
      const character = await this.characterRepo.getById(playerId)
        ?? await this.characterRepo.getActive(playerId);
      if (character?.name) {
        this.characterNames.set(playerId, character.name);
      }
    } catch (err) {
      this.log(`Failed to load character for ${this.playerTag(playerId)}: ${err}`);
    }

    // Track join time for run duration calculation
    this.playerJoinTimes.set(playerId, Date.now());

    // Determine entry room based on zone vs shard
    let startRoom: string;
    if (this.isZone) {
      const targetRoom = options['targetRoomSlug'];
      if (typeof targetRoom === 'string' && this.roomGraph.rooms.has(targetRoom)) {
        startRoom = targetRoom;
      } else {
        startRoom = this.roomGraph.startRoomId;
      }
    } else {
      // Shards: distribute players across entry points for spatial separation
      const entryIndex = (this.state.playerCount - 1) % this.entryRoomIds.length;
      startRoom = this.entryRoomIds[entryIndex] || this.roomGraph.startRoomId;
    }

    // Initialize player state at assigned entry room with persisted profile
    const playerState = new PlayerState(
      playerId,
      startRoom,
      profile.maxCarryWeight,
      profile.skills,
      profile.equipment,
    );
    this.players.set(playerId, playerState);

    this.log(`Player ${this.playerTag(playerId)} joined at ${startRoom} (session=${client.sessionId}, ${this.state.playerCount}/${this.maxClients ?? getMaxPlayersForTier(this.shardTier, getConfig())} players)`);

    // Send initial system narration
    this.sendNarrate(client, {
      text: 'You step through the rift into a shard of the dying world...',
      type: 'system',
      timestamp: Date.now(),
    });

    // Send initial room look
    const lookResult = handleLook(this.buildCommandContext(playerState, []));
    this.deliverResult(client, lookResult);
    this.sendTraceNarrations(client, startRoom);

    // Send exploration data so client map can render the starting room
    this.sendExplorationData(client, playerId, startRoom);

    this.sendShardState(client, {
      state: this.lifecycle,
      collapseTimer: this.state.collapseTimer,
    });

    // Send initial player state (HP, stamina, status effects)
    // Combatant doesn't exist yet, so we use default stats
    client.send(MessageTypes.PLAYER_STATE, {
      hp: 100, // DEFAULT_PLAYER_STATS.maxHp
      maxHp: 100,
      stamina: 0,
      maxStamina: 0,
      statusEffects: [],
    } satisfies PlayerStateMessage);
  }

  async onLeave(client: Client, code?: number): Promise<void> {
    const config = getConfig();
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;
    const playerState = this.players.get(playerId);
    const isInCombat = this.combatSystem.isInCombat(playerId);

    // Allow reconnection for accidental disconnects (non-4000 codes)
    // Code 4000 = consented leave (player clicked "leave game")
    const consented = code === 4000;

    if (!consented) {
      // Mark player as disconnected
      if (playerState) {
        playerState.disconnected = true;
      }
      if (isInCombat) {
        this.combatSystem.markDisconnected(playerId);
      }

      this.log(`Player ${this.playerTag(playerId)} disconnected (code ${code}) — allowing reconnection for ${config.reconnectionTimeoutS}s`);

      try {
        await this.allowReconnection(client, config.reconnectionTimeoutS);
        
        // Client reconnected successfully
        this.log(`Player ${this.playerTag(playerId)} reconnected`);
        
        // Clear disconnected flags
        if (playerState) {
          playerState.disconnected = false;
        }
        if (isInCombat) {
          this.combatSystem.clearDisconnected(playerId);
        }

        // Send reconnection confirmation
        this.sendNarrate(client, {
          text: 'Reconnected to the shard.',
          type: 'system',
          timestamp: Date.now(),
        });

        // Resend current room state
        if (playerState) {
          const lookResult = handleLook(this.buildCommandContext(playerState, []));
          this.deliverResult(client, lookResult);
        }

        return; // Player reconnected — keep them in the game
      } catch {
        // Reconnection timeout expired
        this.log(`Reconnection timeout: ${this.playerTag(playerId)} — applying death behavior`);
        this.handleReconnectionTimeout(playerId);
      }
    }

    // Clean up player (consented leave or timeout expired)
    this.extractionSystem.interruptExtraction(playerId, 'you left the shard');
    this.downingSystem.removePlayer(playerId);
    if (this.players.has(playerId)) {
      // Persist player profile (skills, stats) before cleanup
      await this.savePlayerProfile(playerId, this.players.get(playerId)!);

      // Record non-extraction run (player left or timed out)
      await this.recordRunHistory(playerId, this.players.get(playerId), false);

      this.state.playerCount = Math.max(0, this.state.playerCount - 1);
      this.players.delete(playerId);
      this.combatSystem.removeCombatant(playerId);
      this.characterNames.delete(playerId);
      this.ownerPlayerIds.delete(playerId);
      this.updateMetadata();
    }
    this.playerIds.delete(client.sessionId);
    this.log(`Player ${this.playerTag(playerId)} left (${this.state.playerCount} players)`);
  }

  /**
   * Handle reconnection timeout expiry — kill or move to safe room.
   * Zones are exempt from death behavior — simply clean up the player.
   */
  private handleReconnectionTimeout(playerId: string): void {
    const playerState = this.players.get(playerId);
    if (!playerState) return;

    // Zones don't apply death behavior on disconnect timeout
    if (this.isZone) {
      this.log(`Player ${this.playerTag(playerId)} disconnected from zone — no death penalty applied`);
      return;
    }

    // Shards apply death behavior based on config
    const config = getConfig();
    const combatant = this.combatSystem.getCombatant(playerId);

    if (config.reconnectDeathBehavior === 'kill') {
      // Kill the player in place — their body and inventory become lootable
      if (combatant) {
        combatant.hp = 0;
        this.log(`Player ${this.playerTag(playerId)} killed in place after reconnection timeout`);
      }
      // Inventory handling would go here (drop as loot) — deferred for now
    } else {
      // Move to safe room (start room), clear combat state
      const startRoomId = this.roomGraph.startRoomId;
      playerState.currentRoomId = startRoomId;
      
      if (combatant) {
        combatant.hp = Math.max(1, Math.floor(combatant.maxHp * 0.1)); // 10% HP
        combatant.roomId = startRoomId;
      }

      this.combatSystem.removeCombatant(playerId);
      this.log(`Player ${this.playerTag(playerId)} moved to safe room after reconnection timeout`);
    }
  }

  onDispose(): void {
    if (this.repopTimer) {
      clearInterval(this.repopTimer);
    }
    this.log(`ShardRoom disposed: ${this.roomId}`);
  }

  // ─── Zone Repop System ──────────────────────────────────────────────────────

  private startRepopTimer(): void {
    if (!this.isZone || !this.zoneData) return;

    const intervalMs = (this.zoneData.zone.repopIntervalSeconds || 300) * 1000;
    this.repopTimer = setInterval(() => this.repopZone(), intervalMs);
  }

  private repopZone(): void {
    if (!this.zoneData) return;

    // Re-place loot in rooms that have been looted
    for (const zoneRoom of this.zoneData.rooms) {
      const room = this.roomGraph.rooms.get(zoneRoom.slug);
      if (!room) continue;

      // Resolve defined items from zone room loot containers
      const definedItems = this.resolveZoneRoomItems(zoneRoom);
      const currentItemIds = new Set(room.items.map(i => i.id));
      for (const item of definedItems) {
        if (!currentItemIds.has(item.id)) {
          room.items.push(item);
        }
      }
    }

    // Respawn killed creatures
    this.creatureManager.respawnZoneCreatures(this.zoneData);

    // Narrate repop to players in affected rooms
    this.broadcastRepopNarration();
  }

  /** Convert zone room loot containers into resolved Item objects. */
  private resolveZoneRoomItems(zoneRoom: ZoneData['rooms'][number]): Item[] {
    const items: Item[] = [];
    for (const container of zoneRoom.lootContainers) {
      for (const itemId of container.items) {
        const def = getItemDefinition(itemId);
        if (def) {
          items.push({
            id: def.id,
            name: def.name,
            weight: def.weight,
            description: def.description,
          });
        }
      }
    }
    return items;
  }

  /** Send a subtle repop narration to all players currently in the zone. */
  private broadcastRepopNarration(): void {
    for (const [pid, _ps] of this.players) {
      const client = this.findClient(pid);
      if (client) {
        this.sendNarrate(client, {
          text: 'You notice something has changed in the room…',
          type: 'ambient',
          timestamp: Date.now(),
        });
      }
    }
  }

  // ─── Tick System ─────────────────────────────────────────────────────────

  private update(_deltaTime: number): void {
    this.state.tick++;

    // Hub/social zones skip collapse, combat, and extraction ticking
    const isNonCombatZone = this.isZone && this.zoneData &&
      (this.zoneData.zone.category === 'hub' || this.zoneData.zone.category === 'social');

    // Collapse timer countdown (skip for persistent hub/social zones)
    if (!isNonCombatZone && (this.lifecycle === 'active' || this.lifecycle === 'destabilising')) {
      this.state.collapseTimer = Math.max(0, this.state.collapseTimer - 1);
      this.state.stability = this.state.collapseTimer / this.collapseTimerSeconds;

      // Lifecycle transitions based on stability
      if (this.state.stability <= 0) {
        this.transitionTo('collapse');
      } else if (this.state.stability <= 0.25 && this.lifecycle === 'active') {
        this.transitionTo('destabilising');
      }
    }

    // Creature AI tick — evaluate behavior trees, queue combat actions
    if (!isNonCombatZone) {
      this.tickCreatures();
    }

    // Resolve combat tick (skip for hub/social zones)
    if (!isNonCombatZone && this.combatSystem.hasActiveEncounters()) {
      const tickResult = this.combatSystem.resolveTick();

      // Killing blow: finish off downed (unstabilized) players in rooms with active combat.
      // Runs BEFORE handlePlayerDefeats so newly-downed players aren't instantly killed.
      this.checkKillingBlows(tickResult);

      this.syncCreaturesAfterCombat(tickResult);
      this.deliverCombatResults(tickResult);

      // Propagate combat sounds to nearby rooms (GDD §12)
      this.propagateCombatSounds(tickResult);

      // Create blood trail traces for combat damage
      this.createCombatTraces(tickResult);

      // Check if any extracting players took damage — interrupt their channels
      for (const event of tickResult.events) {
        if (event.type === 'strike' && event.targetId) {
          if (this.extractionSystem.isExtracting(event.targetId)) {
            const narration = this.extractionSystem.interruptExtraction(
              event.targetId, 'you were struck by an enemy',
            );
            if (narration) {
              const client = this.findClient(event.targetId);
              if (client) {
                this.sendNarrate(client, { text: narration, type: 'system', timestamp: Date.now() });
                this.sendExtractionState(client, {
                  playerId: event.targetId,
                  state: 'interrupted',
                  narration,
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
      }
    }

    // Resolve extraction ticks (skip for hub/social zones)
    if (!isNonCombatZone) {
      this.tickExtractions();
    }

    // Tick downing system — bleed-out timers, stabilize channels
    if (!isNonCombatZone) {
      this.tickDowningSystem();
    }

    // Decay traces
    this.traceSystem.tick(TICK_INTERVAL_MS);
  }

  // ─── Shard Lifecycle ─────────────────────────────────────────────────────

  private seedShard(): void {
    // Placeholder: room graph generation, creature spawning, loot placement
    this.log('Seeding shard: generating room graph...');

    const scheduleActiveTransition = () => {
      this.clock.setTimeout(() => {
        if (this.lifecycle === 'open') {
          this.transitionTo('active');
        }
      }, 5000); // Shortened for dev; production = 300_000 (5 min)
    };

    if (this.openDelayMs <= 0) {
      this.transitionTo('open');
      scheduleActiveTransition();
      return;
    }

    // Transition to open after seeding is complete
    this.clock.setTimeout(() => {
      this.transitionTo('open');
      scheduleActiveTransition();
    }, this.openDelayMs); // Shortened for dev; production = seeding duration
  }

  private transitionTo(newState: SharedShardState): void {
    const previousState = this.lifecycle;
    this.lifecycle = newState;
    this.state.lifecycle = newState;
    this.updateMetadata();

    this.log(`Lifecycle: ${previousState} → ${newState}`);

    // Notify all clients of state change
    this.broadcast(MessageTypes.SHARD_STATE, {
      state: newState,
      collapseTimer: this.state.collapseTimer,
    } satisfies ShardStateMessage);

    if (newState === 'collapse') {
      this.handleCollapse();
    }
  }

  private handleCollapse(): void {
    // Interrupt all active extractions
    const interrupted = this.extractionSystem.interruptAll('the shard collapsed');

    // Clear all traces on shard collapse
    this.traceSystem.clear();

    // Clear downing state on shard collapse
    this.downingSystem.clear();

    // Send EXTRACTION_STATE 'interrupted' to each affected player
    for (const { playerId, narration } of interrupted) {
      const client = this.findClient(playerId);
      if (client) {
        this.sendExtractionState(client, {
          playerId,
          state: 'interrupted',
          narration,
          timestamp: Date.now(),
        });
      }
    }

    // Shard-sickness narration for all remaining players
    this.broadcast(MessageTypes.NARRATE, {
      text: 'The shard shatters. Reality folds in on itself. Everything goes dark. A deep sickness settles into your bones — shard-sickness consumes you.',
      type: 'system',
      timestamp: Date.now(),
    } satisfies NarrateMessage);

    // Disconnect all clients after a brief delay
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 2000);
  }

  private updateMetadata(): void {
    // Build player list with room locations for matchmaker
    const playerList = Array.from(this.players.entries()).map(([playerId, state]) => ({
      playerId,
      roomId: state.currentRoomId,
    }));

    this.setMetadata({
      biome: this.state.biome,
      tier: this.state.tier,
      lifecycle: this.lifecycle,
      playerCount: this.state.playerCount,
      maxPlayers: this.maxClients ?? getMaxPlayersForTier(this.shardTier, getConfig()),
      players: playerList,
      ...(this.isZone ? { zoneSlug: this.zoneSlug, zoneName: this.zoneData?.zone.name } : {}),
    });
  }

  // ─── Command Handling ────────────────────────────────────────────────────

  private handleCommandMessage(client: Client, message: CommandMessage): void {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;
    const player = this.players.get(playerId);
    if (!player) {
      this.sendNarrate(client, {
        text: 'Your presence flickers. You are not fully in this shard.',
        type: 'system',
        timestamp: Date.now(),
      });
      return;
    }

    // If the client sends pre-parsed { verb, args }, use them directly.
    // If it's raw text, parse it through the command parser.
    let verb: string;
    let args: string[];

    if (message.verb && message.args) {
      // Pre-parsed from client (raw text may also arrive as { verb: raw, args: [] })
      // Run through parser for alias expansion if args is empty and verb has spaces,
      // or if verb is a known alias
      const parseResult = parseCommand(`${message.verb} ${message.args.join(' ')}`.trim());
      if (!parseResult.ok) {
        this.sendNarrate(client, { text: parseResult.error, type: 'system', timestamp: Date.now() });
        return;
      }
      verb = parseResult.command.verb;
      args = parseResult.command.args;
    } else {
      this.sendNarrate(client, {
        text: 'Silence hangs in the air. Type a command.',
        type: 'system',
        timestamp: Date.now(),
      });
      return;
    }

    this.log(`Command from ${this.playerTag(playerId)}: ${verb} ${args.join(' ')}`);

    // Block commands from downed players (they're incapacitated)
    if (this.downingSystem.isPlayerDowned(playerId)) {
      this.sendNarrate(client, {
        text: 'You are too wounded to act. You can only hope someone comes to your aid…',
        type: 'system',
        timestamp: Date.now(),
      });
      return;
    }

    const previousRoomId = player.currentRoomId;
    const wasExtracting = this.extractionSystem.isExtracting(playerId);
    const ctx = this.buildCommandContext(player, args);
    const result = handleCommand(verb, ctx);

    // Inter-zone exit: send transfer message to client instead of moving locally
    if (result.zoneTransfer) {
      this.deliverResult(client, result);
      client.send(MessageTypes.ZONE_TRANSFER, {
        targetZoneSlug: result.zoneTransfer.targetZoneSlug,
        targetRoomSlug: result.zoneTransfer.targetRoomSlug,
      } satisfies ZoneTransferMessage);
      return;
    }

    // Trace: movement creates footprints in the room LEFT
    const movedRoom = player.currentRoomId !== previousRoomId;
    if (movedRoom) {
      const direction = args[0]?.toLowerCase();
      this.traceSystem.addTrace(previousRoomId, 'footprint', {
        actorId: playerId,
        actorName: playerId,
      }, direction);

      // Awareness: notify observers in destination room about entering player
      this.runAwarenessChecks(playerId, player.currentRoomId, 'arrival');
      // Awareness: notify observers in source room about departing player
      this.runAwarenessChecks(playerId, previousRoomId, 'departure');

      // Exploration: send map update for the new room
      this.sendExplorationUpdate(client, playerId, player.currentRoomId);
    }

    // Social commands (say, emote) broadcast to all players in the same room
    // Whisper is handled separately with targeted delivery
    const isSocialBroadcast = verb === 'say' || verb === 'emote';
    const isWhisper = verb === 'whisper';

    if (isSocialBroadcast) {
      // Broadcast to all players in the same room (including sender)
      this.broadcastToRoom(player.currentRoomId, result);
    } else if (isWhisper) {
      // Deliver whisper: sender gets confirmation, target gets the message
      this.deliverWhisper(client, player, result, ctx.otherPlayersInRoom);
    } else {
      // Normal command: deliver only to sender
      this.deliverResult(client, result);
    }

    // Trace: send trace narrations on room entry or "look"
    if (movedRoom || verb === 'look') {
      this.sendTraceNarrations(client, player.currentRoomId);
    }

    // Send EXTRACTION_STATE 'started' if this command initiated an extraction
    if (!wasExtracting && this.extractionSystem.isExtracting(playerId)) {
      const channel = this.extractionSystem.getChannel(playerId)!;
      this.sendExtractionState(client, {
        playerId,
        state: 'started',
        totalTicks: channel.totalTicks,
        ticksRemaining: channel.ticksRemaining,
        narration: result.narrations[0]?.text ?? 'The extraction ritual begins...',
        timestamp: Date.now(),
      });
    }
  }

  private buildCommandContext(player: PlayerState, args: string[]): CommandContext {
    const room = this.roomGraph.rooms.get(player.currentRoomId)!;
    const otherPlayersInRoom: string[] = [];
    for (const [sid, ps] of this.players) {
      if (sid !== player.sessionId && ps.currentRoomId === player.currentRoomId) {
        otherPlayersInRoom.push(sid);
      }
    }

    const creaturesInRoom = this.creatureManager.getCreaturesInRoom(player.currentRoomId)
      .map(c => ({ id: c.id, name: c.name }));

    return {
      player,
      room,
      args,
      resolveRoom: (roomId: string) => this.roomGraph.rooms.get(roomId),
      otherPlayersInRoom,
      stability: this.state.stability,
      characterName: this.characterNames.get(player.sessionId),
      combatSystem: this.combatSystem,
      extractionSystem: this.extractionSystem,
      downingSystem: this.downingSystem,
      creaturesInRoom,
    };
  }

  private deliverResult(client: Client, result: import('../commands/index.js').CommandResult): void {
    // Send room header before narrations so the yellow header appears first
    if (result.roomHeader) {
      const header: RoomHeaderMessage = {
        ...result.roomHeader,
        ...(this.isZone && this.zoneData ? { zoneName: this.zoneData.zone.name } : {}),
      };
      this.sendRoomHeader(client, header);
    }
    for (const narration of result.narrations) {
      this.sendNarrate(client, {
        text: narration.text,
        type: narration.type,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Broadcast narrations to all players in a specific room.
   * Used for proximity-based social commands (say, emote).
   */
  private broadcastToRoom(roomId: string, result: import('../commands/index.js').CommandResult): void {
    for (const narration of result.narrations) {
      // Send to all players in the room
      for (const [pid, ps] of this.players) {
        if (ps.currentRoomId === roomId) {
          const targetClient = this.findClient(pid);
          if (targetClient) {
            this.sendNarrate(targetClient, {
              text: narration.text,
              type: narration.type,
              timestamp: Date.now(),
            });
          }
        }
      }
    }
  }

  /**
   * Deliver a whisper message to a specific target.
   * Sender gets confirmation, target gets the actual message.
   */
  private deliverWhisper(
    sender: Client, 
    senderPlayer: PlayerState, 
    result: import('../commands/index.js').CommandResult,
    otherPlayersInRoom: string[]
  ): void {
    // Sender always gets the result (confirmation message)
    this.deliverResult(sender, result);

    // Extract the whispered message from the sender's confirmation
    // Format: "You whisper to a nearby figure: "message""
    const confirmationText = result.narrations[0]?.text ?? '';
    const match = confirmationText.match(/"(.+)"/);
    
    if (match && otherPlayersInRoom.length > 0) {
      const whisperedMessage = match[1];
      // For Phase 1, send to the first other player in the room
      // Future: use proper target matching from whisper handler
      const targetSessionId = otherPlayersInRoom[0];
      const targetClient = this.findClient(targetSessionId);
      
      if (targetClient) {
        this.sendNarrate(targetClient, {
          text: `A figure whispers to you: "${whisperedMessage}"`,
          type: 'speech',
          timestamp: Date.now(),
        });
      }
    }
  }

  // ─── Combat Result Delivery ──────────────────────────────────────────────

  private deliverCombatResults(tickResult: TickResult): void {
    // Track which players need HP updates
    const playersNeedingUpdate = new Set<string>();

    // Send combat event narrations to all clients in relevant rooms
    for (const event of tickResult.events) {
      this.broadcast(MessageTypes.NARRATE, {
        text: event.narration,
        type: 'combat',
        timestamp: Date.now(),
        combatEvent: {
          eventType: event.type,
          actorId: event.actorId,
          targetId: event.targetId,
        },
      } satisfies NarrateMessage);

      // Track players who took damage
      if (event.type === 'strike' && event.targetId && this.players.has(event.targetId)) {
        playersNeedingUpdate.add(event.targetId);
      }
    }

    // Send player state updates to all players whose HP changed
    for (const playerId of playersNeedingUpdate) {
      const client = this.findClient(playerId);
      if (client) {
        this.sendPlayerState(client, playerId);
      }
    }

    // Handle flee movement — update player positions and send room descriptions
    for (const flee of tickResult.fleeResults) {
      const player = this.players.get(flee.combatantId);
      if (player) {
        // Trace: fleeing creates footprints in the room LEFT
        this.traceSystem.addTrace(flee.fromRoomId, 'footprint', {
          actorId: flee.combatantId,
          actorName: flee.combatantId,
        });

        player.currentRoomId = flee.toRoomId;
        const client = this.findClient(flee.combatantId);
        if (client) {
          const targetRoom = this.roomGraph.rooms.get(flee.toRoomId);
          if (targetRoom) {
            this.sendNarrate(client, {
              text: `You flee to **${targetRoom.name}**.\n${targetRoom.description}`,
              type: 'room',
              timestamp: Date.now(),
            });
            this.sendRoomHeader(client, {
              roomName: targetRoom.name,
              exits: Array.from(targetRoom.exits.keys()),
              stability: this.state.stability,
              ...(this.isZone && this.zoneData ? { zoneName: this.zoneData.zone.name } : {}),
            });
            this.sendTraceNarrations(client, flee.toRoomId);

            // Exploration: send map update for the flee destination
            this.sendExplorationUpdate(client, flee.combatantId, flee.toRoomId);
          }
        }
      }
    }
  }

  private findClient(playerId: string): Client | undefined {
    for (const [sessionId, pid] of this.playerIds) {
      if (pid === playerId) {
        return this.clients.find((c) => c.sessionId === sessionId);
      }
    }
    return undefined;
  }

  private sendExtractionState(client: Client, msg: ExtractionMessage): void {
    client.send(MessageTypes.EXTRACTION_STATE, msg);
  }

  // ─── Sound Propagation (GDD §12) ─────────────────────────────────────────

  /**
   * After combat resolves, emit combat sounds from each encounter room
   * and deliver sound narrations to players in nearby rooms.
   */
  private propagateCombatSounds(tickResult: TickResult): void {
    const strikeRoomIds = new Set<string>();
    for (const event of tickResult.events) {
      if (event.type === 'strike' && event.targetId) {
        const combatant = this.combatSystem.getCombatant(event.actorId);
        if (combatant) strikeRoomIds.add(combatant.roomId);
      }
    }
    for (const roomId of strikeRoomIds) {
      this.emitSound(roomId, 'combat');
    }
  }

  /**
   * Emit a sound from a room and deliver narrations to all affected players.
   */
  private emitSound(sourceRoomId: string, soundType: SoundType): void {
    const noiseLevel = NOISE_VALUES[soundType];
    const results = this.soundSystem.propagateSound(sourceRoomId, noiseLevel);
    const description = SOUND_DESCRIPTIONS[soundType];

    for (const result of results) {
      const qualifier = result.effectiveNoise >= 4 ? '' :
        result.effectiveNoise >= 2 ? 'distant ' : 'faint ';
            const text = `You hear ${qualifier}${description} from the ${result.direction}.`;

      for (const [sid, ps] of this.players) {
        if (ps.currentRoomId === result.roomId) {
          const client = this.findClient(sid);
          if (client) {
            this.sendNarrate(client, {
              text,
              type: 'sound',
              timestamp: Date.now(),
            });
          }
        }
      }
    }
  }

  // ─── Trace System (GDD §11.2) ──────────────────────────────────────────

  /** Create blood_trail traces for combat damage events that exceed the threshold. */
  private createCombatTraces(tickResult: TickResult): void {
    for (const event of tickResult.events) {
      if (event.type === 'strike' && event.targetId && event.damage != null) {
        const combatant = this.combatSystem.getCombatant(event.targetId);
        if (combatant && event.damage >= BLOOD_TRAIL_DAMAGE_THRESHOLD) {
          this.traceSystem.addTrace(combatant.roomId, 'blood_trail', {
            actorName: event.targetName,
            severity: event.damage,
          });
        }
      }
    }
  }

  /** Send active trace descriptions to a client as narration. */
  private sendTraceNarrations(client: Client, roomId: string): void {
    const descriptions = this.traceSystem.getTracesForPlayer(roomId, {
      tracking: TRACKING_THRESHOLDS.BASIC,
    });
    if (descriptions.length === 0) return;

    const text = descriptions.map(d => d.text).join('\n');
    this.sendNarrate(client, { text, type: 'trace', timestamp: Date.now() });
  }


  // ─── Extraction Tick Delivery ─────────────────────────────────────────────

  private tickExtractions(): void {
    for (const playerId of this.extractionSystem.getActiveExtractions()) {
      const result = this.extractionSystem.tickExtraction(playerId);
      if (!result) continue;

      const client = this.findClient(playerId);
      if (!client) {
        this.extractionSystem.interruptExtraction(playerId, 'player disconnected');
        continue;
      }

      this.sendNarrate(client, {
        text: result.narration,
        type: 'system',
        timestamp: Date.now(),
      });

      if (result.completed) {
        this.handleSuccessfulExtraction(client, playerId);
      } else {
        // Send progress update so the client can track channel state
        const channel = this.extractionSystem.getChannel(playerId);
        this.sendExtractionState(client, {
          playerId,
          state: 'progress',
          ticksRemaining: channel?.ticksRemaining,
          totalTicks: channel?.totalTicks,
          narration: result.narration,
          timestamp: Date.now(),
        });
      }
    }
  }

  private async handleSuccessfulExtraction(client: Client, playerId: string): Promise<void> {
    const player = this.players.get(playerId);

    // Transfer inventory to stash before removing player
    if (player && this.stashService) {
      await this.transferToStash(client, playerId, player);
    }

    // Record run history
    await this.recordRunHistory(playerId, player, true);

    // Remove player from shard
    this.players.delete(playerId);
    this.combatSystem.removeCombatant(playerId);
    this.ownerPlayerIds.delete(playerId);
    this.state.playerCount = Math.max(0, this.state.playerCount - 1);
    this.updateMetadata();

    this.log(`Player ${this.playerTag(playerId)} extracted`);

    // Send extraction completion message
    client.send(MessageTypes.EXTRACTION_STATE, {
      playerId,
      state: 'completed',
      narration: 'You emerge from the portal into the warm glow of the Refuge. You made it out.',
      timestamp: Date.now(),
    });

    // Tell client to switch back to refuge
    client.send(MessageTypes.ROOM_SWITCH, {
      target: 'zone:the-refuge',
      reason: 'extraction_complete',
    } satisfies RoomSwitchMessage);
  }

  /**
   * Transfer a player's shard inventory into their persistent stash.
   * Items that don't fit remain in the player's carried inventory.
   */
  private async transferToStash(
    client: Client, playerId: string, player: PlayerState,
  ): Promise<void> {
    if (player.inventory.size === 0) return;

    const result = await transferInventoryToStash(
      this.dbPlayerId(playerId), player.inventory, this.stashService!, this.itemDefs,
    );

    // Remove only items that were successfully stored; keep retained items
    if (result.retainedItems.length > 0) {
      const retainedMap = new Map(
        result.retainedItems.map((r) => [r.itemId, r.quantity]),
      );
      for (const [key, entry] of player.inventory) {
        const retainedQty = retainedMap.get(key);
        if (retainedQty != null) {
          entry.quantity = retainedQty;
        } else {
          player.inventory.delete(key);
        }
      }
    } else {
      player.inventory.clear();
    }

    // Narrate the transfer
    if (result.stored > 0 && result.retained === 0) {
      this.sendNarrate(client, {
        text: `You secured ${result.stored} item${result.stored !== 1 ? 's' : ''} in your stash.`,
        type: 'system',
        timestamp: Date.now(),
      });
    } else if (result.stored > 0 && result.retained > 0) {
      this.sendNarrate(client, {
        text: `You secured ${result.stored} item${result.stored !== 1 ? 's' : ''} in your stash, but ${result.retained} item${result.retained !== 1 ? 's' : ''} couldn't fit.`,
        type: 'system',
        timestamp: Date.now(),
      });
    }

    // Send per-item overflow narrations
    for (const narration of result.narrations) {
      this.sendNarrate(client, {
        text: narration,
        type: 'system',
        timestamp: Date.now(),
      });
    }
  }

  // ─── Creature AI Tick ──────────────────────────────────────────────────────

  private tickCreatures(): void {
    if (this.creatureManager.getLivingCreatures().length === 0) return;

    const world = this.buildCreatureWorldState();
    const actions = this.creatureManager.updateAll(world);

    for (const action of actions) {
      this.processCreatureAction(action);
    }
  }

  private buildCreatureWorldState(): CreatureWorldState {
    const playersInRoom = new Map<string, string[]>();
    for (const [sid, ps] of this.players) {
      // Peaceful players are invisible to creature AI
      if (ps.peaceful) continue;
      const list = playersInRoom.get(ps.currentRoomId);
      if (list) {
        list.push(sid);
      } else {
        playersInRoom.set(ps.currentRoomId, [sid]);
      }
    }

    const roomExits = new Map<string, string[]>();
    for (const [id, room] of this.roomGraph.rooms) {
      roomExits.set(id, Array.from(room.exits.values()));
    }

    const noisyRooms = new Set<string>(this.combatSystem.getActiveEncounterRoomIds());

    return { playersInRoom, roomExits, noisyRooms };
  }

  private processCreatureAction(action: CreatureAction): void {
    const creature = this.creatureManager.getCreature(action.creatureId);
    if (!creature || !creature.isAlive) return;

    switch (action.type) {
      case 'combat_strike': {
        // Skip combat initiation against peaceful players (dev mode safety guard)
        if (action.targetCombatantId) {
          const targetPlayer = this.players.get(action.targetCombatantId);
          if (targetPlayer?.peaceful) break;
        }
        // Register creature as combatant if needed
        if (!this.combatSystem.getCombatant(creature.id)) {
          this.combatSystem.registerCombatant(this.creatureManager.toCombatant(creature));
        }
        // Register target player as combatant if needed
        if (action.targetCombatantId && !this.combatSystem.getCombatant(action.targetCombatantId)) {
          const player = this.players.get(action.targetCombatantId);
          if (player) {
            const displayName = this.characterNames.get(player.sessionId) ?? player.sessionId;
            this.combatSystem.registerCombatant(
              createCombatant(player.sessionId, displayName, player.currentRoomId, true),
            );
          }
        }
        // Initiate or join existing combat
        if (!this.combatSystem.isInCombat(creature.id) && action.targetCombatantId) {
          this.combatSystem.initiateCombat(creature.id, action.targetCombatantId);
        } else if (action.targetCombatantId) {
          this.combatSystem.submitAction(creature.id, 'strike', action.targetCombatantId);
        }
        break;
      }
      case 'combat_dodge': {
        if (this.combatSystem.isInCombat(creature.id)) {
          this.combatSystem.submitAction(creature.id, 'dodge');
        }
        break;
      }
      case 'combat_flee': {
        if (this.combatSystem.isInCombat(creature.id)) {
          this.combatSystem.submitAction(creature.id, 'flee', undefined, action.targetRoomId);
        }
        break;
      }
      // patrol_move and alert_move already handled by CreatureManager.updateAll()
    }
  }

  private syncCreaturesAfterCombat(tickResult: TickResult): void {
    // Handle creature deaths FIRST — drop loot before syncing marks them dead
    for (const event of tickResult.events) {
      if (event.type === 'defeated' && event.actorId.startsWith('creature-')) {
        const loot = this.creatureManager.removeCreature(event.actorId);
        const combatant = this.combatSystem.getCombatant(event.actorId);
        const roomId = combatant?.roomId;
        if (roomId && loot.length > 0) {
          const room = this.roomGraph.rooms.get(roomId);
          if (room) {
            for (const item of loot) {
              room.items.push(item);
            }
            for (const [sid, ps] of this.players) {
              if (ps.currentRoomId === roomId) {
                const client = this.findClient(sid);
                if (client) {
                  this.sendNarrate(client, {
                    text: loot.map(i => `A ${i.name} drops to the ground.`).join('\n'),
                    type: 'room',
                    timestamp: Date.now(),
                  });
                }
              }
            }
          }
        }
        this.combatSystem.removeCombatant(event.actorId);

        // Trace: creature death creates corpse trace
        if (roomId) {
          this.traceSystem.addTrace(roomId, 'corpse', {
            actorId: event.actorId,
            actorName: event.actorName,
          });
        }
      }
    }

    // Handle player defeats — drop inventory, send death state, schedule refuge return
    this.handlePlayerDefeats(tickResult);

    // Sync HP and room for surviving creature combatants
    for (const creature of this.creatureManager.getLivingCreatures()) {
      const combatant = this.combatSystem.getCombatant(creature.id);
      if (combatant) {
        this.creatureManager.syncFromCombat(combatant);
      }
    }
  }

  /**
   * Handle player defeat events — enters downed state instead of instant death.
   * The DowningSystem manages the bleed-out timer; actual death happens in tickDowningSystem().
   */
  private handlePlayerDefeats(tickResult: TickResult): void {
    for (const event of tickResult.events) {
      if (event.type !== 'defeated' || event.actorId.startsWith('creature-')) continue;

      const playerId = event.actorId;
      const player = this.players.get(playerId);
      if (!player) continue;

      const roomId = player.currentRoomId;

      // Enter downed state instead of dying immediately
      this.downingSystem.downPlayer(playerId, event.actorName, roomId, event.killerIds);
      this.log(`Player ${this.playerTag(playerId)} downed in ${roomId}`);

      // Notify the downed player
      const client = this.findClient(playerId);
      if (client) {
        this.sendExtractionState(client, {
          playerId,
          state: 'downed',
          narration: 'You collapse, gravely wounded. Your vision darkens at the edges…',
          timestamp: Date.now(),
        });
      }

      // Notify other players in the room
      for (const [sid, ps] of this.players) {
        if (sid === playerId || ps.currentRoomId !== roomId) continue;
        const otherClient = this.findClient(sid);
        if (otherClient) {
          this.sendNarrate(otherClient, {
            text: `${event.actorName} collapses to the ground, bleeding out.`,
            type: 'combat',
            timestamp: Date.now(),
          });
        }
      }

      // Remove from combat system immediately (downed players can't fight)
      this.combatSystem.removeCombatant(playerId);
    }
  }

  /**
   * Tick the downing system and handle resulting events (bleed-outs, stabilizations).
   */
  private tickDowningSystem(): void {
    const events = this.downingSystem.tick();

    for (const event of events) {
      switch (event.type) {
        case 'player_bleed_out':
          this.handlePlayerDeath(event.playerId, event.playerName, event.roomId, event.killerIds);
          break;
        case 'player_stabilized':
          this.handlePlayerStabilized(event);
          break;
      }
    }
  }

  /**
   * Check if active combat in a room should finish off downed (unstabilized) players.
   * Any strike in a room with a bleeding-out player triggers a killing blow.
   */
  private checkKillingBlows(tickResult: TickResult): void {
    const strikeRooms = new Set<string>();
    for (const event of tickResult.events) {
      if (event.type === 'strike') {
        const combatant = this.combatSystem.getCombatant(event.actorId);
        if (combatant) strikeRooms.add(combatant.roomId);
      }
    }

    if (strikeRooms.size === 0) return;

    for (const downed of this.downingSystem.getAllDownedPlayers()) {
      if (downed.state !== 'downed') continue;
      if (!strikeRooms.has(downed.roomId)) continue;

      const killEvent = this.downingSystem.killingBlow(downed.playerId);
      if (killEvent) {
        this.log(`Killing blow on downed player: ${this.playerTag(downed.playerId)} in ${downed.roomId}`);

        const client = this.findClient(downed.playerId);
        if (client) {
          this.sendNarrate(client, {
            text: 'An enemy strikes you while you lie helpless. The final blow lands…',
            type: 'combat',
            timestamp: Date.now(),
          });
        }

        this.handlePlayerDeath(downed.playerId, downed.playerName, downed.roomId, killEvent.killerIds);
      }
    }
  }

  /**
   * Handle actual player death (from bleed-out or killing blow).
   * Drops inventory, creates corpse trace, applies shard-sickness on PvP death,
   * emits PvPKillEvent, and schedules return to refuge.
   */
  private handlePlayerDeath(playerId: string, playerName: string, roomId: string, killerIds?: string[]): void {
    const player = this.players.get(playerId);
    if (!player) return;

    const room = this.roomGraph.rooms.get(roomId);

    // PvP detection: any non-creature attacker means this was a PvP kill
    const isPvPKill = (killerIds ?? []).some(id => !id.startsWith('creature-'));

    // Drop all inventory items to the room floor
    const droppedItems: { name: string }[] = [];
    if (room) {
      for (const [, entry] of player.inventory) {
        for (let i = 0; i < entry.quantity; i++) {
          room.items.push(entry.item);
          droppedItems.push(entry.item);
        }
      }
    }
    player.inventory.clear();

    // Clear equipped loadout — gear is lost on death (both in-memory and repo)
    player.equipment = undefined;
    if (this.loadoutService) {
      this.loadoutService.clearLoadout(this.dbPlayerId(playerId)).catch((err) => {
        this.log(`Failed to clear loadout on death for ${this.playerTag(playerId)}: ${err}`);
      });
    }

    // Trace: player death creates corpse trace (lootable)
    this.traceSystem.addTrace(roomId, 'corpse', {
      actorId: playerId,
      actorName: playerName,
    });

    // Apply shard-sickness death penalty (increment death count, record time)
    void this.shardSicknessStore.incrementDeathCount(playerId).then((newCount: number) => {
      void this.shardSicknessStore.setLastDeathTime(playerId, Date.now());
      this.log(`Shard-sickness: ${this.playerTag(playerId)} death count now ${newCount}`);
    });

    // Apply shard-sickness debuff to player state (on any death)
    player.shardSickness = {
      appliedAt: Date.now(),
      durationMs: SHARD_SICKNESS_DEFAULTS.durationMs,
      attackPenalty: SHARD_SICKNESS_DEFAULTS.attackPenalty,
      defencePenalty: SHARD_SICKNESS_DEFAULTS.defencePenalty,
    };

    // Log PvPKillEvent for each player killer on PvP death
    if (isPvPKill) {

      // Log PvPKillEvent for each player killer
      for (const killerId of killerIds ?? []) {
        if (killerId.startsWith('creature-')) continue;
        const pvpEvent: PvPKillEvent = {
          type: 'pvp_kill',
          killerId,
          victimId: playerId,
          victimName: playerName,
          roomId,
          timestamp: Date.now(),
        };
        this.log(`PvPKillEvent: ${JSON.stringify(pvpEvent)}`);
      }
    }

    // Narrate dropped items to other players in the room
    if (droppedItems.length > 0 && room) {
      for (const [sid, ps] of this.players) {
        if (sid === playerId || ps.currentRoomId !== roomId) continue;
        const otherClient = this.findClient(sid);
        if (otherClient) {
          this.sendNarrate(otherClient, {
            text: droppedItems.map(i => `${playerName} drops a ${i.name} as they fall.`).join('\n'),
            type: 'room',
            timestamp: Date.now(),
          });
        }
      }
    }

    // Send death state to the defeated player
    const client = this.findClient(playerId);
    if (client) {
      this.sendExtractionState(client, {
        playerId,
        state: 'death',
        narration: isPvPKill
          ? 'A rival adventurer fells you. You awaken in the Refuge, wracked with shard-sickness…'
          : 'The darkness claims you. You awaken in the Refuge, weakened by shard-sickness…',
        timestamp: Date.now(),
      });

      // Schedule return to refuge after 3 seconds
      this.clock.setTimeout(async () => {
        if (!this.players.has(playerId)) {
          this.log(`Player ${this.playerTag(playerId)} already left during death delay — skipping cleanup`);
          return;
        }

        // Persist cleared profile (equipment=undefined) before removing from state.
        // Without this, onLeave skips savePlayerProfile because the player is
        // already deleted, and the stale equipment survives in the profile repo.
        await this.savePlayerProfile(playerId, this.players.get(playerId)!);

        client.send(MessageTypes.ROOM_SWITCH, {
          target: 'zone:the-refuge',
          reason: 'player_death',
        } satisfies RoomSwitchMessage);

        // Clean up player from shard state
        this.players.delete(playerId);
        this.ownerPlayerIds.delete(playerId);
        this.state.playerCount = Math.max(0, this.state.playerCount - 1);
        this.updateMetadata();
        this.log(`Player ${this.playerTag(playerId)} died and returned to refuge`);
      }, 3000);
    }

    // Clean up from downing system
    this.downingSystem.removePlayer(playerId);
    this.combatSystem.removeCombatant(playerId);
  }

  /**
   * Handle successful stabilization — notify both players.
   */
  private handlePlayerStabilized(event: DowningEvent): void {
    const targetClient = this.findClient(event.playerId);
    if (targetClient) {
      this.sendExtractionState(targetClient, {
        playerId: event.playerId,
        state: 'stabilized',
        narration: 'You feel firm hands stemming the bleeding. The darkness recedes, but you remain unconscious…',
        timestamp: Date.now(),
      });
    }

    // Notify the stabilizer
    if (event.stabilizerId) {
      const stabilizerClient = this.findClient(event.stabilizerId);
      if (stabilizerClient) {
        this.sendNarrate(stabilizerClient, {
          text: `You stabilize ${event.playerName}. They are unconscious but no longer bleeding out.`,
          type: 'combat',
          timestamp: Date.now(),
        });
      }
    }

    // Notify others in the room
    const downed = this.downingSystem.getDownedPlayer(event.playerId);
    if (downed) {
      for (const [sid, ps] of this.players) {
        if (sid === event.playerId || sid === event.stabilizerId) continue;
        if (ps.currentRoomId !== downed.roomId) continue;
        const otherClient = this.findClient(sid);
        if (otherClient) {
          this.sendNarrate(otherClient, {
            text: `A figure stabilizes ${event.playerName}, stemming the flow of blood.`,
            type: 'combat',
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  /**
   * Run awareness checks for a player entering/leaving a room.
   * Notifies each observer in the room with a detection-tier-appropriate message.
   */
  private runAwarenessChecks(
    playerId: string,
    roomId: string,
    direction: 'arrival' | 'departure',
  ): void {
    const enteringPlayerState = this.players.get(playerId);
    if (!enteringPlayerState) return;

    // Build AwarenessPlayer for the entering player from real PlayerState
    const enteringPlayer: AwarenessPlayer = {
      sessionId: playerId,
      skills: {
        stealth: enteringPlayerState.skills.stealth,
        awareness: enteringPlayerState.skills.awareness,
      },
      equipment: enteringPlayerState.equipment,
    };

    // Build observers list from other players in the room using real PlayerState
    const observers: AwarenessPlayer[] = [];
    for (const [sid, ps] of this.players) {
      if (sid === playerId) continue;
      if (ps.currentRoomId !== roomId) continue;
      observers.push({
        sessionId: sid,
        skills: {
          stealth: ps.skills.stealth,
          awareness: ps.skills.awareness,
        },
        equipment: ps.equipment,
      });
    }

    if (observers.length === 0) return;

    const events = this.awarenessSystem.checkRoomEntry(enteringPlayer, observers, direction);

    for (const event of events) {
      if (event.tier === 'none' || !event.message) continue;

      const observerClient = this.findClient(event.observerId);
      if (observerClient) {
        this.sendNarrate(observerClient, {
          text: event.message,
          type: 'awareness',
          timestamp: Date.now(),
        });
      }
    }
  }

  // ─── Message Senders ─────────────────────────────────────────────────────

  private sendNarrate(client: Client, message: NarrateMessage): void {
    client.send(MessageTypes.NARRATE, message);
  }

  private sendRoomHeader(client: Client, message: RoomHeaderMessage): void {
    client.send(MessageTypes.ROOM_HEADER, message);
  }

  private sendShardState(client: Client, message: ShardStateMessage): void {
    client.send(MessageTypes.SHARD_STATE, message);
  }

  // ─── Exploration Messages ─────────────────────────────────────────────────

  /** Convert a RoomGraph room to the ExploredRoomData shape the client expects. */
  private buildExploredRoomData(roomId: string): ExploredRoomData | null {
    const room = this.roomGraph.rooms.get(roomId);
    if (!room) return null;

    const exits: Record<string, string> = {};
    for (const [dir, targetId] of room.exits) {
      exits[dir] = targetId;
    }

    return {
      roomId: room.id,
      roomName: room.name,
      roomType: room.type ?? 'corridor',
      zoneSlug: this.zoneSlug ?? null,
      visitedAt: new Date().toISOString(),
      exits,
    };
  }

  /** Send bulk exploration data to a client (on join). */
  private sendExplorationData(client: Client, playerId: string, currentRoomId: string): void {
    const roomData = this.buildExploredRoomData(currentRoomId);
    if (!roomData) return;

    const message: ExplorationDataMessage = {
      type: MessageTypes.EXPLORATION_DATA,
      rooms: [roomData],
      currentRoomId,
    };
    client.send(MessageTypes.EXPLORATION_DATA, message);
    this.log(`Exploration data sent to ${this.playerTag(playerId)} (${currentRoomId})`);

    // Persist visit
    this.recordExplorationVisit(playerId, currentRoomId, roomData);
  }

  /** Send incremental exploration update to a client (on room entry). */
  private sendExplorationUpdate(client: Client, playerId: string, roomId: string): void {
    const roomData = this.buildExploredRoomData(roomId);
    if (!roomData) return;

    const message: ExplorationUpdateMessage = {
      type: MessageTypes.EXPLORATION_UPDATE,
      room: roomData,
    };
    client.send(MessageTypes.EXPLORATION_UPDATE, message);

    // Persist visit
    this.recordExplorationVisit(playerId, roomId, roomData);
  }

  /** Fire-and-forget persistence of a room visit. */
  private recordExplorationVisit(playerId: string, roomId: string, roomData: ExploredRoomData): void {
    this.explorationRepo.recordVisit({
      characterId: playerId,
      zoneSlug: this.zoneSlug ?? null,
      roomId,
      roomType: roomData.roomType,
      roomName: roomData.roomName,
      shardTier: this.shardTier,
      biome: this.state.biome,
    }).catch((err) => {
      this.log(`Failed to record exploration visit for ${this.playerTag(playerId)}: ${err}`);
    });
  }

  // ─── Profile Persistence ─────────────────────────────────────────────────

  /** Resolve the players-table UUID for DB operations (FKs reference players.id, not characters.id). */
  private dbPlayerId(characterId: string): string {
    return this.ownerPlayerIds.get(characterId) ?? characterId;
  }

  /** Extract persistable profile from player state and save it. */
  private async savePlayerProfile(playerId: string, playerState: PlayerState): Promise<void> {
    try {
      const profile: PlayerProfile = {
        skills: { ...playerState.skills },
        maxCarryWeight: playerState.maxCarryWeight,
        equipment: playerState.equipment,
      };
      await this.profileRepo.save(this.dbPlayerId(playerId), profile);
    } catch (err) {
      this.log(`Failed to save profile for ${this.playerTag(playerId)}: ${err}`);
    }
  }

  // ─── Run History Persistence ────────────────────────────────────────────

  /** Record a shard run when a player extracts or the shard collapses. */
  private async recordRunHistory(
    playerId: string,
    player: PlayerState | undefined,
    extracted: boolean,
  ): Promise<void> {
    try {
      const joinTime = this.playerJoinTimes.get(playerId);
      const durationSec = joinTime
        ? Math.floor((Date.now() - joinTime) / 1000)
        : 0;

      const run: RunRecord = {
        runId: this.roomId,
        playerId: this.dbPlayerId(playerId),
        shardTier: this.shardTier,
        biome: (this.state.biome as BiomeType) || null,
        durationSec,
        extracted,
        extractedItems: player
          ? Array.from(player.inventory.values()).map((entry) => ({
              itemId: entry.item.id,
              name: entry.item.name,
            }))
          : [],
        xpGained: 0,
      };

      await this.runHistoryRepo.recordRun(run);
      this.playerJoinTimes.delete(playerId);
    } catch (err) {
      this.log(`Failed to record run history for ${this.playerTag(playerId)}: ${err}`);
    }
  }

  // ─── Equipment Message Handlers (Server-Authoritative — Mid-Shard) ────

  private async handleEquipItem(client: Client, message: EquipItemMessage): Promise<void> {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;
    const player = this.players.get(client.sessionId);

    if (!this.loadoutService || !player) {
      client.send(MessageTypes.NARRATE, {
        text: 'Equipment system unavailable.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    // Check extraction lock
    if (this.extractionSystem.isExtracting(client.sessionId)) {
      client.send(MessageTypes.NARRATE, {
        text: 'Cannot change equipment while extracting!',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    try {
      // First try stash, then shard inventory
      const result = await this.loadoutService.equipItem(this.dbPlayerId(playerId), message.itemId, message.targetSlot);

      if (!result.ok) {
        // Try equipping from shard inventory
        const invEntry = this.findInInventory(player, message.itemId);
        if (invEntry) {
          const invItem = this.toStashItemInstance(invEntry);
          const invResult = await this.loadoutService.equipFromInventory(this.dbPlayerId(playerId), invItem, message.targetSlot);

          if (invResult.ok) {
            // Remove from shard inventory
            player.inventory.delete(invEntry.item.id);

            // If displaced item, add it back to shard inventory
            if (invResult.displaced) {
              const displacedDef = this.itemDefs.get(invResult.displaced.itemId);
              if (displacedDef) {
                player.addItem({
                  id: displacedDef.id,
                  name: displacedDef.name,
                  weight: displacedDef.weight,
                  description: displacedDef.description,
                });
              }
            }

            await this.sendShardLoadoutUpdate(client, playerId);
            client.send(MessageTypes.NARRATE, {
              text: `Equipped from inventory to ${message.targetSlot}.`,
              type: 'system',
              timestamp: Date.now(),
            } satisfies NarrateMessage);
            return;
          }

          client.send(MessageTypes.NARRATE, {
            text: invResult.error ?? 'Failed to equip from inventory.',
            type: 'system',
            timestamp: Date.now(),
          } satisfies NarrateMessage);
          return;
        }

        client.send(MessageTypes.NARRATE, {
          text: result.error!,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      await this.sendShardLoadoutUpdate(client, playerId);
      client.send(MessageTypes.NARRATE, {
        text: `Item equipped to ${message.targetSlot}.`,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch (err) {
      this.log(`Equip failed for ${this.playerTag(playerId)}: ${err}`);
      client.send(MessageTypes.NARRATE, {
        text: 'Failed to equip item.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  private async handleUnequipItem(client: Client, message: UnequipItemMessage): Promise<void> {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;

    if (!this.loadoutService) {
      client.send(MessageTypes.NARRATE, {
        text: 'Equipment system unavailable.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    if (this.extractionSystem.isExtracting(client.sessionId)) {
      client.send(MessageTypes.NARRATE, {
        text: 'Cannot change equipment while extracting!',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    try {
      const result = await this.loadoutService.unequipItem(this.dbPlayerId(playerId), message.slot);

      if (!result.ok) {
        client.send(MessageTypes.NARRATE, {
          text: result.error!,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      await this.sendShardLoadoutUpdate(client, playerId);
      client.send(MessageTypes.NARRATE, {
        text: `Item unequipped from ${message.slot}.`,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch (err) {
      this.log(`Unequip failed for ${this.playerTag(playerId)}: ${err}`);
      client.send(MessageTypes.NARRATE, {
        text: 'Failed to unequip item.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  private async handleSwapItem(client: Client, message: SwapItemMessage): Promise<void> {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;

    if (!this.loadoutService) {
      client.send(MessageTypes.NARRATE, {
        text: 'Equipment system unavailable.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    if (this.extractionSystem.isExtracting(client.sessionId)) {
      client.send(MessageTypes.NARRATE, {
        text: 'Cannot change equipment while extracting!',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    try {
      const result = await this.loadoutService.swapItem(this.dbPlayerId(playerId), message.itemId, message.targetSlot);

      if (!result.ok) {
        client.send(MessageTypes.NARRATE, {
          text: result.error!,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        return;
      }

      await this.sendShardLoadoutUpdate(client, playerId);
      client.send(MessageTypes.NARRATE, {
        text: `Item swapped into ${message.targetSlot}.`,
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    } catch (err) {
      this.log(`Swap failed for ${this.playerTag(playerId)}: ${err}`);
      client.send(MessageTypes.NARRATE, {
        text: 'Failed to swap item.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
    }
  }

  /** Send loadout update to client after equipment change. */
  private async sendShardLoadoutUpdate(client: Client, playerId: string): Promise<void> {
    if (!this.loadoutService) return;
    const loadoutView = await this.loadoutService.getLoadoutView(this.dbPlayerId(playerId));
    client.send(MessageTypes.LOADOUT_UPDATE, {
      slots: loadoutView.slots,
    } satisfies LoadoutUpdateMessage);
  }

  /** Send player state update to client (HP, stamina, status effects). */
  private sendPlayerState(client: Client, playerId: string): void {
    const combatant = this.combatSystem.getCombatant(playerId);
    if (!combatant) return;

    client.send(MessageTypes.PLAYER_STATE, {
      hp: combatant.hp,
      maxHp: combatant.maxHp,
      stamina: 0, // Placeholder — stamina system not implemented yet
      maxStamina: 0,
      statusEffects: [], // TODO: Implement status effects tracking
    } satisfies PlayerStateMessage);
  }

  /** Find an item in the player's shard inventory by instanceId or itemId. */
  private findInInventory(
    player: PlayerState,
    itemId: string,
  ): { item: { id: string; name: string; weight: number; description: string }; quantity: number } | null {
    // Try direct itemId match
    const entry = player.inventory.get(itemId);
    if (entry) return entry;

    // Try matching by instanceId pattern
    for (const [, e] of player.inventory) {
      if (e.item.id === itemId) return e;
    }
    return null;
  }

  /** Convert a shard inventory entry to StashItemInstance format. */
  private toStashItemInstance(entry: { item: { id: string } }): import('@ellmud/shared').StashItemInstance {
    return {
      instanceId: `shard-${entry.item.id}-${Date.now()}`,
      itemId: entry.item.id,
      durability: null,
      maxDurability: null,
    };
  }

  // ─── Logging ─────────────────────────────────────────────────────────────

  /**
   * Format a player identifier for logs: "CharacterName" (playerId).
   * Falls back to just playerId if character name is not available.
   */
  private playerTag(playerId: string): string {
    const name = this.characterNames.get(playerId);
    return name ? `"${name}" (${playerId})` : `(${playerId})`;
  }

  private log(message: string): void {
    console.log(`[ShardRoom:${this.roomId}] ${message}`);
  }
}

// ─── B7: Fallback Refuge Graph ──────────────────────────────────────────────
// Used when ShardRoom loads in zone mode for 'the-refuge' but no DB data exists.

function createFallbackRefugeGraph(): RoomGraph {
  const rooms = new Map<string, import('../shard/RoomGraph.js').Room>();

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
    type: 'feature_stash',
    exits: new Map<Direction, string>([['west', 'hearth']]),
    items: [],
  });

  rooms.set('training-grounds', {
    id: 'training-grounds',
    name: 'Training Grounds',
    description: 'A cleared space where weapons ring against practice dummies. Scratched tally marks cover the walls.',
    type: 'feature_training',
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
    type: 'feature_shardboard',
    exits: new Map<Direction, string>([['east', 'hearth']]),
    items: [],
  });

  rooms.set('market', {
    id: 'market',
    name: 'The Market',
    description: 'Makeshift stalls selling salvaged goods. A gruff quartermaster eyes your coin pouch.',
    type: 'feature_marketplace',
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
    type: 'feature_infirmary',
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
