/**
 * MessageCollector — captures all typed messages from a test client for assertions.
 * Wires up listeners for every known MessageType so tests don't need boilerplate.
 */
import { MessageTypes } from '@ellmud/shared';
import type { NarrateMessage, RoomHeaderMessage, ShardStateMessage, RoomSwitchMessage, ExtractionMessage } from '@ellmud/shared';

export interface CollectedMessage {
  type: string;
  data: unknown;
  receivedAt: number;
}

export class MessageCollector {
  readonly all: CollectedMessage[] = [];
  readonly narrate: NarrateMessage[] = [];
  readonly roomHeader: RoomHeaderMessage[] = [];
  readonly shardState: ShardStateMessage[] = [];
  readonly roomSwitch: RoomSwitchMessage[] = [];
  readonly extractionState: ExtractionMessage[] = [];

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

    client.onMessage(MessageTypes.SHARD_STATE, (data) => {
      const msg = data as ShardStateMessage;
      this.shardState.push(msg);
      this.all.push({ type: MessageTypes.SHARD_STATE, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.ROOM_SWITCH, (data) => {
      const msg = data as RoomSwitchMessage;
      this.roomSwitch.push(msg);
      this.all.push({ type: MessageTypes.ROOM_SWITCH, data: msg, receivedAt: Date.now() });
    });

    client.onMessage(MessageTypes.EXTRACTION_STATE, (data) => {
      const msg = data as ExtractionMessage;
      this.extractionState.push(msg);
      this.all.push({ type: MessageTypes.EXTRACTION_STATE, data: msg, receivedAt: Date.now() });
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
    this.shardState.length = 0;
    this.roomSwitch.length = 0;
    this.extractionState.length = 0;
  }
}
