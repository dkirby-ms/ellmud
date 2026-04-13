import { Room, Client } from '@colyseus/core';
import {
  type CommandMessage,
  type NarrateMessage,
  type RoomHeaderMessage,
  type RoomSwitchMessage,
  type ZoneState as SharedZoneState,
  type ZoneStateMessage,
  type StashItem,
  type ZoneTier,
  type OverlayMessage,
  type PvPKillEvent,
  type EquipItemMessage,
  type UnequipItemMessage,
  type SwapItemMessage,
  type LoadoutUpdateMessage,
  type StashUpdateMessage,
  type InventoryUpdateMessage,
  type DisplayItem,
  type PlayerStateMessage,
  type TelegraphMessage,
  type ZoneTransferMessage,
  type ExploredRoomData,
  type ExplorationDataMessage,
  type ExplorationUpdateMessage,
  type RoomOccupantsMessage,
  type AdminLiveRoomInfo,
  type PlayerListMessage,
  type ToggleFlagMessage,
  type FlagStateMessage,
  isValidFlagName,
  isValidPosture,
  SLOT_ACCEPTS,
  EQUIPMENT_SLOT_ORDER,
  DEATH_PENALTY_DEFAULTS,
  OPPOSITE_DIRECTION,
  POSTURE_MOVEMENT_VERBS,
  MessageTypes,
} from '@ellmud/shared';
import { ZoneState } from '../state.js';
import { parseCommand } from '../commands/parser.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { recordSandboxCombatEvents } from '../commands/handlers/sandbox.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph, type RoomGraph, type Direction } from '../generator/RoomGraph.js';
import { generateZoneGraph } from '../generator/generator.js';
import { adaptRoomGraph } from '../generator/graph-adapter.js';
import { handleLook } from '../commands/handlers/look.js';
import { handleToggleAsync } from '../commands/handlers/toggle.js';
import {
  CombatSystem,
  type TickResult,
  createCombatant,
  classifyEvent,
  batchCombatEvents,
  narrateBatchedEvent,
  DEFAULT_BATCHING_RULES,
} from '../combat/index.js';
import { SoundSystem } from '../sound/index.js';
import { TraceSystem } from '../systems/index.js';
import { AwarenessSystem, type AwarenessPlayer } from '../systems/index.js';
import { DowningSystem, type DowningEvent } from '../systems/DowningSystem.js';
import { GroupManager } from '../systems/GroupManager.js';
import { type DeathPenaltyStore, getDeathPenaltyStore } from '../systems/index.js';
import { type MetricsService, getMetricsService } from '../metrics/index.js';
import {
  NOISE_VALUES,
  SOUND_DESCRIPTIONS,
  type SoundType,
  BLOOD_TRAIL_DAMAGE_THRESHOLD,
  TRACKING_THRESHOLDS,
} from '@ellmud/shared';
import { authenticateClient } from '../auth/colyseus-auth.js';
import { getConfig, getMaxPlayersForTier, getMaxPlayersForZone } from '../config.js';
import { StashService, InMemoryStashRepository, getStashRepository, getItemDefs } from '../stash/index.js';
import type { StashRepository } from '../stash/index.js';
import { transferInventoryToStash } from '../systems/stash-transfer.js';
import type { PlayerInventoryRepository } from '../inventory/index.js';
import { InMemoryPlayerInventoryRepository, getInventoryRepository, inventoryToEntries } from '../inventory/index.js';
import { CreatureManager, DROWNED_REVENANT, type CreatureAction } from '../creatures/index.js';
import type { CreatureWorldState } from '../creatures/behavior.js';
import { createPRNG } from '../generator/prng.js';
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
import { resolvePlayerHubTarget, resolvePlayerHubName } from '../zones/stronghold.js';
import { convertZoneToRoomGraph } from '../zones/zone-adapter.js';
import { getItemDefinition } from '../items/registry.js';
import type { Item } from '../generator/RoomGraph.js';
import type { ExplorationRepository } from '../exploration/index.js';
import { getExplorationRepository } from '../exploration/index.js';
import type { CharacterRepository } from '../character/index.js';
import { InMemoryCharacterRepository, getCharacterRepository, isCharacterPg } from '../character/index.js';
import { grantStarterKit } from '../api/starter-kit.js';
import { createNarrationService } from '../narrative/factory.js';
import type { NarrationService } from '../narrative/NarrationService.js';
import { gatherPlayerList, formatWhoListText, type ZonePlayerData } from '../who/index.js';
import { getCharacterFlagsRepository } from '../db/CharacterFlagsRepository.js';

const TICK_INTERVAL_MS = 1000;

interface ZoneRoomOptions {
  state: ZoneState;
}

/**
 * ZoneRoom — A procedurally generated zone instance.
 *
 * Lifecycle: Always 'open'. Zones are persistent MUD-style.
 *
 * ARCHITECTURAL CONSTRAINT:
 * - NO Schema state is ever synced to clients.
 * - All client communication uses room.send() with typed messages.
 * - The client is a dumb terminal receiving narrated prose only.
 */
export class ZoneRoom extends Room<ZoneRoomOptions> {
  private lifecycle: SharedZoneState = 'open';
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
  private groupManager!: GroupManager;
  private narrationService!: NarrationService;
  private deathPenaltyStore!: DeathPenaltyStore;
  private metricsService!: MetricsService;
  private creatureManager!: CreatureManager;
  private stashService?: StashService;
  private loadoutService?: LoadoutService;
  private inventoryRepo: PlayerInventoryRepository = new InMemoryPlayerInventoryRepository();
  /** Debounce timer for inventory persistence (per-player). */
  private inventorySaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private itemDefs = new Map<string, StashItem>();
  private zoneTier: ZoneTier = 1;
  private profileRepo: PlayerProfileRepository = new InMemoryPlayerProfileRepository();
  private factionRepo: FactionRepository = new InMemoryFactionRepository();
  private runHistoryRepo: RunHistoryRepository = new InMemoryRunHistoryRepository();
  private characterRepo: CharacterRepository = new InMemoryCharacterRepository();
  private explorationRepo: ExplorationRepository = getExplorationRepository();
  /** Tracks when each player joined the zone (for run duration calculation). */
  private playerJoinTimes = new Map<string, number>();
  /** Maps playerId → character name for log formatting. */
  private characterNames = new Map<string, string>();
  /** Maps playerId → faction slug for death routing (cached on join). */
  private playerFactionSlugs = new Map<string, string>();
  /** Maps playerId → character flags (anon, rp) cached on join (Issue #370). */
  private playerFlagsCache = new Map<string, import('@ellmud/shared').CharacterFlags>();

  // ─── Zone-specific fields ──────────────────────────────────────────────────
  private zoneSlug?: string;
  private zoneData?: ZoneData;
  private isZone = false;
  private repopTimer?: ReturnType<typeof setInterval>;
  /** Room IDs with feature_sandbox_arena type — get combat ticks even in dev zones. */
  private sandboxRoomIds = new Set<string>();
  /** Cached zone slugs for fast synchronous lookups (dev tools: goto validation). */
  private knownZoneSlugs = new Set<string>();

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

  /** Inject inventory repository for testing (#409). */
  initInventory(repo?: PlayerInventoryRepository): void {
    this.inventoryRepo = repo ?? new InMemoryPlayerInventoryRepository();
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
    this.setState(new ZoneState());
    this.state.zoneId = this.roomId;
    
    // Parse tier first (needed for max players)
    if (typeof options['tier'] === 'number' && [1, 2, 3].includes(options['tier'])) {
      this.zoneTier = options['tier'] as ZoneTier;
    }
    this.state.tier = this.zoneTier;
    
    // Set tier-based max players
    this.maxClients = getMaxPlayersForTier(this.zoneTier, getConfig());

    if (typeof options['openDelayMs'] === 'number') {
      this.openDelayMs = Math.max(0, options['openDelayMs']);
    }

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
        this.zoneTier = sharedGraph.tier;
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

      // Persistent zones use a high default (100) instead of tier-based limits.
      // Per-zone DB override and env override are respected via getMaxPlayersForZone.
      this.maxClients = getMaxPlayersForZone(getConfig(), zoneData?.zone.maxPlayers);

      this.log(`Zone capacity: ${this.maxClients} max players (zone=${this.zoneSlug})`);

      // Spawn creatures from zone NPC definitions
      if (zoneData) {
        this.creatureManager.spawnCreaturesFromZone(zoneData);
      }
    } else if (options['useTestGraph'] === true) {
      this.roomGraph = createTestRoomGraph();
      this.entryRoomIds = [this.roomGraph.startRoomId]; // Test graph has single entry
    } else if (getConfig().enableProceduralGeneration) {
      const seed = typeof options['seed'] === 'number' ? options['seed'] : Date.now();
      const sharedGraph = generateZoneGraph({ tier: this.zoneTier, seed });
      this.roomGraph = adaptRoomGraph(sharedGraph);
      this.entryRoomIds = sharedGraph.entryRoomIds; // Store all entry points

      // Spawn creatures using a derived seed (distinct from generator's PRNG)
      const creaturePrng = createPRNG(seed + 7919);
      this.creatureManager.spawnCreatures(sharedGraph, DROWNED_REVENANT, creaturePrng);
    } else {
      // Procedural generation disabled — fall back to test graph
      this.roomGraph = createTestRoomGraph();
      this.entryRoomIds = [this.roomGraph.startRoomId];
      this.log('Procedural generation disabled (ENABLE_PROCEDURAL_GENERATION=false) — using fallback graph.');
    }

