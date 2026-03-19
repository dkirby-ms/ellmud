/**
 * Colyseus connection service — message-only protocol.
 *
 * CRITICAL: No Schema subscriptions. The client is a dumb terminal.
 * We subscribe ONLY to room.onMessage() handlers for narrated prose.
 */

import { Client, Room } from 'colyseus.js';
import {
  MessageTypes,
  type NarrateMessage,
  type RoomHeaderMessage,
  type ShardStateMessage,
  type CombatResultMessage,
} from '@ellmud/shared';

const WS_ENDPOINT = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:2567`;

export interface MessageHandlers {
  onNarrate: (msg: NarrateMessage) => void;
  onRoomHeader: (msg: RoomHeaderMessage) => void;
  onShardState: (msg: ShardStateMessage) => void;
  onCombatResult: (msg: CombatResultMessage) => void;
  onError: (code: number, message: string) => void;
  onLeave: (code: number) => void;
}

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client(WS_ENDPOINT);
  }
  return client;
}

/**
 * Connect to a Colyseus room with auth token.
 * Subscribes to message-only handlers — NO Schema state sync.
 */
export async function connect(
  token: string,
  roomName: string,
  handlers: MessageHandlers,
): Promise<Room> {
  const colyseus = getClient();
  const room = await colyseus.joinOrCreate(roomName, { token });

  // Message-only subscriptions (dumb terminal protocol)
  room.onMessage(MessageTypes.NARRATE, handlers.onNarrate);
  room.onMessage(MessageTypes.ROOM_HEADER, handlers.onRoomHeader);
  room.onMessage(MessageTypes.SHARD_STATE, handlers.onShardState);
  room.onMessage(MessageTypes.COMBAT_RESULT, handlers.onCombatResult);

  room.onError((code, message) => handlers.onError(code, message ?? 'Unknown error'));
  room.onLeave((code) => handlers.onLeave(code));

  return room;
}

/** Send a player command to the server. */
export function sendCommand(room: Room, verb: string, args: string[] = []): void {
  room.send(MessageTypes.COMMAND, { verb, args });
}

/** Parse raw input into verb + args and send. */
export function sendRawCommand(room: Room, input: string): void {
  const trimmed = input.trim();
  if (!trimmed) return;
  const parts = trimmed.split(/\s+/);
  const verb = parts[0];
  const args = parts.slice(1);
  sendCommand(room, verb, args);
}

/** Reset the client instance (for testing or reconnect). */
export function resetClient(): void {
  client = null;
}
