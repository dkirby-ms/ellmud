/**
 * Character name validation — unit tests.
 */

import { describe, it, expect } from 'vitest';
import { validateCharacterName } from '@ellmud/shared';

describe('validateCharacterName', () => {
  // ─── Valid names ───────────────────────────────────────────────────────────

  it('accepts a properly formatted name', () => {
    expect(validateCharacterName('Drizzt')).toEqual({ valid: true });
  });

  it('accepts a two-character name', () => {
    expect(validateCharacterName('Al')).toEqual({ valid: true });
  });

  it('accepts a 24-character name', () => {
    const name = 'A' + 'b'.repeat(23);
    expect(validateCharacterName(name)).toEqual({ valid: true });
  });

  // ─── Length validation ─────────────────────────────────────────────────────

  it('rejects empty string', () => {
    const result = validateCharacterName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects single character', () => {
    const result = validateCharacterName('A');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('2 and 24');
  });

  it('rejects name longer than 24 characters', () => {
    const name = 'A' + 'b'.repeat(24);
    const result = validateCharacterName(name);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('2 and 24');
  });

  // ─── Alpha-only validation ────────────────────────────────────────────────

  it('rejects names with numbers', () => {
    const result = validateCharacterName('Drizzt123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('alphabetic');
  });

  it('rejects names with spaces', () => {
    const result = validateCharacterName('Drizzt Do');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('alphabetic');
  });

  it('rejects names with special characters', () => {
    const result = validateCharacterName('Drizzt-Do');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('alphabetic');
  });

  it('rejects names with underscores', () => {
    const result = validateCharacterName('Drizzt_Do');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('alphabetic');
  });

  // ─── Capitalization ───────────────────────────────────────────────────────

  it('rejects names starting with lowercase', () => {
    const result = validateCharacterName('drizzt');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('capital');
  });

  it('rejects all-uppercase names', () => {
    const result = validateCharacterName('DRIZZT');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('first letter');
  });

  it('rejects mixed case (capital in middle)', () => {
    const result = validateCharacterName('DriZzt');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('first letter');
  });

  // ─── Profanity filter ─────────────────────────────────────────────────────

  it('rejects names containing profanity', () => {
    const result = validateCharacterName('Shithead');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('inappropriate');
  });

  it('rejects profanity embedded in longer word', () => {
    const result = validateCharacterName('Assmaster');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('inappropriate');
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  it('rejects null/undefined input', () => {
    expect(validateCharacterName(null as unknown as string).valid).toBe(false);
    expect(validateCharacterName(undefined as unknown as string).valid).toBe(false);
  });
});
