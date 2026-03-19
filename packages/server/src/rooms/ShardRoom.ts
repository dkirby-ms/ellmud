import { Room, Client } from '@colyseus/core';
import {
  type CommandMessage,
  type NarrateMessage,
  type RoomHeaderMessage,
  type ShardState as SharedShardState,
  type ShardStateMessage,
  MessageTypes,
} from '@ellmud/shared';
import { ShardState } from '../state.js';
import { parseCommand } from '../commands/parser.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph, type RoomGraph } from '../shard/RoomGraph.js';
import { handleLook } from '../commands/handlers/look.js';

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

    // Initialize room graph (will be replaced by procedural generator)
    this.roomGraph = createTestRoomGraph();

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

  onJoin(client: Client): void {
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
    this.players.delete(client.sessionId);
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
    this.broadcast(MessageTypes.NARRATE, {
      text: 'The shard shatters. Reality folds in on itself. Everything goes dark.',
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

    return {
      player,
      room,
      args,
      resolveRoom: (roomId: string) => this.roomGraph.rooms.get(roomId),
      otherPlayersInRoom,
      stability: this.state.stability,
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
