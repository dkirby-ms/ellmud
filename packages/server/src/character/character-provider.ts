/**
 * character-provider.ts — Singleton provider for CharacterRepository.
 * DATABASE_URL gated — falls back to InMemory when not set.
 */

import type { CharacterRepository } from './CharacterRepository.js';
import { PgCharacterRepository } from './PgCharacterRepository.js';
import { InMemoryCharacterRepository } from './InMemoryCharacterRepository.js';

let _repo: CharacterRepository | null = null;
let _usePg = false;

export function initCharacterProvider(usePg: boolean): void {
  _repo = usePg ? new PgCharacterRepository() : new InMemoryCharacterRepository();
  _usePg = usePg;
}

export function getCharacterRepository(): CharacterRepository {
  if (!_repo) {
    _repo = new InMemoryCharacterRepository();
  }
  return _repo;
}

export function isCharacterPg(): boolean {
  return _usePg;
}

export function resetCharacterProvider(): void {
  _repo = null;
  _usePg = false;
}
