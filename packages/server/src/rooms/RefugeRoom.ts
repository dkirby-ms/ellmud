import { Room, Client } from '@colyseus/core';
import {
  type CommandMessage,
  type NarrateMessage,
  type RoomHeaderMessage,
  type StashItem,
  MessageTypes,
} from '@ellmud/shared';
import { RefugeState } from '../state.js';
import { authenticateClient } from '../auth/colyseus-auth.js';
import { StashService, InMemoryStashRepository } from '../stash/index.js';
import type { StashRepository } from '../stash/index.js';

const TICK_INTERVAL_MS = 1000;

interface RefugeRoomOptions {
  state: RefugeState;
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

    // Initialize stash with defaults if not already injected
    if (!this.stashService) {
      this.initStash();
    }


    this.onMessage(MessageTypes.COMMAND, (client: Client, message: CommandMessage) => {
      this.handleCommand(client, message);
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

    // Placeholder: ambient NPC movement, weather cycles, faction events
    // This will be expanded in later issues.
  }

  // ─── Command Handling ────────────────────────────────────────────────────

  private handleCommand(client: Client, message: CommandMessage): void {
    this.log(`Command from ${client.sessionId}: ${message.verb} ${message.args.join(' ')}`);

    switch (message.verb) {
      case 'look':
        client.send(MessageTypes.NARRATE, {
          text: 'The Refuge hums with quiet activity. Merchants hawk wares, refugees gather by fires.',
          type: 'room',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        break;

      case 'shardboard':
        client.send(MessageTypes.NARRATE, {
          text: 'The Shardboard displays available rift entries. Several shards shimmer with unstable energy.',
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        break;

      case 'stash':
        this.handleStashCommand(client);
        break;

      case 'take':
        this.handleTakeCommand(client, message.args);
        break;

      case 'store':
        this.handleStoreCommand(client, message.args);
        break;


      default:
        client.send(MessageTypes.NARRATE, {
          text: `You try to "${message.verb}" but nothing happens here.`,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        break;
    }
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


  // ─── Logging ─────────────────────────────────────────────────────────────

  private log(message: string): void {
    console.log(`[RefugeRoom] ${message}`);
  }
}
