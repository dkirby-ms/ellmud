/**
 * Skills provider — singleton skill-persistence infrastructure initialized at server boot.
 *
 * Rooms import getSkillsRepository() to get the shared instance.
 * In production with DATABASE_URL, returns PgPlayerSkillsRepository; otherwise in-memory.
 *
 * Issue #457 — Stat Progression.
 */

import type { PlayerSkillsRepository } from './PlayerSkillsRepository.js';
import { InMemoryPlayerSkillsRepository } from './InMemoryPlayerSkillsRepository.js';
import { PgPlayerSkillsRepository } from './PgPlayerSkillsRepository.js';

let _repo: PlayerSkillsRepository | null = null;
let _usePg = false;

/**
 * Initialize the skills provider. Called once at server boot.
 * Must be called before any room uses the skills repository.
 */
export function initSkillsProvider(usePg: boolean): void {
  _repo = usePg ? new PgPlayerSkillsRepository() : new InMemoryPlayerSkillsRepository();
  _usePg = usePg;
}

/** Get the shared skills repository. Falls back to in-memory if not initialized. */
export function getSkillsRepository(): PlayerSkillsRepository {
  if (!_repo) {
    _repo = new InMemoryPlayerSkillsRepository();
  }
  return _repo;
}

/** Whether the skills provider is using PostgreSQL. */
export function isSkillsPg(): boolean {
  return _usePg;
}

/** Reset for testing. */
export function resetSkillsProvider(): void {
  _repo = null;
  _usePg = false;
}
