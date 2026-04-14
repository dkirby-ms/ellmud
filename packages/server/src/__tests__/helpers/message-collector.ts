/**
 * MessageCollector — captures all typed messages from a test client for assertions.
 * Wires up listeners for every known MessageType so tests don't need boilerplate.
 */
import { MessageTypes } from '@ellmud/shared';
import type { NarrateMessage, RoomHeaderMessage, ZoneStateMessage, RoomSwitchMessage, OverlayMessage, PlayerStateMessage, LoadoutUpdateMessage, StashUpdateMessage, EffectiveStatsMessage } from '@ellmud/shared';

export interface CollectedMessage {
  type: string;
  data: unknown;
  receivedAt: number;
}

export class MessageCollector {
  readonly all: CollectedMessage[] = [];
  readonly narrate: NarrateMessage[] = [];
  readonly roomHeader: RoomHeaderMessage[] = [];
  readonly zoneState: ZoneStateMessage[] = [];
  readonly roomSwitch: RoomSwitchMessage[] = [];
  readonly overlayState: OverlayMessage[] = [];
  readonly playerState: PlayerStateMessage[] = [];
  readonly loadoutUpdate: LoadoutUpdateMessage[] = [];
  readonly stashUpdate: StashUpdateMessage[] = [];
  readonly effectiveStats: EffectiveStatsMessage[] = [];

  constructor(client: { onMessage: (type: string, cb: (data: unknown) => void) => void }) {
    client.onMessage(MessageTypes.NARRATE, (data) => {
      const msg = data as NarrateMessage;
      this.narrate.push(msg);
      this.all.push({ type: MessageTypes.NARRATE, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.ROOM_HEADER, (data) => {
      const msg = data as RoomHeaderMessage;
      this.roomHeader.push(msg);
      this.all.push({ type: MessageTypes.ROOM_HEADER, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.ZONE_STATE, (data) => {
      const msg = data as ZoneStateMessage;
      this.zoneState.push(msg);
      this.all.push({ type: MessageTypes.ZONE_STATE, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.ROOM_SWITCH, (data) => {
      const msg = data as RoomSwitchMessage;
      this.roomSwitch.push(msg);
      this.all.push({ type: MessageTypes.ROOM_SWITCH, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.OVERLAY_STATE, (data) => {
      const msg = data as OverlayMessage;
      this.overlayState.push(msg);
      this.all.push({ type: MessageTypes.OVERLAY_STATE, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.PLAYER_STATE, (data) => {
      const msg = data as PlayerStateMessage;
      this.playerState.push(msg);
      this.all.push({ type: MessageTypes.PLAYER_STATE, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.LOADOUT_UPDATE, (data) => {
      const msg = data as LoadoutUpdateMessage;
      this.loadoutUpdate.push(msg);
      this.all.push({ type: MessageTypes.LOADOUT_UPDATE, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.STASH_UPDATE, (data) => {
      const msg = data as StashUpdateMessage;
      this.stashUpdate.push(msg);
      this.all.push({ type: MessageTypes.STASH_UPDATE, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.EFFECTIVE_STATS, (data) => {
      const msg = data as EffectiveStatsMessage;
      this.effectiveStats.push(msg);
      this.all.push({ type: MessageTypes.EFFECTIVE_STATS, data: msg, receivedAt: Date.now() });
    });
  }

  /** Get all narrate messages of a specific narration type. */
  narrateByType(type: string): NarrateMessage[] {
    return this.narrate.filter((m) => m.type === type);
  }

  /** Get the latest message of a given wire type. */
  latest(type: string): CollectedMessage | undefined {
    const matching = this.all.filter((m) => m.type === type);
    return matching[matching.length - 1];
  }

  /** Total count of all received messages. */
  get count(): number {
    return this.all.length;
  }

  /** Clear all collected messages. */
  clear(): void {
    this.all.length = 0;
    this.narrate.length = 0;
    this.roomHeader.length = 0;
    this.zoneState.length = 0;
    this.roomSwitch.length = 0;
    this.overlayState.length = 0;
    this.playerState.length = 0;
    this.loadoutUpdate.length = 0;
    this.stashUpdate.length = 0;
    this.effectiveStats.length = 0;
  }
}
