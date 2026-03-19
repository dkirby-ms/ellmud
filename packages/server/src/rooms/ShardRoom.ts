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

    // Register message handlers
    this.onMessage(MessageTypes.COMMAND, (client: Client, message: CommandMessage) => {
      this.handleCommand(client, message);
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
    this.log(`Player joined: ${client.sessionId} (${this.state.playerCount} players)`);

    // Send initial room state via messages
    this.sendNarrate(client, {
      text: 'You step through the rift into a shard of the dying world...',
      type: 'system',
      timestamp: Date.now(),
    });

    this.sendRoomHeader(client, {
      roomName: 'Shard Entry',
      exits: ['north', 'east'],
      stability: this.state.stability,
    });

    this.sendShardState(client, {
      state: this.lifecycle,
      collapseTimer: this.state.collapseTimer,
    });
  }

  onLeave(client: Client): void {
    this.state.playerCount--;
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

  private handleCommand(client: Client, message: CommandMessage): void {
    this.log(`Command from ${client.sessionId}: ${message.verb} ${message.args.join(' ')}`);

    // Placeholder command handling — will be expanded with full parser
    switch (message.verb) {
      case 'look':
        this.sendNarrate(client, {
          text: 'You survey your surroundings carefully...',
          type: 'room',
          timestamp: Date.now(),
        });
        break;

      default:
        this.sendNarrate(client, {
          text: `You try to "${message.verb}" but nothing happens.`,
          type: 'system',
          timestamp: Date.now(),
        });
        break;
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
