import { Room, Client } from '@colyseus/core';
import {
  type CommandMessage,
  type NarrateMessage,
  type RoomHeaderMessage,
  MessageTypes,
} from '@ellmud/shared';
import { RefugeState } from '../state.js';
import { authenticateClient } from '../auth/colyseus-auth.js';

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
  onCreate(): void {
    this.setState(new RefugeState());

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

  onJoin(client: Client): void {
    this.state.playerCount++;
    this.log(`Player joined Refuge: ${client.sessionId} (${this.state.playerCount} players)`);

    client.send(MessageTypes.NARRATE, {
      text: 'You emerge into the Refuge. The air is warm, the walls are solid. You are safe — for now.',
      type: 'system',
      timestamp: Date.now(),
    } satisfies NarrateMessage);

    client.send(MessageTypes.ROOM_HEADER, {
      roomName: 'The Refuge — Central Plaza',
      exits: ['north', 'south', 'east', 'west'],
      stability: 1.0,
    } satisfies RoomHeaderMessage);
  }

  onLeave(client: Client): void {
    this.state.playerCount--;
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

      default:
        client.send(MessageTypes.NARRATE, {
          text: `You try to "${message.verb}" but nothing happens here.`,
          type: 'system',
          timestamp: Date.now(),
        } satisfies NarrateMessage);
        break;
    }
  }

  // ─── Logging ─────────────────────────────────────────────────────────────

  private log(message: string): void {
    console.log(`[RefugeRoom] ${message}`);
  }
}
