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
import { ExtractionSystem } from '../extraction/index.js';
import { authenticateClient } from '../auth/colyseus-auth.js';
import { getConfig } from '../config.js';
import { StashService, InMemoryStashRepository } from '../stash/index.js';
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
  private roomGraph!: RoomGraph;
  private players = new Map<string, PlayerState>();
  private combatSystem!: CombatSystem;
  private extractionSystem!: ExtractionSystem;
  private creatureManager!: CreatureManager;
  private stashService?: StashService;
  private itemDefs = new Map<string, StashItem>();

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

    if (typeof options['biome'] === 'string') {
      this.state.biome = options['biome'];
    }
    if (typeof options['collapseTimer'] === 'number') {
      this.collapseTimerSeconds = options['collapseTimer'];
    }

    this.state.collapseTimer = this.collapseTimerSeconds;

    // Initialize room graph — use procedural generator by default, test graph as fallback
    this.creatureManager = new CreatureManager();
    if (options['useTestGraph'] === true) {
      this.roomGraph = createTestRoomGraph();
    } else {
      const seed = typeof options['seed'] === 'number' ? options['seed'] : Date.now();
      const biome = (typeof options['biome'] === 'string' ? options['biome'] : 'flooded_crypt') as BiomeType;
      const sharedGraph = generateShardGraph({ tier: 1, biome, seed });
      this.roomGraph = adaptRoomGraph(sharedGraph);

      // Spawn creatures using a derived seed (distinct from generator's PRNG)
      const creaturePrng = createPRNG(seed + 7919);
      this.creatureManager.spawnCreatures(sharedGraph, DROWNED_REVENANT, creaturePrng);
    }

    // Initialize combat system with room exit resolver
    this.combatSystem = new CombatSystem((roomId: string) => {
      const room = this.roomGraph.rooms.get(roomId);
      return room ? Array.from(room.exits.values()) : [];
    });

    // Initialize extraction system (default 5-tick channel)
    this.extractionSystem = new ExtractionSystem();

    // Register message handlers
    this.onMessage(MessageTypes.COMMAND, (client: Client, message: CommandMessage) => {
      this.handleCommandMessage(client, message);
    });

    // 1-second tick for all game simulation
    this.setSimulationInterval((deltaTime: number) => this.update(deltaTime), TICK_INTERVAL_MS);

    this.log(`ShardRoom created: ${this.roomId} (biome=${this.state.biome})`);

    // Begin shard lifecycle
    this.transitionTo('seeding');
    this.seedShard();
  }

  async onAuth(_client: Client, options: Record<string, unknown>): Promise<unknown> {
    return authenticateClient(options['token'] as string | undefined);
  }

  onJoin(client: Client): void {
    // Enforce max players per shard (Phase 1: solo play = 1)
    const maxPlayers = getConfig().maxPlayersPerShard;
    if (this.state.playerCount >= maxPlayers) {
      throw new Error(`Shard is full (${maxPlayers}/${maxPlayers} players).`);
    }

    this.state.playerCount++;

    // Initialize player state at shard entry room
    const playerState = new PlayerState(client.sessionId, this.roomGraph.startRoomId);
    this.players.set(client.sessionId, playerState);

    this.log(`Player joined: ${client.sessionId} (${this.state.playerCount} players)`);

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

  onLeave(client: Client): void {
    this.state.playerCount--;
    this.extractionSystem.interruptExtraction(client.sessionId, 'you left the shard');
    this.players.delete(client.sessionId);
    this.combatSystem.removeCombatant(client.sessionId);
    this.log(`Player left: ${client.sessionId} (${this.state.playerCount} players)`);
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

    // Transition to open after seeding is complete
    this.clock.setTimeout(() => {
      this.transitionTo('open');

      // Open for entry for 5 minutes, then go active
      this.clock.setTimeout(() => {
        if (this.lifecycle === 'open') {
          this.transitionTo('active');
        }
      }, 5000); // Shortened for dev; production = 300_000 (5 min)
    }, 1000); // Shortened for dev; production = seeding duration
  }

  private transitionTo(newState: SharedShardState): void {
    const previousState = this.lifecycle;
    this.lifecycle = newState;
    this.state.lifecycle = newState;

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
    this.extractionSystem.interruptAll('the shard collapsed');

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

    const ctx = this.buildCommandContext(player, args);
    const result = handleCommand(verb, ctx);
    this.deliverResult(client, result);
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

  // ─── Combat Result Delivery ──────────────────────────────────────────────

  private deliverCombatResults(tickResult: TickResult): void {
    // Send combat event narrations to all clients in relevant rooms
    for (const event of tickResult.events) {
      // Broadcast combat narrations to all connected clients
      this.broadcast(MessageTypes.NARRATE, {
        text: event.narration,
        type: 'combat',
        timestamp: Date.now(),
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
    this.state.playerCount--;

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

    // Sync HP and room for surviving creature combatants
    for (const creature of this.creatureManager.getLivingCreatures()) {
      const combatant = this.combatSystem.getCombatant(creature.id);
      if (combatant) {
        this.creatureManager.syncFromCombat(combatant);
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

  // ─── Logging ─────────────────────────────────────────────────────────────

  private log(message: string): void {
    console.log(`[ShardRoom:${this.roomId}] ${message}`);
  }
}
