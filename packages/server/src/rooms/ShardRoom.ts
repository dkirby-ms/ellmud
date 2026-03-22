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
  MessageTypes,
} from '@ellmud/shared';
import { ShardState } from '../state.js';
import { parseCommand } from '../commands/parser.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph, type RoomGraph } from '../shard/RoomGraph.js';
import { generateShardGraph } from '../shard/generator.js';
import { adaptRoomGraph } from '../shard/graph-adapter.js';
import { handleLook } from '../commands/handlers/look.js';
import { CombatSystem, type TickResult, createCombatant } from '../combat/index.js';
import { SoundSystem } from '../sound/index.js';
import {
  NOISE_VALUES,
  SOUND_DESCRIPTIONS,
  type SoundType,
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
  private combatSystem!: CombatSystem;
  private soundSystem!: SoundSystem;
  private extractionSystem!: ExtractionSystem;
  private creatureManager!: CreatureManager;
  private stashService?: StashService;
  private itemDefs = new Map<string, StashItem>();
  private shardTier: ShardTier = 1;

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

  onCreate(options: Record<string, unknown>): void {
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

    // Initialize room graph — use procedural generator by default, test graph as fallback
    this.creatureManager = new CreatureManager();
    if (options['useTestGraph'] === true) {
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
      return { id: room.id, exits: room.exits };
    });

    // Initialize extraction system (default 5-tick channel)
    this.extractionSystem = new ExtractionSystem();

    // Initialize stash with shared provider if not already injected
    if (!this.stashService) {
      this.initStash(getStashRepository(), getItemDefs());
    }

    // Register message handlers
    this.onMessage(MessageTypes.COMMAND, (client: Client, message: CommandMessage) => {
      this.handleCommandMessage(client, message);
    });

    // 1-second tick for all game simulation
    this.setSimulationInterval((deltaTime: number) => this.update(deltaTime), TICK_INTERVAL_MS);

    this.updateMetadata();

    this.log(`ShardRoom created: ${this.roomId} (biome=${this.state.biome}, tier=${this.shardTier})`);

    // Begin shard lifecycle
    this.transitionTo('seeding');
    this.seedShard();
  }

  async onAuth(_client: Client, options: Record<string, unknown>): Promise<unknown> {
    return authenticateClient(options['token'] as string | undefined);
  }

  onJoin(client: Client): void {
    // Enforce tier-based max players
    const maxPlayers = this.maxClients ?? getMaxPlayersForTier(this.shardTier, getConfig());
    if (this.state.playerCount >= maxPlayers) {
      throw new Error(`Shard is full (${maxPlayers}/${maxPlayers} players).`);
    }

    this.state.playerCount++;
    this.updateMetadata();

    // Distribute players across entry points for spatial separation
    // Use player count to cycle through available entry rooms
    const entryIndex = (this.state.playerCount - 1) % this.entryRoomIds.length;
    const startRoom = this.entryRoomIds[entryIndex] || this.roomGraph.startRoomId;

    // Initialize player state at assigned entry room
    const playerState = new PlayerState(client.sessionId, startRoom);
    this.players.set(client.sessionId, playerState);

    this.log(`Player joined: ${client.sessionId} at ${startRoom} (${this.state.playerCount}/${maxPlayers} players)`);

    // Send initial system narration
    this.sendNarrate(client, {
      text: 'You step through the rift into a shard of the dying world...',
      type: 'system',
      timestamp: Date.now(),
    });

    // Send initial room look
    const lookResult = handleLook(this.buildCommandContext(playerState, []));
    this.deliverResult(client, lookResult);

    this.sendShardState(client, {
      state: this.lifecycle,
      collapseTimer: this.state.collapseTimer,
    });
  }

  async onLeave(client: Client, code?: number): Promise<void> {
    const config = getConfig();
    const playerState = this.players.get(client.sessionId);
    const isInCombat = this.combatSystem.isInCombat(client.sessionId);

    // Allow reconnection for accidental disconnects (non-4000 codes)
    // Code 4000 = consented leave (player clicked "leave game")
    const consented = code === 4000;

    if (!consented) {
      // Mark player as disconnected
      if (playerState) {
        playerState.disconnected = true;
      }
      if (isInCombat) {
        this.combatSystem.markDisconnected(client.sessionId);
      }

      this.log(`Player disconnected (code ${code}): ${client.sessionId} — allowing reconnection for ${config.reconnectionTimeoutS}s`);

      try {
        await this.allowReconnection(client, config.reconnectionTimeoutS);
        
        // Client reconnected successfully
        this.log(`Player reconnected: ${client.sessionId}`);
        
        // Clear disconnected flags
        if (playerState) {
          playerState.disconnected = false;
        }
        if (isInCombat) {
          this.combatSystem.clearDisconnected(client.sessionId);
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
        this.log(`Reconnection timeout: ${client.sessionId} — applying death behavior`);
        this.handleReconnectionTimeout(client.sessionId);
      }
    }

    // Clean up player (consented leave or timeout expired)
    this.extractionSystem.interruptExtraction(client.sessionId, 'you left the shard');
    if (this.players.has(client.sessionId)) {
      this.state.playerCount = Math.max(0, this.state.playerCount - 1);
      this.players.delete(client.sessionId);
      this.combatSystem.removeCombatant(client.sessionId);
      this.updateMetadata();
    }
    this.log(`Player left: ${client.sessionId} (${this.state.playerCount} players)`);
  }

  /**
   * Handle reconnection timeout expiry — kill or move to safe room.
   */
  private handleReconnectionTimeout(sessionId: string): void {
    const config = getConfig();
    const playerState = this.players.get(sessionId);
    if (!playerState) return;

    const combatant = this.combatSystem.getCombatant(sessionId);

    if (config.reconnectDeathBehavior === 'kill') {
      // Kill the player in place — their body and inventory become lootable
      if (combatant) {
        combatant.hp = 0;
        this.log(`Player ${sessionId} killed in place after reconnection timeout`);
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

      this.combatSystem.removeCombatant(sessionId);
      this.log(`Player ${sessionId} moved to safe room after reconnection timeout`);
    }
  }

  onDispose(): void {
    this.log(`ShardRoom disposed: ${this.roomId}`);
  }

  // ─── Tick System ─────────────────────────────────────────────────────────

  private update(_deltaTime: number): void {
    this.state.tick++;

    // Collapse timer countdown
    if (this.lifecycle === 'active' || this.lifecycle === 'destabilising') {
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
    this.tickCreatures();

    // Resolve combat tick
    if (this.combatSystem.hasActiveEncounters()) {
      const tickResult = this.combatSystem.resolveTick();
      this.syncCreaturesAfterCombat(tickResult);
      this.deliverCombatResults(tickResult);

      // Propagate combat sounds to nearby rooms (GDD §12)
      this.propagateCombatSounds(tickResult);

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

    // Resolve extraction ticks
    this.tickExtractions();
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
    const playerList = Array.from(this.players.entries()).map(([sessionId, state]) => ({
      sessionId,
      roomId: state.currentRoomId,
    }));

    this.setMetadata({
      biome: this.state.biome,
      tier: this.state.tier,
      lifecycle: this.lifecycle,
      playerCount: this.state.playerCount,
      maxPlayers: this.maxClients ?? getMaxPlayersForTier(this.shardTier, getConfig()),
      players: playerList,
    });
  }

  // ─── Command Handling ────────────────────────────────────────────────────

  private handleCommandMessage(client: Client, message: CommandMessage): void {
    const player = this.players.get(client.sessionId);
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

    this.log(`Command from ${client.sessionId}: ${verb} ${args.join(' ')}`);

    const wasExtracting = this.extractionSystem.isExtracting(client.sessionId);
    const ctx = this.buildCommandContext(player, args);
    const result = handleCommand(verb, ctx);

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

    // Send EXTRACTION_STATE 'started' if this command initiated an extraction
    if (!wasExtracting && this.extractionSystem.isExtracting(client.sessionId)) {
      const channel = this.extractionSystem.getChannel(client.sessionId)!;
      this.sendExtractionState(client, {
        playerId: client.sessionId,
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
      combatSystem: this.combatSystem,
      extractionSystem: this.extractionSystem,
      creaturesInRoom,
    };
  }

  private deliverResult(client: Client, result: import('../commands/index.js').CommandResult): void {
    for (const narration of result.narrations) {
      this.sendNarrate(client, {
        text: narration.text,
        type: narration.type,
        timestamp: Date.now(),
      });
    }
    if (result.roomHeader) {
      this.sendRoomHeader(client, result.roomHeader);
    }
  }

  /**
   * Broadcast narrations to all players in a specific room.
   * Used for proximity-based social commands (say, emote).
   */
  private broadcastToRoom(roomId: string, result: import('../commands/index.js').CommandResult): void {
    for (const narration of result.narrations) {
      // Send to all players in the room
      for (const [sid, ps] of this.players) {
        if (ps.currentRoomId === roomId) {
          const targetClient = this.clients.find(c => c.sessionId === sid);
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
      const targetClient = this.clients.find(c => c.sessionId === targetSessionId);
      
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
    }

    // Handle flee movement — update player positions and send room descriptions
    for (const flee of tickResult.fleeResults) {
      const player = this.players.get(flee.combatantId);
      if (player) {
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
            });
          }
        }
      }
    }
  }

  private findClient(sessionId: string): Client | undefined {
    return this.clients.find((c) => c.sessionId === sessionId);
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

    // Remove player from shard
    this.players.delete(playerId);
    this.combatSystem.removeCombatant(playerId);
    this.state.playerCount = Math.max(0, this.state.playerCount - 1);
    this.updateMetadata();

    this.log(`Player extracted: ${playerId}`);

    // Send extraction completion message
    client.send(MessageTypes.EXTRACTION_STATE, {
      playerId,
      state: 'completed',
      narration: 'You emerge from the portal into the warm glow of the Refuge. You made it out.',
      timestamp: Date.now(),
    });

    // Tell client to switch back to refuge
    client.send(MessageTypes.ROOM_SWITCH, {
      target: 'refuge',
      reason: 'extraction_complete',
    } satisfies RoomSwitchMessage);
  }

  /**
   * Transfer a player's shard inventory into their persistent stash.
   * Items are added until the stash weight limit is reached; excess is lost.
   */
  private async transferToStash(
    client: Client, playerId: string, player: PlayerState,
  ): Promise<void> {
    if (player.inventory.size === 0) return;

    const { stored, lost } = await transferInventoryToStash(
      playerId, player.inventory, this.stashService!, this.itemDefs,
    );

    // Clear shard inventory after transfer
    player.inventory.clear();

    // Narrate the transfer
    if (stored > 0 && lost === 0) {
      this.sendNarrate(client, {
        text: `You secured ${stored} item${stored !== 1 ? 's' : ''} in your stash.`,
        type: 'system',
        timestamp: Date.now(),
      });
    } else if (stored > 0 && lost > 0) {
      this.sendNarrate(client, {
        text: `You secured ${stored} item${stored !== 1 ? 's' : ''} in your stash, but ${lost} item${lost !== 1 ? 's were' : ' was'} lost — your stash is full.`,
        type: 'system',
        timestamp: Date.now(),
      });
    } else if (lost > 0) {
      this.sendNarrate(client, {
        text: `Your stash is full. ${lost} item${lost !== 1 ? 's were' : ' was'} lost in the rift.`,
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
        // Register creature as combatant if needed
        if (!this.combatSystem.getCombatant(creature.id)) {
          this.combatSystem.registerCombatant(this.creatureManager.toCombatant(creature));
        }
        // Register target player as combatant if needed
        if (action.targetCombatantId && !this.combatSystem.getCombatant(action.targetCombatantId)) {
          const player = this.players.get(action.targetCombatantId);
          if (player) {
            this.combatSystem.registerCombatant(
              createCombatant(player.sessionId, player.sessionId, player.currentRoomId, true),
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
   * Handle player defeat events — drops inventory, sends death screen,
   * schedules return to refuge after a short delay.
   */
  private handlePlayerDefeats(tickResult: TickResult): void {
    for (const event of tickResult.events) {
      if (event.type !== 'defeated' || event.actorId.startsWith('creature-')) continue;

      const playerId = event.actorId;
      const player = this.players.get(playerId);
      if (!player) continue;

      const roomId = player.currentRoomId;
      const room = this.roomGraph.rooms.get(roomId);

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

      // Narrate dropped items to other players in the room
      if (droppedItems.length > 0 && room) {
        for (const [sid, ps] of this.players) {
          if (sid === playerId || ps.currentRoomId !== roomId) continue;
          const otherClient = this.findClient(sid);
          if (otherClient) {
            this.sendNarrate(otherClient, {
              text: droppedItems.map(i => `${event.actorName} drops a ${i.name} as they fall.`).join('\n'),
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
          narration: 'You collapse, defeated. Darkness claims you…',
          timestamp: Date.now(),
        });

        // Schedule return to refuge after 3 seconds
        this.clock.setTimeout(() => {
          // Guard: player may have disconnected during the death delay
          if (!this.players.has(playerId)) {
            this.log(`Player ${playerId} already left during death delay — skipping cleanup`);
            return;
          }

          client.send(MessageTypes.ROOM_SWITCH, {
            target: 'refuge',
            reason: 'player_death',
          } satisfies RoomSwitchMessage);

          // Clean up player from shard state
          this.players.delete(playerId);
          this.state.playerCount = Math.max(0, this.state.playerCount - 1);
          this.updateMetadata();
          this.log(`Player defeated and returned to refuge: ${playerId}`);
        }, 3000);
      }

      // Remove from combat system immediately
      this.combatSystem.removeCombatant(playerId);
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

  // ─── Logging ─────────────────────────────────────────────────────────────

  private log(message: string): void {
    console.log(`[ShardRoom:${this.roomId}] ${message}`);
  }
}
