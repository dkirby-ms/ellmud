/**
 * Extraction module — channeled escape mechanic.
 */
export {
  ExtractionSystem,
  type ExtractionChannel,
  type ExtractionStartResult,
  type ExtractionTickResult,
  type NoiseEvent,
} from './ExtractionSystem.js';

export {
  transferInventoryToStash,
  type TransferResult,
  type RetainedItem,
} from './stash-transfer.js';
