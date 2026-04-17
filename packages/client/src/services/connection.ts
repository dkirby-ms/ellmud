/**
 * Colyseus connection service — message-only protocol.
 *
 * CRITICAL: No Schema subscriptions. The client is a dumb terminal.
 * We subscribe ONLY to room.onMessage() handlers for narrated prose.
 */

import { Client, Room } from '@colyseus/sdk';
import {
  MessageTypes,
  type NarrateMessage,
  type RoomHeaderMessage,
  type ZoneStateMessage,
  type CombatResultMessage,
  type RoomSwitchMessage,
  type RoomSwitchOptions,
  type LoadoutUpdateMessage,
  type StashUpdateMessage,
  type ZoneTransferMessage,
  type EquipItemMessage,
  type UnequipItemMessage,
  type RoomOccupantsMessage,
  type FlagStateMessage,
  type ToggleFlagMessage,
  type InventoryUpdateMessage,
  type HelpDataMessage,
  type EffectiveStatsMessage,
} from '@ellmud/shared';

const WS_ENDPOINT = import.meta.env.VITE_WS_URL ??
  (window.location.protocol === 'https:'
    ? `wss://${window.location.host}`
    : `ws://${window.location.hostname}:2567`);

export interface MessageHandlers {
  onNarrate: (msg: NarrateMessage) => void;
  onRoomHeader: (msg: RoomHeaderMessage) => void;
  onZoneState: (msg: ZoneStateMessage) => void;
  onCombatResult: (msg: CombatResultMessage) => void;
  onRoomSwitch: (msg: RoomSwitchMessage) => void;
  onZoneTransfer?: (msg: ZoneTransferMessage) => void;
  onLoadoutUpdate?: (msg: LoadoutUpdateMessage) => void;
  onStashUpdate?: (msg: StashUpdateMessage) => void;
  onInventoryUpdate?: (msg: InventoryUpdateMessage) => void;
  onPlayerState?: (msg: import('@ellmud/shared').PlayerStateMessage) => void;
  onRoomOccupants?: (msg: RoomOccupantsMessage) => void;
  onFlagState?: (msg: FlagStateMessage) => void;
  onHelpData?: (msg: HelpDataMessage) => void;
  onEffectiveStats?: (msg: EffectiveStatsMessage) => void;
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
  characterId?: string,
): Promise<Room> {
  const colyseus = getClient();
  const joinOptions: Record<string, unknown> = { token };
  if (characterId) joinOptions.characterId = characterId;
  const room = await colyseus.joinOrCreate(roomName, joinOptions);

  // Message-only subscriptions (dumb terminal protocol)
  room.onMessage(MessageTypes.NARRATE, handlers.onNarrate);
  room.onMessage(MessageTypes.ROOM_HEADER, handlers.onRoomHeader);
  room.onMessage(MessageTypes.ZONE_STATE, handlers.onZoneState);
  room.onMessage(MessageTypes.COMBAT_RESULT, handlers.onCombatResult);
  room.onMessage(MessageTypes.ROOM_SWITCH, handlers.onRoomSwitch);
  if (handlers.onLoadoutUpdate) {
    room.onMessage(MessageTypes.LOADOUT_UPDATE, handlers.onLoadoutUpdate);
  }
  if (handlers.onStashUpdate) {
    room.onMessage(MessageTypes.STASH_UPDATE, handlers.onStashUpdate);
  }
  if (handlers.onInventoryUpdate) {
    room.onMessage(MessageTypes.INVENTORY_UPDATE, handlers.onInventoryUpdate);
  }
  if (handlers.onPlayerState) {
    room.onMessage(MessageTypes.PLAYER_STATE, handlers.onPlayerState);
  }
  if (handlers.onZoneTransfer) {
    room.onMessage(MessageTypes.ZONE_TRANSFER, handlers.onZoneTransfer);
  }
  if (handlers.onRoomOccupants) {
    room.onMessage(MessageTypes.ROOM_OCCUPANTS, handlers.onRoomOccupants);
  }
  if (handlers.onFlagState) {
    room.onMessage(MessageTypes.FLAG_STATE, handlers.onFlagState);
  }
  if (handlers.onHelpData) {
    room.onMessage(MessageTypes.HELP_DATA, handlers.onHelpData);
  }
  if (handlers.onEffectiveStats) {
    room.onMessage(MessageTypes.EFFECTIVE_STATS, handlers.onEffectiveStats);
  }

  room.onError((code, message) => handlers.onError(code, message ?? 'Unknown error'));
  room.onLeave((code) => handlers.onLeave(code));

  return room;
}

/**
 * Switch from the current room to a new one.
 * Cleanly leaves the current room, joins the target, and re-registers handlers.
 */