    // Scan for sandbox arena rooms (get combat ticks even in dev zones)
    for (const [roomId, room] of this.roomGraph.rooms) {
      if (room.type === 'feature_sandbox_arena') {
        this.sandboxRoomIds.add(roomId);
      }
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
    // Initialize group manager (#403 Phase 3)
    this.groupManager = new GroupManager();
    this.deathPenaltyStore = getDeathPenaltyStore();
    this.metricsService = getMetricsService();

    // Initialize narration service (GDD §4 — LLM narration pipeline)
    this.narrationService = createNarrationService();

    // Initialize stash with shared provider if not already injected
    if (!this.stashService) {
      this.initStash(getStashRepository(), getItemDefs());
    }

    // Initialize inventory repo with shared provider if not already injected (#409)
    if (this.inventoryRepo instanceof InMemoryPlayerInventoryRepository) {
      this.inventoryRepo = getInventoryRepository();
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

    // Cache known zone slugs for synchronous goto validation (best-effort, non-blocking)
    getZoneRepository().getAllZones().then((zones) => {
      for (const z of zones) this.knownZoneSlugs.add(z.slug);
    }).catch((err) => {
      this.log(`Failed to cache zone slugs: ${err}`);
    });

    // Register message handlers
    this.onMessage(MessageTypes.COMMAND, (client: Client, message: CommandMessage) => {
      this.handleCommandMessage(client, message);
    });

    // Equipment message handlers (server-authoritative — players can equip mid-zone)
    this.onMessage(MessageTypes.EQUIP_ITEM, (client: Client, message: EquipItemMessage) => {
      void this.handleEquipItem(client, message);
    });

    this.onMessage(MessageTypes.UNEQUIP_ITEM, (client: Client, message: UnequipItemMessage) => {
      void this.handleUnequipItem(client, message);
    });

    this.onMessage(MessageTypes.SWAP_ITEM, (client: Client, message: SwapItemMessage) => {
      void this.handleSwapItem(client, message);
    });

    // Character flags: toggle anon/rp from Settings UI
    this.onMessage(MessageTypes.TOGGLE_FLAG, (client: Client, message: ToggleFlagMessage) => {
      void this.handleToggleFlag(client, message);
    });

    // Who list: client requests the player list via structured message
    this.onMessage(MessageTypes.REQUEST_PLAYER_LIST, (client: Client) => {
      void this.handleRequestPlayerList(client);
    });

    // 1-second tick for all game simulation
    this.setSimulationInterval((deltaTime: number) => this.update(deltaTime), TICK_INTERVAL_MS);

    this.updateMetadata();

    this.log(`ZoneRoom created: ${this.roomId} (tier=${this.zoneTier}, maxPlayers=${this.maxClients}${this.isZone ? `, zone=${this.zoneSlug}` : ''})`);

    // Start repop timer for zone-based rooms
    if (this.isZone) {
      this.startRepopTimer();
    }

    // Begin lifecycle: zones are persistent MUD-style, always 'open'
    this.transitionTo('open');
    this.log('Zone initialized: persistent open state');
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

    // Guard against the same playerId joining twice (double-click / client race condition / browser refresh).
    // If the player is already present, displace the old session rather than corrupting state.
    // Preserve the player's current room so reconnection doesn't reset position (#355).
    let preservedRoomId: string | undefined;
    if (this.players.has(playerId)) {
      const existingState = this.players.get(playerId)!;
      preservedRoomId = existingState.currentRoomId;
      this.log(`Duplicate join detected: ${this.playerTag(playerId)} (new session=${client.sessionId}, room=${preservedRoomId}). Displacing old session.`);

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
      const maxPlayers = this.maxClients ?? getMaxPlayersForTier(this.zoneTier, getConfig());
      if (this.state.playerCount >= maxPlayers) {
        throw new Error(`Instance is full (${maxPlayers}/${maxPlayers} players).`);
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

    // Load faction membership and cache slug for death routing
    try {
      const factionSlug = await this.factionRepo.getPlayerFactionSlug(this.dbPlayerId(playerId));
      if (factionSlug) {
        this.playerFactionSlugs.set(playerId, factionSlug);
        this.log(`Player ${this.playerTag(playerId)} faction: ${factionSlug}`);
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

    // Load character flags (anon, rp) into cache for room visibility (Issue #370)
    try {
      const flagsRepo = getCharacterFlagsRepository();
      const flags = await flagsRepo.getFlags(playerId);
      this.playerFlagsCache.set(playerId, flags);
    } catch (err) {
      this.log(`Failed to load flags for ${this.playerTag(playerId)}: ${err}`);
    }

    // Track join time for run duration calculation
    this.playerJoinTimes.set(playerId, Date.now());

    // Determine entry room based on zone vs instance.
    // If this is a reconnecting player (duplicate join), preserve their current room (#355).
    let startRoom: string;
    if (preservedRoomId && this.roomGraph.rooms.has(preservedRoomId)) {
      startRoom = preservedRoomId;
    } else if (this.isZone) {
      const targetRoom = options['targetRoomSlug'];
      if (typeof targetRoom === 'string' && this.roomGraph.rooms.has(targetRoom)) {
        startRoom = targetRoom;
      } else {
        // Check for last inn location in this zone
        let innRoom: string | undefined;
        try {
          const lastInn = await this.characterRepo.getLastInn(playerId);
          if (lastInn && lastInn.zoneSlug === this.zoneSlug && this.roomGraph.rooms.has(lastInn.roomSlug)) {
            innRoom = lastInn.roomSlug;
          }
        } catch (err) {
          this.log(`Failed to load last inn for ${this.playerTag(playerId)}: ${err}`);
        }
        startRoom = innRoom ?? this.roomGraph.startRoomId;
      }
    } else {
      // Procedural: distribute players across entry points for spatial separation
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

    // Load persisted posture from DB (#371)
    try {
      const savedPosture = await this.characterRepo.loadPosture(playerId);
      if (isValidPosture(savedPosture)) {
        playerState.posture = savedPosture;
      }
    } catch (err) {
      this.log(`Failed to load posture for ${this.playerTag(playerId)}: ${err}`);
    }

    // Grant starter kit to inventory on first zone join (non-fatal)
    try {
      const kitCount = await grantStarterKit(playerId, playerState, this.characterRepo, isCharacterPg());
      if (kitCount > 0) {
        this.log(`Starter kit: granted ${kitCount} item(s) to ${this.playerTag(playerId)}`);
      }
    } catch (err) {
      this.log(`Failed to grant starter kit for ${this.playerTag(playerId)}: ${err}`);
    }

    // Load persisted inventory from DB (#409)
    try {
      const savedItems = await this.inventoryRepo.loadInventory(this.dbPlayerId(playerId));
      for (const entry of savedItems) {
        for (let i = 0; i < entry.quantity; i++) {
          playerState.addItem({
            id: entry.itemId,
            name: entry.name,
            weight: entry.weight,
            description: entry.description,
          });
        }
      }
      if (savedItems.length > 0) {
        this.log(`Loaded ${savedItems.length} inventory item(s) for ${this.playerTag(playerId)}`);
      }
    } catch (err) {
      this.log(`Failed to load inventory for ${this.playerTag(playerId)}: ${err}`);
    }

    this.log(`Player ${this.playerTag(playerId)} joined at ${startRoom} (session=${client.sessionId}, ${this.state.playerCount}/${this.maxClients ?? getMaxPlayersForTier(this.zoneTier, getConfig())} players)`);

    // Send initial system narration using NarrationService (async, don't block join)
    this.generateNarration('event', playerId, startRoom, 'You step through the rift into a fragment of the dying world...')
      .then((text) => {
        this.sendNarrate(client, {
          text,
          type: 'system',
          timestamp: Date.now(),
        });
      })
      .catch((err) => {
        this.log(`Entry narration error: ${err}`);
      });

    // Send initial room look
    const lookResult = handleLook(this.buildCommandContext(playerState, []));
    this.deliverResult(client, lookResult);
    this.sendTraceNarrations(client, startRoom);

    // Send exploration data so client map can render the starting room
    await this.sendExplorationData(client, playerId, startRoom);

    // Send initial room occupants
    this.sendRoomOccupants(client, playerId, startRoom);

    this.sendZoneState(client, {
      state: this.lifecycle,
    });

    // Send initial player state (HP, stamina, status effects, posture)
    // Combatant doesn't exist yet, so we use default stats
    client.send(MessageTypes.PLAYER_STATE, {
      hp: 100, // DEFAULT_PLAYER_STATS.maxHp
      maxHp: 100,
      stamina: 0,
      maxStamina: 0,
      statusEffects: [],
      posture: playerState.posture,
    } satisfies PlayerStateMessage);

    // Send full stash + loadout state to client on join (#377)
    try {
      await this.sendLoadoutAndStashUpdate(client, playerId);
    } catch (err) {
      this.log(`Failed to send equipment state for ${this.playerTag(playerId)}: ${err}`);
    }

    // Send current inventory to client on join
    this.sendInventoryUpdate(client, playerId);
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
        // Notify other players in the room about disconnect status change
        this.broadcastRoomOccupantsUpdate(playerState.currentRoomId);
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
          // Notify other players in the room about reconnection
          this.broadcastRoomOccupantsUpdate(playerState.currentRoomId);
        }
        if (isInCombat) {
          this.combatSystem.clearDisconnected(playerId);
        }

        // Send reconnection confirmation
        this.sendNarrate(client, {
          text: 'Reconnected to the instance.',
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
    this.downingSystem.removePlayer(playerId);
    if (this.players.has(playerId)) {
      // Persist player profile (skills, stats) before cleanup
      await this.savePlayerProfile(playerId, this.players.get(playerId)!);

      // Persist player inventory before cleanup (#409)
      await this.savePlayerInventory(playerId, this.players.get(playerId)!);

      // Record run (player left or timed out)
      await this.recordRunHistory(playerId, this.players.get(playerId), false);

      this.state.playerCount = Math.max(0, this.state.playerCount - 1);
      this.players.delete(playerId);
      this.combatSystem.removeCombatant(playerId);
      this.characterNames.delete(playerId);
      this.playerFactionSlugs.delete(playerId);
      this.playerFlagsCache.delete(playerId);
      this.ownerPlayerIds.delete(playerId);
      this.updateMetadata();
    }
    // Clean up follow relationships on disconnect (#403)
    this.cleanupFollowRelationships(playerId);
    // Clean up group membership on disconnect (#403 Phase 3)
    // If leader disconnects → group disbands; otherwise member is removed.
    this.cleanupGroupMembership(playerId);
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

    // Zones apply death behavior based on config
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
    // Clear any pending inventory save timers (#409)
    for (const timer of this.inventorySaveTimers.values()) {
      clearTimeout(timer);
    }
    this.inventorySaveTimers.clear();
    this.log(`ZoneRoom disposed: ${this.roomId}`);
  }

  // ─── Zone Repop System ──────────────────────────────────────────────────────

  private startRepopTimer(): void {
    if (!this.isZone || !this.zoneData) return;

    const intervalMs = (this.zoneData.zone.repopIntervalSeconds || 300) * 1000;
    this.repopTimer = setInterval(() => this.repopZone(), intervalMs);
  }

  private repopZone(): void {
    if (!this.zoneData) return;

    // Only creatures respawn on repop. Items placed at zone init persist permanently.
    this.creatureManager.respawnZoneCreatures(this.zoneData);
  }

  // ─── Tick System ─────────────────────────────────────────────────────────

  private update(_deltaTime: number): void {
    this.state.tick++;

    // Hub/social/dev zones skip collapse and combat ticking
    const isNonCombatZone = this.isZone && this.zoneData &&
      (this.zoneData.zone.category === 'hub' || this.zoneData.zone.category === 'faction_hub' || this.zoneData.zone.category === 'social' || this.zoneData.zone.category === 'dev');

    // Sandbox arena rooms in dev zones still need combat/creature ticking
    const hasSandboxCombat = isNonCombatZone && this.sandboxRoomIds.size > 0;

    // Creature AI tick — evaluate behavior trees, queue combat actions
    if (!isNonCombatZone || hasSandboxCombat) {
      this.tickCreatures();
    }

    // Resolve combat tick (skip for hub/social/dev zones unless sandbox arena active)
    if ((!isNonCombatZone || hasSandboxCombat) && this.combatSystem.hasActiveEncounters()) {
      const tickResult = this.combatSystem.resolveTick();

      // Capture combat events for sandbox combat log
      if (hasSandboxCombat && tickResult.events.length > 0) {
        recordSandboxCombatEvents(tickResult, this.state.tick);
      }

      // Killing blow: finish off downed (unstabilized) players in rooms with active combat.
      // Runs BEFORE handlePlayerDefeats so newly-downed players aren't instantly killed.
      this.checkKillingBlows(tickResult);

      this.syncCreaturesAfterCombat(tickResult);
      this.deliverCombatResults(tickResult);
      this.recordCombatMetrics(tickResult);

      // Propagate combat sounds to nearby rooms (GDD §12)
      this.propagateCombatSounds(tickResult);

      // Create blood trail traces for combat damage
      this.createCombatTraces(tickResult);
    }

    // Tick downing system — bleed-out timers, stabilize channels
    if (!isNonCombatZone || hasSandboxCombat) {
      this.tickDowningSystem();
    }

    // Decay traces
    this.traceSystem.tick(TICK_INTERVAL_MS);

    // Decay corpses and other time-limited items
    this.tickCorpseDecay();
  }

  // ─── Zone Lifecycle ─────────────────────────────────────────────────────

  private transitionTo(newState: SharedZoneState): void {
    const previousState = this.lifecycle;
    this.lifecycle = newState;
    this.state.lifecycle = newState;
    this.updateMetadata();

    this.log(`Lifecycle: ${previousState} → ${newState}`);

    // Notify all clients of state change
    this.broadcast(MessageTypes.ZONE_STATE, {
      state: newState,
    } satisfies ZoneStateMessage);
  }

  private updateMetadata(): void {
    // Build player list with room locations for matchmaker
    const playerList = Array.from(this.players.entries()).map(([playerId, state]) => ({
      playerId,
      roomId: state.currentRoomId,
    }));

    this.setMetadata({
      tier: this.state.tier,
      lifecycle: this.lifecycle,
      playerCount: this.state.playerCount,
      maxPlayers: this.maxClients ?? getMaxPlayersForTier(this.zoneTier, getConfig()),
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
        text: 'Your presence flickers. You are not fully in this zone.',
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

    // Async command: `who` — requires cross-room matchMaker query + flag loading
    if (verb === 'who') {
      void this.handleWhoCommand(client, playerId, player);
      return;
    }

    // Async command: `toggle` — requires DB read/write to report new state (#432)
    if (verb === 'toggle') {
      void this.handleToggleCommand(client, player, args);
      return;
    }

    const previousRoomId = player.currentRoomId;
    // Capture posture before command execution for movement verb narration (#371)
    const previousPosture = player.posture;

    // Snapshot inventory for loot pickup metrics (take/get/loot commands)
    const trackLoot = verb === 'take' || verb === 'get' || verb === 'loot';
    const prevInventoryIds = trackLoot ? new Set(player.inventory.keys()) : undefined;

    // Snapshot inventory size to detect mutations for INVENTORY_UPDATE
    const prevInventorySize = player.inventory.size;

    const ctx = this.buildCommandContext(player, args);
    const result = handleCommand(verb, ctx);

    // Record loot pickup metrics for newly acquired items (non-blocking)
    if (trackLoot && prevInventoryIds) {
      for (const [itemId, entry] of player.inventory) {
        if (!prevInventoryIds.has(itemId)) {
          this.metricsService.recordLootPickup(this.dbPlayerId(playerId), {
            itemId: entry.item.id,
            itemName: entry.item.name,
            roomId: player.currentRoomId,
            source: verb === 'loot' ? 'corpse' : 'room',
          });
        }
      }
    }

    // Inter-zone exit: send transfer message to client instead of moving locally
    if (result.zoneTransfer) {
      // Defensive: verify target zone is known before sending transfer (prevents disconnect on bad slug)
      if (!this.knownZoneSlugs.has(result.zoneTransfer.targetZoneSlug)) {
        this.sendNarrate(client, {
          text: `No such zone: '${result.zoneTransfer.targetZoneSlug}'.`,
          type: 'system',
          timestamp: Date.now(),
        });
        return;
      }
      this.deliverResult(client, result);
      client.send(MessageTypes.ZONE_TRANSFER, {
        targetZoneSlug: result.zoneTransfer.targetZoneSlug,
        targetRoomSlug: result.zoneTransfer.targetRoomSlug,
      } satisfies ZoneTransferMessage);
      return;
    }

    // Inn rent: persist last inn location and trigger consented leave after brief delay
    if (result.action === 'rent') {
      this.deliverResult(client, result);
      if (this.zoneSlug) {
        this.saveLastInn(playerId, this.zoneSlug, player.currentRoomId).catch((err) => {
          this.log(`Failed to save last inn for ${this.playerTag(playerId)}: ${err}`);
        });
      }
      setTimeout(() => client.leave(4000), 3000);
      return;
    }

    // Trace: movement creates footprints in the room LEFT
    const movedRoom = player.currentRoomId !== previousRoomId;
    let pendingFollowerArrivals: string[] | undefined;
    if (movedRoom) {
      const direction = args[0]?.toLowerCase();
      this.traceSystem.addTrace(previousRoomId, 'footprint', {
        actorId: playerId,
        actorName: playerId,
      }, direction);

      // Broadcast arrival/departure narrations to other players
      this.broadcastPlayerMovement(playerId, previousRoomId, player.currentRoomId, direction, previousPosture);

      // Persist posture reset to DB (#371)
      this.persistPosture(playerId).catch((err) => {
        this.log(`Failed to persist posture reset for ${this.playerTag(playerId)}: ${err}`);
      });

      // Awareness: notify observers in destination room about entering player
      this.runAwarenessChecks(playerId, player.currentRoomId, 'arrival');
      // Awareness: notify observers in source room about departing player
      this.runAwarenessChecks(playerId, previousRoomId, 'departure');

      // Exploration: send map update for the new room
      this.sendExplorationUpdate(client, playerId, player.currentRoomId);

      // Send updated room occupants to the moving player
      this.sendRoomOccupants(client, playerId, player.currentRoomId);

      // Broadcast updated occupants to other players in both rooms
      this.broadcastRoomOccupantsUpdate(previousRoomId);
      this.broadcastRoomOccupantsUpdate(player.currentRoomId);

      // Auto-move followers (#403 Phase 1) — collect names for deferred notification
      const followedNames = this.moveFollowers(playerId, previousRoomId, player.currentRoomId);
      if (followedNames.length > 0) {
        pendingFollowerArrivals = followedNames;
      }
    }

    // Posture commands: broadcast posture change to other players in the room (#371)
    // Uses _postureChange metadata from the command result (single source of truth in posture.ts)
    const postureChange = (result as import('../commands/index.js').CommandResult & { _postureChange?: { characterName: string; message: string } })._postureChange;
    if (postureChange) {
      for (const [sid, ps] of this.players) {
        if (sid !== playerId && ps.currentRoomId === player.currentRoomId) {
          const c = this.findClient(sid);
          if (c) {
            this.sendNarrate(c, { text: postureChange.message, type: 'ambient', timestamp: Date.now() });
          }
        }
      }

      // Sync updated posture to the acting player's status panel (#404)
      this.sendPostureState(client, playerId);

      // Persist posture change to DB
      this.persistPosture(playerId).catch((err) => {
        this.log(`Failed to persist posture for ${this.playerTag(playerId)}: ${err}`);
      });
    }

    // Item interaction broadcasts: notify other players when items are picked up, dropped, or equipped (#390)
    const roomEvent = (result as import('../commands/index.js').CommandResult & { _roomEvent?: string })._roomEvent;
    if (roomEvent) {
      for (const [sid, ps] of this.players) {
        if (sid !== playerId && ps.currentRoomId === player.currentRoomId) {
          const c = this.findClient(sid);
          if (c) {
            this.sendNarrate(c, { text: roomEvent, type: 'ambient', timestamp: Date.now() });
          }
        }
      }
    }

    // Follow system: wire up follower sets when follow/unfollow commands execute (#403)
    const followStarted = (result as import('../commands/index.js').CommandResult & { _followStarted?: { followerId: string; leaderId: string } })._followStarted;
    if (followStarted) {
      const leaderState = this.players.get(followStarted.leaderId);
      if (leaderState) {
        leaderState.addFollower(followStarted.followerId);
      }
    }
    const followStopped = (result as import('../commands/index.js').CommandResult & { _followStopped?: { followerId: string; leaderId: string } })._followStopped;
    if (followStopped) {
      const leaderState = this.players.get(followStopped.leaderId);
      if (leaderState) {
        leaderState.removeFollower(followStopped.followerId);
      }
    }

    // Group system: handle group events and gsay broadcasts (#403 Phase 3)
    const groupEvent = (result as import('../commands/index.js').CommandResult & {
      _groupEvent?: { type: string; groupId: string; memberIds?: string[]; targetId?: string; message: string };
    })._groupEvent;
    if (groupEvent) {
      const targetIds = groupEvent.memberIds ?? [];
      for (const memberId of targetIds) {
        if (memberId === playerId) continue;
        const memberClient = this.findClient(memberId);
        if (memberClient) {
          this.sendNarrate(memberClient, {
            text: groupEvent.message,
            type: 'system',
            timestamp: Date.now(),
          });
        }
      }
    }

    const gsay = (result as import('../commands/index.js').CommandResult & {
      _gsay?: { groupId: string; senderId: string; senderName: string; message: string; memberIds: string[] };
    })._gsay;
    if (gsay) {
      for (const memberId of gsay.memberIds) {
        if (memberId === playerId) continue;
        const memberClient = this.findClient(memberId);
        if (memberClient) {
          this.sendNarrate(memberClient, {
            text: `[Group] ${gsay.senderName} says: ${gsay.message}`,
            type: 'speech',
            timestamp: Date.now(),
          });
        }
      }
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

    // Send deferred follower arrival notifications AFTER the leader's room description
    if (pendingFollowerArrivals) {
      for (const followerName of pendingFollowerArrivals) {
        this.sendNarrate(client, { text: `${followerName} follows you.`, type: 'ambient', timestamp: Date.now() });
      }
    }

    // Deliver targeted narrations (e.g., teleport notification to the moved player)
    if (result.targetNarrations) {
      const targetClient = this.clients.find((c) => c.sessionId === result.targetNarrations!.sessionId);
      if (targetClient) {
        for (const narration of result.targetNarrations.narrations) {
          this.sendNarrate(targetClient, {
            text: narration.text,
            type: narration.type,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Trace: send trace narrations on room entry or "look"
    if (movedRoom || verb === 'look') {
      this.sendTraceNarrations(client, player.currentRoomId);
    }

    // Send inventory update if inventory changed during command execution
    if (player.inventory.size !== prevInventorySize) {
      this.sendInventoryUpdate(client, playerId);
      // Debounced save to persistence (#409)
      this.debouncedInventorySave(playerId, player);
    }
  }

  private buildCommandContext(player: PlayerState, args: string[]): CommandContext {
    const room = this.roomGraph.rooms.get(player.currentRoomId)!;
    const otherPlayersInRoom: string[] = [];
    const otherPlayerInfo: import('../commands/index.js').PlayerRef[] = [];
    for (const [sid, ps] of this.players) {
      if (sid !== player.sessionId && ps.currentRoomId === player.currentRoomId) {
        otherPlayersInRoom.push(sid);
        const name = this.characterNames.get(sid) ?? 'A wanderer';
        const flags = this.playerFlagsCache.get(sid);
        otherPlayerInfo.push({ sessionId: sid, name, anon: flags?.anon === true, posture: ps.posture, followingPlayerId: ps.followingPlayerId, allowFollowing: flags?.allowFollowing !== false });
      }
    }

    const creaturesInRoom = this.creatureManager.getCreaturesInRoom(player.currentRoomId)
      .map(c => ({
        id: c.id, name: c.name, type: c.type, roomDescription: c.roomDescription,
        hp: c.hp, maxHp: c.maxHp, attack: c.attack, defence: c.defence,
        armour: c.armour, agility: c.agility, dodgeSkillRank: c.dodgeSkillRank,
      }));

    return {
      player,
      room,
      args,
      resolveRoom: (roomId: string) => this.roomGraph.rooms.get(roomId),
      otherPlayersInRoom,
      otherPlayerInfo,
      resolvePlayersInRoom: (roomId: string) => {
        const result: import('../commands/index.js').PlayerRef[] = [];
        for (const [sid, ps] of this.players) {
          if (sid !== player.sessionId && ps.currentRoomId === roomId) {
            const name = this.characterNames.get(sid) ?? 'A wanderer';
            const flags = this.playerFlagsCache.get(sid);
            result.push({ sessionId: sid, name, anon: flags?.anon === true, posture: ps.posture, followingPlayerId: ps.followingPlayerId, allowFollowing: flags?.allowFollowing !== false });
          }
        }
        return result;
      },
      stability: this.state.stability,
      characterName: this.characterNames.get(player.sessionId),
      combatSystem: this.combatSystem,
      downingSystem: this.downingSystem,
      creaturesInRoom,
      resolveCreaturesInRoom: (roomId: string) =>
        this.creatureManager.getCreaturesInRoom(roomId)
          .map(c => ({
            id: c.id, name: c.name, type: c.type, roomDescription: c.roomDescription,
            hp: c.hp, maxHp: c.maxHp, attack: c.attack, defence: c.defence,
            armour: c.armour, agility: c.agility, dodgeSkillRank: c.dodgeSkillRank,
          })),
      creatureManager: this.creatureManager,
      resolveZoneExists: (slug: string) => this.knownZoneSlugs.has(slug),
      resolvePlayerByName: (name: string) => {
        const lower = name.toLowerCase();
        for (const [sid, ps] of this.players) {
          const charName = this.characterNames.get(sid);
          if (charName && charName.toLowerCase() === lower) {
            return { sessionId: sid, player: ps, characterName: charName };
          }
        }
        return undefined;
      },
      resolvePlayerById: (sessionId: string) => {
        const ps = this.players.get(sessionId);
        if (!ps) return undefined;
        const charName = this.characterNames.get(sessionId) ?? 'Unknown';
        return { player: ps, characterName: charName };
      },
      groupManager: this.groupManager,
    };
  }

  private deliverResult(client: Client, result: import('../commands/index.js').CommandResult): void {
    // Send room header before narrations so the yellow header appears first
    if (result.roomHeader) {
      const { roomSlug, ...rest } = result.roomHeader;
      const header: RoomHeaderMessage = {
        ...rest,
        ...(this.isZone && this.zoneData ? { zoneName: this.zoneData.zone.name } : {}),
        ...(roomSlug && getConfig().devModeEnabled ? { roomSlug } : {}),
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
    // Send structured help data for modal rendering
    if (result.helpData) {
      client.send(MessageTypes.HELP_DATA, result.helpData);
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

    // Send telegraph messages (GDD §6.5)
    if (tickResult.telegraphs && tickResult.telegraphs.length > 0) {
      for (const telegraph of tickResult.telegraphs) {
        // Broadcast telegraph to all players in the encounter
        this.broadcast(MessageTypes.TELEGRAPH, {
          creatureId: telegraph.creatureId,
          creatureName: telegraph.creatureName,
          abilityName: telegraph.abilityName,
          remainingTicks: telegraph.remainingTicks,
          targetId: telegraph.targetId,
          telegraphText: telegraph.telegraphText,
        } satisfies TelegraphMessage);

        // Also send a narration for the initial wind-up
        if (telegraph.remainingTicks === (telegraph.remainingTicks)) {
          this.broadcast(MessageTypes.NARRATE, {
            text: telegraph.telegraphText,
            type: 'combat',
            timestamp: Date.now(),
          } satisfies NarrateMessage);
        }
      }
    }

    // Classify and batch events per GDD §6.6
    const classifiedEvents = tickResult.events.map(event => {
      const isPlayerActor = this.players.has(event.actorId);
      const isPlayerTarget = event.targetId ? this.players.has(event.targetId) : false;
      
      return classifyEvent(event, isPlayerActor, isPlayerTarget);
    });

    // Apply temporal micro-batching (single tick = 50-150ms temporal window)
    const batchedEvents = batchCombatEvents(classifiedEvents, DEFAULT_BATCHING_RULES);

    // Send batched combat narrations to all clients
    for (const batched of batchedEvents) {
      const narrationText = narrateBatchedEvent(batched);
      
      this.broadcast(MessageTypes.NARRATE, {
        text: narrationText,
        type: 'combat',
        timestamp: Date.now(),
        combatEvent: {
          eventType: batched.event.type,
          actorId: batched.event.actorId,
          targetId: batched.event.targetId,
          signalClass: batched.event.signalClass,
          icon: batched.event.icon,
        },
      } satisfies NarrateMessage);
    }

    // Track players who took damage (from original events, not batched)
    for (const event of tickResult.events) {
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

  // ─── Follow System (#403 Phase 1) ─────────────────────────────────────────

  /**
   * Auto-move all followers when a leader moves rooms.
   * Each follower sees the room description and other players are notified.
   * Returns names of followers who moved (for deferred leader notifications).
   */
  private moveFollowers(leaderId: string, fromRoomId: string, toRoomId: string): string[] {
    const leaderState = this.players.get(leaderId);
    if (!leaderState || leaderState.followers.size === 0) return [];

    const leaderName = this.characterNames.get(leaderId) ?? 'Someone';
    const movedFollowerNames: string[] = [];
    const leaderExclude = new Set([leaderId]);

    for (const followerId of leaderState.followers) {
      const followerState = this.players.get(followerId);
      if (!followerState) continue;
      // Only move followers who are in the same room the leader left
      if (followerState.currentRoomId !== fromRoomId) continue;
      // Skip downed/dead followers — they can't move (#412)
      if (this.downingSystem.isPlayerDowned(followerId)) continue;

      const followerPreviousRoom = followerState.currentRoomId;
      followerState.currentRoomId = toRoomId;
      followerState.posture = 'standing';

      const followerClient = this.findClient(followerId);
      const followerName = this.characterNames.get(followerId) ?? 'Someone';

      // Notify the follower about the move
      if (followerClient) {
        const targetRoom = this.roomGraph.rooms.get(toRoomId);
        if (targetRoom) {
          const exitList = Array.from(targetRoom.exits.keys()).join(', ') || 'none';
          const lines = [
            `You follow ${leaderName}.`,
            '',
            targetRoom.description,
            '',
            `Exits: ${exitList}`,
          ];

          // Show other players in the destination room
          const playersInTarget = this.getVisiblePlayersInRoom(toRoomId, followerId);
          for (const p of playersInTarget) {
            lines.push(`${p.name} is here.`);
          }

          this.deliverResult(followerClient, {
            narrations: [{ text: lines.join('\n'), type: 'room' }],
            roomHeader: {
              roomName: targetRoom.name,
              roomSlug: targetRoom.id,
              exits: Array.from(targetRoom.exits.keys()),
              stability: this.state.stability,
            },
          });
        }

        this.sendExplorationUpdate(followerClient, followerId, toRoomId);
        this.sendRoomOccupants(followerClient, followerId, toRoomId);
      }

      // Broadcast departure/arrival to other players (exclude leader from generic arrival)
      this.broadcastPlayerMovement(followerId, followerPreviousRoom, toRoomId, undefined, followerState.posture, leaderExclude);
      this.broadcastRoomOccupantsUpdate(followerPreviousRoom);
      this.broadcastRoomOccupantsUpdate(toRoomId);

      // Notify departure room that follower left following leader
      for (const [sid, ps] of this.players) {
        if (sid !== followerId && sid !== leaderId && ps.currentRoomId === followerPreviousRoom) {
          const c = this.findClient(sid);
          if (c) {
            this.sendNarrate(c, { text: `${followerName} follows ${leaderName}.`, type: 'ambient', timestamp: Date.now() });
          }
        }
      }

      movedFollowerNames.push(followerName);
    }

    return movedFollowerNames;
  }

  /** Get visible (non-anon) players in a room, excluding a specific player. */
  private getVisiblePlayersInRoom(roomId: string, excludeId: string): Array<{ name: string }> {
    const result: Array<{ name: string }> = [];
    for (const [sid, ps] of this.players) {
      if (sid !== excludeId && ps.currentRoomId === roomId) {
        const flags = this.playerFlagsCache.get(sid);
        if (!flags?.anon) {
          result.push({ name: this.characterNames.get(sid) ?? 'A wanderer' });
        }
      }
    }
    return result;
  }

  /**
   * Clean up all follow relationships when a player disconnects or leaves.
   * - If the departing player was following someone, remove them from that leader's follower set.
   * - If the departing player had followers, stop all of them from following.
   */
  private cleanupFollowRelationships(playerId: string): void {
    // Get the player state before it might be deleted
    // (onLeave deletes from this.players before calling cleanup, so we iterate all players)
    
    // Remove this player from any leader's follower set
    for (const [, ps] of this.players) {
      ps.followers.delete(playerId);
    }

    // If any players were following the departing player, stop them and notify
    for (const [followerId, followerState] of this.players) {
      if (followerState.followingPlayerId === playerId) {
        followerState.stopFollowing();
        const followerClient = this.findClient(followerId);
        if (followerClient) {
          const leaderName = this.characterNames.get(playerId) ?? 'Someone';
          this.sendNarrate(followerClient, {
            text: `${leaderName} has left. You stop following.`,
            type: 'system',
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  /**
   * Clean up group membership when a player disconnects or leaves (#403 Phase 3).
   * If the departing player was the leader, the entire group disbands.
   * If they were a regular member, they're removed and members are notified.
   */
  private cleanupGroupMembership(playerId: string): void {
    const result = this.groupManager.handlePlayerLeave(playerId);
    if (!result) return;

    const playerName = this.characterNames.get(playerId) ?? 'Someone';

    if (result.disbanded) {
      // Leader left or group too small — notify all remaining members
      for (const member of result.members) {
        if (member.sessionId === playerId) continue;
        const memberPlayer = this.players.get(member.sessionId);
        if (memberPlayer) {
          memberPlayer.groupId = null;
        }
        const memberClient = this.findClient(member.sessionId);
        if (memberClient) {
          this.sendNarrate(memberClient, {
            text: `${playerName} has left. The group has been disbanded.`,
            type: 'system',
            timestamp: Date.now(),
          });
        }
      }
    } else {
      // Regular member left — notify remaining group members
      const group = this.groupManager.getGroup(result.members[0]?.sessionId ?? '');
      if (group) {
        for (const member of group.members.values()) {
          if (member.sessionId === playerId) continue;
          const memberClient = this.findClient(member.sessionId);
          if (memberClient) {
            this.sendNarrate(memberClient, {
              text: `${playerName} has left the group.`,
              type: 'system',
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    // Clear groupId on the departing player's state (if still available)
    const departingPlayer = this.players.get(playerId);
    if (departingPlayer) {
      departingPlayer.groupId = null;
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

  private sendOverlayState(client: Client, msg: OverlayMessage): void {
    client.send(MessageTypes.OVERLAY_STATE, msg);
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

  /** Record per-player combat stats from this tick's events (non-blocking). */
  private recordCombatMetrics(tickResult: TickResult): void {
    // Aggregate per-player stats from strike events this tick
    const stats = new Map<string, { roomId: string; dealt: number; taken: number; hits: number; misses: number }>();

    for (const event of tickResult.events) {
      if (event.type !== 'strike') continue;

      // Attacker stats (damage dealt, hit/miss)
      if (event.actorId && !event.actorId.startsWith('creature-')) {
        let s = stats.get(event.actorId);
        if (!s) { s = { roomId: '', dealt: 0, taken: 0, hits: 0, misses: 0 }; stats.set(event.actorId, s); }
        const combatant = this.combatSystem.getCombatant(event.actorId);
        if (combatant) s.roomId = combatant.roomId;
        if (event.dodged) {
          s.misses++;
        } else {
          s.dealt += event.damage ?? 0;
          s.hits++;
        }
      }

      // Target stats (damage taken)
      if (event.targetId && !event.targetId.startsWith('creature-') && !event.dodged) {
        let s = stats.get(event.targetId);
        if (!s) { s = { roomId: '', dealt: 0, taken: 0, hits: 0, misses: 0 }; stats.set(event.targetId, s); }
        const combatant = this.combatSystem.getCombatant(event.targetId);
        if (combatant) s.roomId = combatant.roomId;
        s.taken += event.damage ?? 0;
      }
    }

    // Fire off one metric event per player who participated
    for (const [playerId, s] of stats) {
      this.metricsService.recordCombatStats(this.dbPlayerId(playerId), {
        roomId: s.roomId,
        damageDealt: s.dealt,
        damageTaken: s.taken,
        hits: s.hits,
        misses: s.misses,
      });
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


  /**
   * Transfer a player's zone inventory into their persistent stash.
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

    const combatantsInCombat = new Set<string>();
    return { playersInRoom, roomExits, noisyRooms, combatantsInCombat };
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
          const positionType = this.creatureManager.getCreaturePositionType(creature.id);
          this.combatSystem.registerCombatant(this.creatureManager.toCombatant(creature), positionType);
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

      case 'combat_telegraph': {
        // Handle telegraphed ability (GDD §6.5)
        const targetId = action.targetCombatantId;
        const abilityId = action.abilityId;
        if (!targetId || !abilityId) break;
        
        // Skip combat initiation against peaceful players
        const targetPlayer = this.players.get(targetId);
        if (targetPlayer?.peaceful) break;

        // Find the ability definition from creature template
        const ability = creature.abilities?.find(a => a.id === abilityId);
        if (!ability) {
          console.warn(`[ZoneRoom] Creature ${creature.id} tried to telegraph unknown ability ${abilityId}`);
          break;
        }

        // Register creature as combatant if needed
        if (!this.combatSystem.getCombatant(creature.id)) {
          const positionType = this.creatureManager.getCreaturePositionType(creature.id);
          this.combatSystem.registerCombatant(this.creatureManager.toCombatant(creature), positionType);
        }
        // Register target player as combatant if needed
        if (!this.combatSystem.getCombatant(targetId)) {
          const player = this.players.get(targetId);
          if (player) {
            const displayName = this.characterNames.get(player.sessionId) ?? player.sessionId;
            this.combatSystem.registerCombatant(
              createCombatant(player.sessionId, displayName, player.currentRoomId, true),
            );
          }
        }

        // Initiate combat if not already in combat
        if (!this.combatSystem.isInCombat(creature.id)) {
          this.combatSystem.initiateCombat(creature.id, targetId);
        }

        // Queue the telegraphed ability
        this.combatSystem.queueTelegraph(creature.id, targetId, ability);
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
      // Broadcast arrival/departure narrations to players in affected rooms
      case 'patrol_move':
      case 'alert_move': {
        if (action.targetRoomId && action.sourceRoomId) {
          this.broadcastCreatureMovement(creature, action.sourceRoomId, action.targetRoomId);
        }
        break;
      }
    }
  }

  /**
   * Broadcast creature arrival/departure narrations when a creature moves between rooms.
   * Players in the target room see "A {name} arrives from the {direction}."
   * Players in the source room see "A {name} leaves to the {direction}."
   */
  private broadcastCreatureMovement(
    creature: import('../creatures/types.js').Creature,
    sourceRoomId: string,
    targetRoomId: string,
  ): void {
    const targetRoom = this.roomGraph.rooms.get(targetRoomId);
    const sourceRoom = this.roomGraph.rooms.get(sourceRoomId);

    // Find which direction the creature arrived FROM (from target room's perspective)
    if (targetRoom) {
      let fromDirection: string | undefined;
      for (const [dir, exitId] of targetRoom.exits) {
        if (exitId === sourceRoomId) {
          fromDirection = dir;
          break;
        }
      }

      const arrivalText = fromDirection
        ? `A ${creature.name} arrives from the ${fromDirection}.`
        : `A ${creature.name} arrives.`;

      this.broadcastToRoom(targetRoomId, {
        narrations: [{ text: arrivalText, type: 'ambient' }],
      });
    }

    // Find which direction the creature left TO (from source room's perspective)
    if (sourceRoom) {
      let toDirection: string | undefined;
      for (const [dir, exitId] of sourceRoom.exits) {
        if (exitId === targetRoomId) {
          toDirection = dir;
          break;
        }
      }

      const departureText = toDirection
        ? `A ${creature.name} leaves to the ${toDirection}.`
        : `A ${creature.name} leaves.`;

      this.broadcastToRoom(sourceRoomId, {
        narrations: [{ text: departureText, type: 'ambient' }],
      });
    }

    // Send updated room occupants to all players in both rooms
    this.broadcastRoomOccupantsUpdate(targetRoomId);
    this.broadcastRoomOccupantsUpdate(sourceRoomId);
  }

  /**
   * Broadcast player arrival/departure narrations when a player moves between rooms.
   * Other players in the target room see "{Name} arrives from the {direction}."
   * Other players in the source room see "{Name} leaves to the {direction}."
   */
  private broadcastPlayerMovement(
    playerId: string,
    sourceRoomId: string,
    targetRoomId: string,
    direction?: string,
    posture?: import('@ellmud/shared').Posture,
    excludeFromArrivalIds?: Set<string>,
  ): void {
    const name = this.characterNames.get(playerId) ?? 'A wanderer';

    // Use posture-aware movement verbs for departure (#371)
    const moveVerb = posture ? POSTURE_MOVEMENT_VERBS[posture] : 'walks';

    // Departure: tell players in the source room
    const departureText = direction
      ? `${name} ${moveVerb} ${direction}.`
      : `${name} leaves.`;
    for (const [sid, ps] of this.players) {
      if (sid !== playerId && ps.currentRoomId === sourceRoomId) {
        const c = this.findClient(sid);
        if (c) {
          this.sendNarrate(c, { text: departureText, type: 'ambient', timestamp: Date.now() });
        }
      }
    }

    // Arrival: tell players in the target room
    const fromDirection = direction ? OPPOSITE_DIRECTION[direction as Direction] : undefined;
    const arrivalText = fromDirection
      ? `${name} arrives from the ${fromDirection}.`
      : `${name} arrives.`;
    for (const [sid, ps] of this.players) {
      if (sid !== playerId && ps.currentRoomId === targetRoomId) {
        if (excludeFromArrivalIds?.has(sid)) continue;
        const c = this.findClient(sid);
        if (c) {
          this.sendNarrate(c, { text: arrivalText, type: 'ambient', timestamp: Date.now() });
        }
      }
    }
  }

  private syncCreaturesAfterCombat(tickResult: TickResult): void {
    // Handle creature deaths FIRST — drop loot before syncing marks them dead
    for (const event of tickResult.events) {
      if (event.type === 'defeated' && event.actorId.startsWith('creature-')) {
        const creature = this.creatureManager.getCreature(event.actorId);
        const isSandboxCreature = creature?.sandbox === true;

        const loot = this.creatureManager.removeCreature(event.actorId);
        const combatant = this.combatSystem.getCombatant(event.actorId);
        const roomId = combatant?.roomId;

        // Sandbox creatures: skip loot drops, XP, run history
        if (!isSandboxCreature && roomId && loot.length > 0) {
          const room = this.roomGraph.rooms.get(roomId);
          if (room) {
            // Create a corpse container item containing the loot
            const corpseItem: import('../generator/RoomGraph.js').Item = {
              id: `corpse-${event.actorId}`,
              name: `corpse of ${event.actorName}`,
              weight: 10, // Corpse base weight
              description: `The remains of a ${event.actorName}.`,
              roomDescription: `The corpse of a ${event.actorName} lies here.`,
              containerContents: loot.map(item => ({
                definitionId: item.itemId ?? item.id,
                quantity: 1,
                durability: null,
              })),
              createdAt: Date.now(),
              ttlSeconds: 300, // 5 minutes for creature corpses
              noTake: true,
            };

            room.items.push(corpseItem);

            // Narrate corpse creation to players in room
            for (const [sid, ps] of this.players) {
              if (ps.currentRoomId === roomId) {
                const client = this.findClient(sid);
                if (client) {
                  this.sendNarrate(client, {
                    text: `${event.actorName} collapses, leaving behind a corpse.`,
                    type: 'combat',
                    timestamp: Date.now(),
                  });
                }
              }
            }
          }
        }
        this.combatSystem.removeCombatant(event.actorId);

        // Record kill metrics for each player who contributed (non-blocking, skip sandbox)
        if (!isSandboxCreature && event.killerIds) {
          for (const killerId of event.killerIds) {
            if (killerId.startsWith('creature-')) continue;
            const killerDbId = this.dbPlayerId(killerId);
            this.metricsService.recordKill(killerDbId, {
              victimId: event.actorId,
              victimName: event.actorName,
              roomId: roomId ?? 'unknown',
              isCreature: true,
            });
          }
        }

        // Trace: creature death creates corpse trace (skip for sandbox)
        if (roomId && !isSandboxCreature) {
          this.traceSystem.addTrace(roomId, 'corpse', {
            actorId: event.actorId,
            actorName: event.actorName,
          });
        }

        if (roomId) {
          // Send updated room occupants to all players in the room
          this.broadcastRoomOccupantsUpdate(roomId);

          // Sandbox: narrate defeat without loot
          if (isSandboxCreature) {
            for (const [sid, ps] of this.players) {
              if (ps.currentRoomId === roomId) {
                const client = this.findClient(sid);
                if (client) {
                  this.sendNarrate(client, {
                    text: `The ${event.actorName} is defeated. (sandbox — no loot)`,
                    type: 'combat',
                    timestamp: Date.now(),
                  });
                }
              }
            }
          }
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
   * In sandbox arena rooms, skip downed state and auto-revive the player.
   */
  private handlePlayerDefeats(tickResult: TickResult): void {
    for (const event of tickResult.events) {
      if (event.type !== 'defeated' || event.actorId.startsWith('creature-')) continue;

      const playerId = event.actorId;
      const player = this.players.get(playerId);
      if (!player) continue;

      const roomId = player.currentRoomId;

      // Sandbox arena: skip death penalty, auto-revive at 1 HP
      if (this.sandboxRoomIds.has(roomId)) {
        this.log(`Sandbox auto-revive: ${this.playerTag(playerId)} in ${roomId}`);
        this.combatSystem.removeCombatant(playerId);

        // Restore combatant HP to 1 so the player can keep testing
        const combatant = this.combatSystem.getCombatant(playerId);
        if (combatant) {
          combatant.hp = 1;
        }

        const client = this.findClient(playerId);
        if (client) {
          this.sendNarrate(client, {
            text: 'You fall — but the sandbox catches you. You rise again at 1 HP. Use "sandbox heal" to restore fully.',
            type: 'system',
            timestamp: Date.now(),
          });
        }
        continue;
      }

      // Enter downed state instead of dying immediately
      this.downingSystem.downPlayer(playerId, event.actorName, roomId, event.killerIds);
      this.log(`Player ${this.playerTag(playerId)} downed in ${roomId}`);

      // Notify the downed player
      const client = this.findClient(playerId);
      if (client) {
        this.sendOverlayState(client, {
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
   * Decay corpses and other time-limited items.
   * Sweeps all rooms and removes items that have exceeded their TTL.
   */
  private tickCorpseDecay(): void {
    const now = Date.now();
    for (const [, room] of this.roomGraph.rooms) {
      if (!room.items || room.items.length === 0) continue;

      // Filter out items that have expired
      const before = room.items.length;
      room.items = room.items.filter(item => {
        if (item.createdAt !== undefined && item.ttlSeconds !== undefined) {
          const age = (now - item.createdAt) / 1000; // Convert to seconds
          return age < item.ttlSeconds;
        }
        return true; // Keep items without TTL
      });

      // Log if any items decayed
      if (room.items.length < before) {
        this.log(`Decayed ${before - room.items.length} item(s) in room ${room.id}`);
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
   * Creates lootable corpse with non-soulbound items, applies death penalty,
   * emits PvPKillEvent, and schedules return to refuge.
   *
   * GDD §6.5, §6.8 — Corpse/Loot-on-Death
   */
  private async handlePlayerDeath(playerId: string, playerName: string, roomId: string, killerIds?: string[]): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;

    // Break follow relationships on death (#413)
    this.cleanupFollowRelationships(playerId);
    // Break group membership on death (#403 Phase 3)
    this.cleanupGroupMembership(playerId);

    const room = this.roomGraph.rooms.get(roomId);

    // PvP detection: any non-creature attacker means this was a PvP kill
    const isPvPKill = (killerIds ?? []).some(id => !id.startsWith('creature-'));

    // Separate inventory into soulbound (kept) and non-soulbound (dropped into corpse)
    const corpseItems: Item[] = [];
    const keptItemIds: string[] = [];

    for (const [, entry] of player.inventory) {
      const def = getItemDefinition(entry.item.id);
      const isSoulbound = def?.soulbound ?? false;

      for (let i = 0; i < entry.quantity; i++) {
        if (isSoulbound) {
          keptItemIds.push(entry.item.id);
        } else {
          corpseItems.push(entry.item);
        }
      }
    }

    // Equipped items also drop into corpse unless soulbound (#409 Phase 3)
    const keptEquipSlots: string[] = [];
    for (const [slot, item] of player.getEquippedItems()) {
      const def = getItemDefinition(item.id);
      const isSoulbound = def?.soulbound ?? false;
      if (isSoulbound) {
        keptEquipSlots.push(slot);
      } else {
        corpseItems.push(item);
      }
    }

    // Clear inventory, then re-add soulbound items
    player.inventory.clear();
    for (const itemId of keptItemIds) {
      const def = getItemDefinition(itemId);
      if (def) {
        player.addItem({ id: def.id, name: def.name, weight: def.weight, description: def.description });
      }
    }

    // Persist inventory after death (only soulbound items remain) (#409)
    await this.savePlayerInventory(playerId, player);

    // Clear equipped loadout — gear is lost on death (both in-memory and repo)
    player.clearAllEquippedItems();
    player.equipment = undefined;
    if (this.loadoutService) {
      this.loadoutService.clearLoadout(this.dbPlayerId(playerId)).catch((err) => {
        this.log(`Failed to clear loadout on death for ${this.playerTag(playerId)}: ${err}`);
      });
    }

    // Create lootable corpse container item with non-soulbound items (GDD §6.8)
    const charName = this.characterNames.get(playerId) ?? playerName;
    if (room && corpseItems.length > 0) {
      const playerCorpseItem: import('../generator/RoomGraph.js').Item = {
        id: `corpse-${playerId}`,
        name: `corpse of ${charName}`,
        weight: 10, // Corpse base weight
        description: `The remains of ${charName}.`,
        roomDescription: `The corpse of ${charName} lies here.`,
        containerContents: corpseItems.map(item => ({
          definitionId: item.id,
          quantity: 1,
          durability: null,
        })),
        createdAt: Date.now(),
        ttlSeconds: 600, // 10 minutes for player corpses (longer than creatures)
        noTake: true,
      };

      room.items.push(playerCorpseItem);
    }

    // Trace: player death creates corpse trace (visual marker)
    this.traceSystem.addTrace(roomId, 'corpse', {
      actorId: playerId,
      actorName: charName,
    });

    // Apply death penalty (increment death count, record time)
    const deathDbId = this.dbPlayerId(playerId);
    void this.deathPenaltyStore.incrementDeathCount(deathDbId).then((newCount: number) => {
      void this.deathPenaltyStore.setLastDeathTime(deathDbId, Date.now());
      this.log(`Death penalty: ${this.playerTag(playerId)} death count now ${newCount}`);
    });

    // Record death metric (non-blocking)
    this.metricsService.recordDeath(deathDbId, {
      roomId,
      killerIds,
      isPvP: isPvPKill,
      itemsLost: corpseItems.length,
    });

    // Apply death penalty debuff to player state (on any death)
    player.deathPenalty = {
      appliedAt: Date.now(),
      durationMs: DEATH_PENALTY_DEFAULTS.durationMs,
      attackPenalty: DEATH_PENALTY_DEFAULTS.attackPenalty,
      defencePenalty: DEATH_PENALTY_DEFAULTS.defencePenalty,
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

        // Record PvP kill metric (non-blocking)
        this.metricsService.recordKill(this.dbPlayerId(killerId), {
          victimId: playerId,
          victimName: playerName,
          roomId,
          isCreature: false,
        });
      }
    }

    // Narrate corpse creation to other players in the room
    if (corpseItems.length > 0 && room) {
      for (const [sid, ps] of this.players) {
        if (sid === playerId || ps.currentRoomId !== roomId) continue;
        const otherClient = this.findClient(sid);
        if (otherClient) {
          this.sendNarrate(otherClient, {
            text: `${charName} falls, leaving behind a lootable corpse.`,
            type: 'room',
            timestamp: Date.now(),
          });
        }
      }
    }

    // Send death state to the defeated player
    const client = this.findClient(playerId);
    if (client) {
      // Resolve respawn location: last rented inn → faction hub → default hub
      let respawnTarget: string;
      let respawnName: string;
      let respawnRoomSlug: string | undefined;

      let lastInn: { zoneSlug: string; roomSlug: string } | null = null;
      try {
        lastInn = await this.characterRepo.getLastInn(playerId);
      } catch (err) {
        this.log(`Failed to load last inn for ${this.playerTag(playerId)}: ${err}`);
      }

      if (lastInn) {
        respawnTarget = `zone:${lastInn.zoneSlug}`;
        respawnName = 'your rented room';
        respawnRoomSlug = lastInn.roomSlug;
      } else {
        const factionSlug = this.playerFactionSlugs.get(playerId);
        respawnTarget = resolvePlayerHubTarget(factionSlug);
        respawnName = resolvePlayerHubName(factionSlug);
      }

      this.sendOverlayState(client, {
        playerId,
        state: 'death',
        narration: isPvPKill
          ? `A rival adventurer fells you. You awaken in ${respawnName}, bearing the death penalty…`
          : `The darkness claims you. You awaken in ${respawnName}, weakened by the death penalty…`,
        timestamp: Date.now(),
      });

      // Schedule return to respawn location after 3 seconds
      this.clock.setTimeout(async () => {
        if (!this.players.has(playerId)) {
          this.log(`Player ${this.playerTag(playerId)} already left during death delay — skipping cleanup`);
          return;
        }

        // Persist cleared profile (equipment=undefined) before removing from state.
        // Without this, onLeave skips savePlayerProfile because the player is
        // already deleted, and the stale equipment survives in the profile repo.
        await this.savePlayerProfile(playerId, this.players.get(playerId)!);

        const roomSwitch: RoomSwitchMessage = {
          target: respawnTarget,
          reason: 'player_death',
        };
        if (respawnRoomSlug) {
          roomSwitch.options = { targetRoomSlug: respawnRoomSlug };
        }
        client.send(MessageTypes.ROOM_SWITCH, roomSwitch);

        // Clean up player from zone state
        this.players.delete(playerId);
        this.ownerPlayerIds.delete(playerId);
        this.state.playerCount = Math.max(0, this.state.playerCount - 1);
        this.updateMetadata();
        this.log(`Player ${this.playerTag(playerId)} died and returned to ${respawnTarget}`);
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
      this.sendOverlayState(targetClient, {
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

  // ─── Narration Helpers ───────────────────────────────────────────────────

  /**
   * Generate narration using the NarrationService when applicable.
   * Falls back to the provided fallback text if LLM is unavailable or errors.
   */
  private async generateNarration(
    narrativeType: import('@ellmud/shared').LLMNarrationType,
    playerId: string,
    roomId: string,
    fallbackText: string,
  ): Promise<string> {
    try {
      const player = this.players.get(playerId);
      const room = this.roomGraph.rooms.get(roomId);
      if (!player || !room) return fallbackText;

      // Build narration context
      const context: import('@ellmud/shared').NarrationContext = {
        narration_type: narrativeType,
        room: {
          id: room.id,
          light_level: room.illumination === 'dark' ? 0.0 : 1.0,
          exits: Array.from(room.exits.keys()),
          features: [], // TODO: extract from room properties
          items_visible: room.items.map((item) => ({
            id: item.id,
            type: 'item',
            name: item.name,
            quality: 1.0,
          })),
          creatures: this.creatureManager.getCreaturesInRoom(roomId).map((c) => ({
            id: c.id,
            type: c.type,
            state: 'idle', // TODO: get actual state from CreatureManager
            hp_pct: 1.0,
            disposition: 'neutral',
          })),
          hazards: [],
          traces: this.traceSystem.getTracesInRoom(roomId).map((t) => ({
            type: t.type,
            age_seconds: Math.max(0, ((t.createdAt + t.ttl) - Date.now()) / 1000),
            direction: t.direction,
            source: t.metadata.actorName,
            description: t.metadata.description,
            intensity: 1.0,
          })),
          zone_stability: this.state.stability,
        },
        player: {
          hp_pct: this.combatSystem.getCombatant(playerId)
            ? this.combatSystem.getCombatant(playerId)!.hp / this.combatSystem.getCombatant(playerId)!.maxHp
            : 1.0,
          statuses: [], // TODO: track player statuses
          stance: this.combatSystem.isInCombat(playerId) ? 'combat' : 'exploring',
          awareness_level: 0.5, // TODO: calculate from skills
          visited_before: false, // TODO: track from ExplorationRepository
        },
        recent_events: [],
        narrative_directives: {
          tone: 'grim',
          verbosity: 'standard',
          forbidden: ['reveal_player_names', 'reveal_hidden_items', 'invent_entities', 'resolve_mechanics'],
        },
      };

      return await this.narrationService.narrate(context);
    } catch (error) {
      this.log(`Narration service error: ${error}. Using fallback.`);
      return fallbackText;
    }
  }

  // ─── Message Senders ─────────────────────────────────────────────────────

  /**
   * Send narration to client.
   * Uses the NarrationService for enhanced LLM-generated prose when applicable.
   * Falls back gracefully to template text when LLM is unavailable.
   */
  private sendNarrate(client: Client, message: NarrateMessage): void {
    // Fire-and-forget: send immediately, don't block on LLM
    // NarrationService handles timeouts internally
    client.send(MessageTypes.NARRATE, message);
  }

  private sendRoomHeader(client: Client, message: RoomHeaderMessage): void {
    client.send(MessageTypes.ROOM_HEADER, message);
  }

  private sendZoneState(client: Client, message: ZoneStateMessage): void {
    client.send(MessageTypes.ZONE_STATE, message);
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
  private async sendExplorationData(client: Client, playerId: string, currentRoomId: string): Promise<void> {
    const roomData = this.buildExploredRoomData(currentRoomId);
    if (!roomData) return;

    // Load all previously visited rooms from this zone to provide complete map data
    const allRooms: ExploredRoomData[] = [roomData];
    
    if (this.zoneSlug) {
      try {
        const exploredRooms = await this.explorationRepo.getExploredRoomsInZone(playerId, this.zoneSlug);
        
        // Build room data for each visited room that still exists in the current graph
        for (const explored of exploredRooms) {
          if (explored.roomId !== currentRoomId && this.roomGraph.rooms.has(explored.roomId)) {
            const historicalRoomData = this.buildExploredRoomData(explored.roomId);
            if (historicalRoomData) {
              allRooms.push(historicalRoomData);
            }
          }
        }
        
        this.log(`Loaded ${allRooms.length} explored room(s) for ${this.playerTag(playerId)}`);
      } catch (err) {
        this.log(`Failed to load exploration history for ${this.playerTag(playerId)}: ${err}`);
      }
    }

    const message: ExplorationDataMessage = {
      type: MessageTypes.EXPLORATION_DATA,
      rooms: allRooms,
      currentRoomId,
    };
    client.send(MessageTypes.EXPLORATION_DATA, message);
    this.log(`Exploration data sent to ${this.playerTag(playerId)} (${allRooms.length} room(s))`);

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
      zoneTier: this.zoneTier,
    }).catch((err) => {
      this.log(`Failed to record exploration visit for ${this.playerTag(playerId)}: ${err}`);
    });
  }

  // ─── Room Occupants ──────────────────────────────────────────────────────

  /** Send structured room occupants data to a specific client. */
  private sendRoomOccupants(client: Client, playerId: string, roomId: string): void {
    const creatures = this.creatureManager.getCreaturesInRoom(roomId).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      aggressive: c.behaviorState === 'hostile',
    }));

    const players: Array<{ id: string; name: string; disconnected?: boolean }> = [];
    for (const [sid, ps] of this.players) {
      if (ps.currentRoomId === roomId && sid !== playerId) {
        const displayName = this.characterNames.get(sid) ?? sid;
        players.push({ id: sid, name: displayName, ...(ps.disconnected ? { disconnected: true } : {}) });
      }
    }

    const message: RoomOccupantsMessage = { creatures, players };
    client.send(MessageTypes.ROOM_OCCUPANTS, message);
  }

  /** Broadcast room occupants update to all players in a room. */
  private broadcastRoomOccupantsUpdate(roomId: string): void {
    for (const [sid, ps] of this.players) {
      if (ps.currentRoomId === roomId) {
        const client = this.findClient(sid);
        if (client) {
          this.sendRoomOccupants(client, sid, roomId);
        }
      }
    }
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

  /** Persist last inn location so the player respawns there on next join. */
  private async saveLastInn(playerId: string, zoneSlug: string, roomSlug: string): Promise<void> {
    try {
      await this.characterRepo.saveLastInn(playerId, zoneSlug, roomSlug);
    } catch (err) {
      this.log(`Failed to save last inn for ${this.playerTag(playerId)}: ${err}`);
    }
  }

  /** Persist posture to DB for reconnect survival (#371). */
  private async persistPosture(playerId: string): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;
    try {
      await this.characterRepo.savePosture(playerId, player.posture);
    } catch (err) {
      this.log(`Failed to persist posture for ${this.playerTag(playerId)}: ${err}`);
    }
  }

  // ─── Inventory Persistence (#409) ─────────────────────────────────────────

  /** Persist the player's current inventory to the database. */
  private async savePlayerInventory(playerId: string, playerState: PlayerState): Promise<void> {
    try {
      // Cancel any pending debounced save
      const timer = this.inventorySaveTimers.get(playerId);
      if (timer) {
        clearTimeout(timer);
        this.inventorySaveTimers.delete(playerId);
      }
      const entries = inventoryToEntries(playerState.inventory);
      await this.inventoryRepo.saveInventory(this.dbPlayerId(playerId), entries);
    } catch (err) {
      this.log(`Failed to save inventory for ${this.playerTag(playerId)}: ${err}`);
    }
  }

  /** Debounced inventory save — coalesces rapid mutations into a single write. */
  private debouncedInventorySave(playerId: string, playerState: PlayerState): void {
    const existing = this.inventorySaveTimers.get(playerId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.inventorySaveTimers.delete(playerId);
      this.savePlayerInventory(playerId, playerState).catch((err) => {
        this.log(`Debounced inventory save failed for ${this.playerTag(playerId)}: ${err}`);
      });
    }, 2000); // 2-second debounce

    this.inventorySaveTimers.set(playerId, timer);
  }

  // ─── Run History Persistence ────────────────────────────────────────────

  /** Record a zone run when a player survives or the zone collapses. */
  private async recordRunHistory(
    playerId: string,
    player: PlayerState | undefined,
    survived: boolean,
  ): Promise<void> {
    try {
      const joinTime = this.playerJoinTimes.get(playerId);
      const durationSec = joinTime
        ? Math.floor((Date.now() - joinTime) / 1000)
        : 0;

      const run: RunRecord = {
        runId: this.roomId,
        playerId: this.dbPlayerId(playerId),
        zoneTier: this.zoneTier,
        durationSec,
        survived,
        itemsCarriedOut: player
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

  // ─── Equipment Message Handlers (Server-Authoritative — Mid-Zone) ────

  private async handleEquipItem(client: Client, message: EquipItemMessage): Promise<void> {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;
    const player = this.players.get(playerId);

    if (!this.loadoutService || !player) {
      client.send(MessageTypes.NARRATE, {
        text: 'Equipment system unavailable.',
        type: 'system',
        timestamp: Date.now(),
      } satisfies NarrateMessage);
      return;
    }

    try {
      // First try stash, then zone inventory
      const result = await this.loadoutService.equipItem(this.dbPlayerId(playerId), message.itemId, message.targetSlot);

      if (!result.ok) {
        // Try equipping from zone inventory
        const invEntry = this.findInInventory(player, message.itemId);
        if (invEntry) {
          const invItem = this.toStashItemInstance(invEntry);
          const invResult = await this.loadoutService.equipFromInventory(this.dbPlayerId(playerId), invItem, message.targetSlot);

          if (invResult.ok) {
            // Remove from zone inventory
            player.inventory.delete(invEntry.item.id);

            // If displaced item, add it back to zone inventory
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

            await this.sendLoadoutAndStashUpdate(client, playerId);
            this.sendInventoryUpdate(client, playerId);
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

      await this.sendLoadoutAndStashUpdate(client, playerId);
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

      await this.sendLoadoutAndStashUpdate(client, playerId);
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

      await this.sendLoadoutAndStashUpdate(client, playerId);
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

  /** Send full loadout + stash state to client (on join and after equipment changes). */
  private async sendLoadoutAndStashUpdate(client: Client, playerId: string): Promise<void> {
    const dbId = this.dbPlayerId(playerId);

    // Send loadout (equipped items)
    if (this.loadoutService) {
      const loadoutView = await this.loadoutService.getLoadoutView(dbId);
      client.send(MessageTypes.LOADOUT_UPDATE, {
        slots: loadoutView.slots,
      } satisfies LoadoutUpdateMessage);
    }

    // Send stash (stored items)
    if (this.stashService) {
      const stashView = await this.stashService.loadStash(dbId);
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
  }

  /** Send current inventory contents to client (on join and after inventory mutations). */
  private sendInventoryUpdate(client: Client, playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    const items = Array.from(player.inventory.values()).map((entry) => {
      const def = getItemDefinition(entry.item.id);
      return {
        id: entry.item.id,
        name: entry.item.name,
        weight: entry.item.weight,
        tier: (def?.tier ?? 'common') as string,
      };
    });

    client.send(MessageTypes.INVENTORY_UPDATE, {
      items,
      currentWeight: player.currentWeight,
      maxWeight: player.maxCarryWeight,
    } satisfies InventoryUpdateMessage);
  }

  /** Send player state update to client (HP, stamina, status effects, posture). */
  private sendPlayerState(client: Client, playerId: string): void {
    const player = this.players.get(playerId);
    const combatant = this.combatSystem.getCombatant(playerId);
    if (!combatant) return;

    client.send(MessageTypes.PLAYER_STATE, {
      hp: combatant.hp,
      maxHp: combatant.maxHp,
      stamina: 0, // Placeholder — stamina system not implemented yet
      maxStamina: 0,
      statusEffects: [], // TODO: Implement status effects tracking
      posture: player?.posture ?? 'standing',
    } satisfies PlayerStateMessage);
  }

  /** Send posture-only state update (works outside combat). */
  private sendPostureState(client: Client, playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    const combatant = this.combatSystem.getCombatant(playerId);
    client.send(MessageTypes.PLAYER_STATE, {
      hp: combatant?.hp ?? 100,
      maxHp: combatant?.maxHp ?? 100,
      stamina: 0,
      maxStamina: 0,
      statusEffects: [],
      posture: player.posture,
    } satisfies PlayerStateMessage);
  }

  /** Find an item in the player's zone inventory by instanceId or itemId. */
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

  /** Convert a zone inventory entry to StashItemInstance format. */
  private toStashItemInstance(entry: { item: { id: string } }): import('@ellmud/shared').StashItemInstance {
    return {
      instanceId: `zone-${entry.item.id}-${Date.now()}`,
      itemId: entry.item.id,
      durability: null,
      maxDurability: null,
    };
  }

  // ─── Admin API Methods (Issue #344: Live Rooms) ──────────────────────────

  /**
   * Broadcast an admin message to all players in a specific zone room.
   * Called from admin API endpoint POST /admin/api/rooms/:roomId/broadcast.
   */
  adminBroadcastToRoom(targetRoomId: string, message: string, type: 'system' | 'admin' = 'system'): { success: boolean; error?: string } {
    const room = this.roomGraph.rooms.get(targetRoomId);
    if (!room) {
      return { success: false, error: `Room "${targetRoomId}" not found in zone graph` };
    }

    const prefix = type === 'admin' ? '[ADMIN] ' : '[SYSTEM] ';
    this.broadcastToRoom(targetRoomId, {
      narrations: [{ text: `${prefix}${message}`, type: 'system' }],
    });

    this.log(`Admin broadcast to room "${targetRoomId}": ${message}`);
    return { success: true };
  }

  /**
   * Teleport a player to a specific zone room.
   * Called from admin API endpoint POST /admin/api/rooms/:roomId/teleport.
   * Sends room description, occupants, and movement broadcasts.
   */
  adminTeleportPlayer(sessionId: string, targetRoomId: string, notify = true): { success: boolean; error?: string; roomName?: string } {
    const player = this.players.get(sessionId);
    if (!player) {
      return { success: false, error: `Player "${sessionId}" not found in this zone` };
    }

    const targetRoom = this.roomGraph.rooms.get(targetRoomId);
    if (!targetRoom) {
      return { success: false, error: `Room "${targetRoomId}" not found in zone graph` };
    }

    const previousRoomId = player.currentRoomId;
    if (previousRoomId === targetRoomId) {
      return { success: false, error: `Player is already in room "${targetRoomId}"` };
    }

    // Move the player
    player.currentRoomId = targetRoomId;

    // Broadcast departure/arrival to other players
    this.broadcastPlayerMovement(sessionId, previousRoomId, targetRoomId);

    // Update occupants for both rooms
    this.broadcastRoomOccupantsUpdate(previousRoomId);
    this.broadcastRoomOccupantsUpdate(targetRoomId);

    // Send the teleported player their new room info
    const client = this.findClient(sessionId);
    if (client) {
      if (notify) {
        this.sendNarrate(client, {
          text: `[ADMIN] You have been teleported to ${targetRoom.name}.`,
          type: 'system',
          timestamp: Date.now(),
        });
      }

      // Re-deliver room description (same pattern as reconnect/goto)
      const lookResult = handleLook(this.buildCommandContext(player, []));
      this.deliverResult(client, lookResult);

      // Send room occupants to the moved player
      this.sendRoomOccupants(client, sessionId, targetRoomId);

      // Send exploration update for the new room
      this.sendExplorationUpdate(client, sessionId, targetRoomId);
    }

    this.log(`Admin teleported ${this.playerTag(sessionId)} from "${previousRoomId}" to "${targetRoomId}"`);
    return { success: true, roomName: targetRoom.name };
  }

  /**
   * Get live zone room data: each room with its current players and creatures.
   * Called from admin API endpoint GET /admin/api/rooms/live.
   */
  adminGetLiveRooms(): AdminLiveRoomInfo[] {
    const result: AdminLiveRoomInfo[] = [];

    for (const [roomId, room] of this.roomGraph.rooms) {
      const players: Array<{ sessionId: string; characterName?: string }> = [];
      for (const [sid, ps] of this.players) {
        if (ps.currentRoomId === roomId) {
          players.push({
            sessionId: sid,
            characterName: this.characterNames.get(sid),
          });
        }
      }

      const creatures: Array<{ id: string; name: string; hp: number; maxHp: number }> = [];
      const creaturesInRoom = this.creatureManager.getCreaturesInRoom(roomId);
      for (const c of creaturesInRoom) {
        creatures.push({ id: c.id, name: c.name, hp: c.hp, maxHp: c.maxHp });
      }

      result.push({
        roomId,
        roomName: room.name,
        roomType: room.type ?? 'corridor',
        playerCount: players.length,
        creatureCount: creatures.length,
        players,
        creatures,
      });
    }

    return result;
  }

  /**
   * Spawn a creature in a specific zone room from an admin-resolved template.
   * Called from admin API endpoint POST /admin/api/rooms/:roomId/spawn-creature.
   * Template resolution stays in routes.ts (needs deps.contentStores); everything
   * after that is encapsulated here.
   */
  adminSpawnCreature(template: import('../creatures/types.js').CreatureTemplate, targetRoomId: string): { success: boolean; error?: string; creatureId?: string; creatureName?: string } {
    const room = this.roomGraph.rooms.get(targetRoomId);
    if (!room) {
      return { success: false, error: `Room "${targetRoomId}" not found in zone graph` };
    }

    const creature = this.creatureManager.spawnSingleCreature(template, targetRoomId);

    // Broadcast spawn notification to players in the target room
    this.broadcastToRoom(targetRoomId, {
      narrations: [{ text: `[SYSTEM] A ${creature.name} materializes from thin air.`, type: 'system' }],
    });

    this.log(`Admin spawned "${creature.name}" (${creature.id}) in room "${targetRoomId}"`);
    return { success: true, creatureId: creature.id, creatureName: creature.name };
  }

  /**
   * Spawn an item in a specific zone room from an admin-resolved item definition.
   * Called from admin API endpoint POST /admin/api/rooms/:roomId/spawn.
   */
  adminSpawnItem(item: Item, targetRoomId: string): { success: boolean; error?: string } {
    const room = this.roomGraph.rooms.get(targetRoomId);
    if (!room) {
      return { success: false, error: `Room "${targetRoomId}" not found in zone graph` };
    }

    room.items.push(item);

    // Broadcast spawn notification to players in the target room
    this.broadcastToRoom(targetRoomId, {
      narrations: [{ text: `[SYSTEM] A ${item.name} materializes from thin air.`, type: 'system' }],
    });

    this.log(`Admin spawned item "${item.name}" (${item.id}) in room "${targetRoomId}"`);
    return { success: true };
  }

  /** Expose the zone slug for admin API responses. */
  getZoneSlug(): string | undefined {
    return this.zoneSlug;
  }

  // ─── Who List (Issue #366) ──────────────────────────────────────────────

  /**
   * Return raw player data for cross-room who-list gathering.
   * Called by WhoListService via matchMaker iteration.
   */
  getWhoListPlayerData(): ZonePlayerData[] {
    const zoneName = this.zoneData?.zone.name ?? this.zoneSlug ?? 'Unknown Zone';
    const result: ZonePlayerData[] = [];
    for (const [characterId] of this.players) {
      const charName = this.characterNames.get(characterId);
      if (!charName) continue; // Skip players without loaded names (still joining)
      const player = this.players.get(characterId);
      if (!player) continue;
      result.push({
        characterId,
        characterName: charName,
        roomId: player.currentRoomId,
        zoneName,
        posture: player.posture,
      });
    }
    return result;
  }

  /**
   * Handle REQUEST_PLAYER_LIST message — send structured PLAYER_LIST back.
   */
  private async handleRequestPlayerList(client: Client): Promise<void> {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;
    const player = this.players.get(playerId);
    if (!player) return;

    try {
      const entries = await gatherPlayerList(
        playerId,
        player.currentRoomId,
        getConfig().devModeEnabled,
      );
      client.send(MessageTypes.PLAYER_LIST, { players: entries } satisfies PlayerListMessage);
    } catch (err) {
      this.log(`Failed to gather player list for ${this.playerTag(playerId)}: ${err}`);
    }
  }

  /**
   * Handle the text-based `who` command — gather the player list and
   * send formatted ASCII table as narration.
   */
  private async handleWhoCommand(client: Client, playerId: string, player: PlayerState): Promise<void> {
    try {
      const entries = await gatherPlayerList(
        playerId,
        player.currentRoomId,
        getConfig().devModeEnabled,
      );
      const text = formatWhoListText(entries);
      this.sendNarrate(client, { text, type: 'system', timestamp: Date.now() });
    } catch (err) {
      this.log(`Failed to handle who command for ${this.playerTag(playerId)}: ${err}`);
      this.sendNarrate(client, {
        text: 'The who list is momentarily unavailable.',
        type: 'system',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Async handler for the `toggle` command (#432).
   * Awaits DB read/write so the response reports the actual new state.
   */
  private async handleToggleCommand(client: Client, player: PlayerState, args: string[]): Promise<void> {
    try {
      const ctx = this.buildCommandContext(player, args);
      const result = await handleToggleAsync(ctx);
      this.deliverResult(client, result);
    } catch (err) {
      this.log(`Failed to handle toggle command: ${err}`);
      this.sendNarrate(client, {
        text: 'Toggle failed. Please try again.',
        type: 'system',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle TOGGLE_FLAG message from the Settings UI.
   * Persists the flag change to the database and echoes the new state back.
   */
  private async handleToggleFlag(client: Client, message: ToggleFlagMessage): Promise<void> {
    const playerId = this.playerIds.get(client.sessionId) ?? client.sessionId;
    if (!isValidFlagName(message.flag)) return;

    try {
      const repo = getCharacterFlagsRepository();
      await repo.setFlag(playerId, message.flag, message.enabled);

      // Echo confirmed flag state back to the client
      const flags = await repo.getFlags(playerId);
      this.playerFlagsCache.set(playerId, flags);
      client.send(MessageTypes.FLAG_STATE, { flags } satisfies FlagStateMessage);
    } catch (err) {
      this.log(`Failed to toggle flag ${message.flag} for ${this.playerTag(playerId)}: ${err}`);
    }
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
    console.log(`[ZoneRoom:${this.roomId}] ${message}`);
  }
}

// ─── B7: Fallback Refuge Graph ──────────────────────────────────────────────
// Used when ZoneRoom loads in zone mode for 'the-refuge' but no DB data exists.
// The Refuge is now a designer/debug hub — fallback for unaffiliated players.

function createFallbackRefugeGraph(): RoomGraph {
  const rooms = new Map<string, import('../generator/RoomGraph.js').Room>();

  rooms.set('hearth', {
    id: 'hearth',
    name: 'The Hearth',
    description: 'A broad stone chamber repurposed as a debug staging area. Test dummies line one wall; a perpetual fire crackles in the centre. Unaffiliated shardwalkers awaken here.',
    type: 'entry',
    exits: new Map<Direction, string>([
      ['east', 'stash-alcove'],
      ['north', 'training-grounds'],
      ['west', 'expedition-board'],
      ['south', 'market'],
    ]),
    items: [],
  });

  rooms.set('stash-alcove', {
    id: 'stash-alcove',
    name: 'Stash Alcove',
    description: 'A narrow alcove lined with locked chests and hanging satchels. Your belongings are here — what you\'ve kept from the depths.',
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

  rooms.set('expedition-board', {
    id: 'expedition-board',
    name: 'The Expedition Board',
    description: 'A massive board of pinned notes, sketched maps, and rift coordinates. This is where expeditions begin.',
    type: 'feature_expedition_board',
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
    description: 'A locked chamber where faction leaders meet. Maps of known zones cover the walls.',
    type: 'corridor',
    exits: new Map<Direction, string>([['west', 'training-grounds']]),
    items: [],
  });

  return { rooms, startRoomId: 'hearth' };
}