export async function switchRoom(
  currentRoom: Room,
  targetRoomName: string,
  token: string,
  handlers: MessageHandlers,
  options?: RoomSwitchOptions,
  characterId?: string,
): Promise<Room> {
  // Leave the current room cleanly
  await currentRoom.leave();

  // Join or create the target room
  const colyseus = getClient();
  const roomId = typeof options?.roomId === 'string' ? options.roomId : undefined;
  const joinOptions: Record<string, unknown> = options ? { ...options } : {};
  if (characterId) joinOptions.characterId = characterId;
  if (roomId) {
    delete (joinOptions as { roomId?: string }).roomId;
  }
  const newRoom = roomId
    ? await colyseus.joinById(roomId, { token, ...joinOptions })
    : await colyseus.joinOrCreate(targetRoomName, { token, ...joinOptions });

  // Re-register all message handlers on the new room
  newRoom.onMessage(MessageTypes.NARRATE, handlers.onNarrate);
  newRoom.onMessage(MessageTypes.ROOM_HEADER, handlers.onRoomHeader);
  newRoom.onMessage(MessageTypes.ZONE_STATE, handlers.onZoneState);
  newRoom.onMessage(MessageTypes.COMBAT_RESULT, handlers.onCombatResult);
  newRoom.onMessage(MessageTypes.ROOM_SWITCH, handlers.onRoomSwitch);
  if (handlers.onLoadoutUpdate) {
    newRoom.onMessage(MessageTypes.LOADOUT_UPDATE, handlers.onLoadoutUpdate);
  }
  if (handlers.onStashUpdate) {
    newRoom.onMessage(MessageTypes.STASH_UPDATE, handlers.onStashUpdate);
  }
  if (handlers.onInventoryUpdate) {
    newRoom.onMessage(MessageTypes.INVENTORY_UPDATE, handlers.onInventoryUpdate);
  }
  if (handlers.onPlayerState) {
    newRoom.onMessage(MessageTypes.PLAYER_STATE, handlers.onPlayerState);
  }
  if (handlers.onZoneTransfer) {
    newRoom.onMessage(MessageTypes.ZONE_TRANSFER, handlers.onZoneTransfer);
  }
  if (handlers.onRoomOccupants) {
    newRoom.onMessage(MessageTypes.ROOM_OCCUPANTS, handlers.onRoomOccupants);
  }
  if (handlers.onFlagState) {
    newRoom.onMessage(MessageTypes.FLAG_STATE, handlers.onFlagState);
  }
  if (handlers.onHelpData) {
    newRoom.onMessage(MessageTypes.HELP_DATA, handlers.onHelpData);
  }
  if (handlers.onEffectiveStats) {
    newRoom.onMessage(MessageTypes.EFFECTIVE_STATS, handlers.onEffectiveStats);
  }

  newRoom.onError((code, message) => handlers.onError(code, message ?? 'Unknown error'));
  newRoom.onLeave((code) => handlers.onLeave(code));

  return newRoom;
}

/** Send a player command to the server. */
export function sendCommand(room: Room, verb: string, args: string[] = []): void {
  room.send(MessageTypes.COMMAND, { verb, args });
}

/** Send equip item request to server. */
export function sendEquipItem(room: Room, msg: EquipItemMessage): void {
  room.send(MessageTypes.EQUIP_ITEM, msg);
}

/** Send unequip item request to server. */
export function sendUnequipItem(room: Room, msg: UnequipItemMessage): void {
  room.send(MessageTypes.UNEQUIP_ITEM, msg);
}

/** Send toggle-flag request to server. */
export function sendToggleFlag(room: Room, msg: ToggleFlagMessage): void {
  room.send(MessageTypes.TOGGLE_FLAG, msg);
}

/** Request the server-wide player list (who list). */
export function sendRequestPlayerList(room: Room): void {
  room.send(MessageTypes.REQUEST_PLAYER_LIST, {});
}

/** Direction aliases — single letters and bare direction words expand to "go <dir>". */
const DIRECTION_ALIASES: Record<string, [string, string]> = {
  n: ['go', 'north'], s: ['go', 'south'], e: ['go', 'east'],
  w: ['go', 'west'],  u: ['go', 'up'],    d: ['go', 'down'],
  north: ['go', 'north'], south: ['go', 'south'], east: ['go', 'east'],
  west: ['go', 'west'],   up: ['go', 'up'],       down: ['go', 'down'],
};

/** Parse raw input into verb + args and send. */
export function sendRawCommand(room: Room, input: string): void {
  const trimmed = input.trim();
  if (!trimmed) return;
  const parts = trimmed.split(/\s+/);
  let verb = parts[0]!.toLowerCase();
  let args = parts.slice(1);

  const alias = DIRECTION_ALIASES[verb];
  if (alias) {
    verb = alias[0];
    args = [alias[1]];
  }

  sendCommand(room, verb, args);
}

/** Reset the client instance (for testing or reconnect). */
export function resetClient(): void {
  client = null;
}
