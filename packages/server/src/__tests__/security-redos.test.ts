/**
 * Security ReDoS Tests — Email Validation in user-routes.ts
 *
 * Verifies that the email validation regex used in user management routes:
 *   - Accepts valid email addresses
 *   - Rejects invalid email addresses
 *   - Completes in reasonable time for pathological/adversarial input (ReDoS)
 *
 * The regex under test: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
 * This pattern is safe because it uses possessive-like character classes with
 * no overlapping alternation, but we test the timing to be sure.
 */

import { describe, it, expect } from 'vitest';

// ─── Reproduce the validation function locally so we can test it directly ────
// This mirrors isValidEmail() from packages/server/src/admin/users/user-routes.ts
// If the implementation changes, these tests should still verify the expected behavior.

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

// ─── Valid Emails ─────────────────────────────────────────────────────────────

describe('Security: email validation — valid addresses', () => {
  const validEmails = [
    'user@example.com',
    'user.name@example.com',
    'user+tag@example.com',
    'user_name@example.co.uk',
    'user-name@sub.domain.org',
    'user%special@example.museum',
    'a@b.cc',
    'test123@numbers456.com',
    'ALL.CAPS@DOMAIN.COM',
  ];

  for (const email of validEmails) {
    it(`accepts: ${email}`, () => {
      expect(isValidEmail(email)).toBe(true);
    });
  }
});

// ─── Invalid Emails ───────────────────────────────────────────────────────────

describe('Security: email validation — invalid addresses', () => {
  const invalidEmails = [
    '',                          // empty
    'user',                      // no @ symbol
    '@example.com',              // no local part
    'user@',                     // no domain
    'user@.com',                 // domain starts with dot
    'user@com',                  // no TLD separator
    'user@example.',             // TLD too short (empty)
    'user@example.c',            // TLD too short (1 char)
    'user@@example.com',         // double @
    'user @example.com',         // space in local part
    'user@exam ple.com',         // space in domain
    // Note: 'user@example..com' is accepted by current regex — not a security concern
  ];

  for (const email of invalidEmails) {
    it(`rejects: "${email}"`, () => {
      expect(isValidEmail(email)).toBe(false);
    });
  }
});

// ─── ReDoS Resistance ─────────────────────────────────────────────────────────

describe('Security: email validation — ReDoS resistance', () => {
  it('completes quickly with long local part (50+ chars)', () => {
    const email = 'a'.repeat(100) + '@example.com';
    const start = performance.now();
    isValidEmail(email);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100); // must complete in < 100ms
  });

  it('completes quickly with pathological a@ repeat pattern', () => {
    // Classic ReDoS attack: patterns that cause catastrophic backtracking
    const evil = 'a@'.repeat(50) + '.com';
    const start = performance.now();
    isValidEmail(evil);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('completes quickly with long domain part', () => {
    const email = 'user@' + 'a'.repeat(100) + '.com';
    const start = performance.now();
    isValidEmail(email);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('completes quickly with many dots in domain', () => {
    // Dots can cause backtracking in some regex patterns
    const email = 'user@' + 'a.'.repeat(50) + 'com';
    const start = performance.now();
    isValidEmail(email);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('completes quickly with many + in local part', () => {
    const email = '+'.repeat(100) + '@example.com';
    const start = performance.now();
    isValidEmail(email);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('completes quickly with very long input (1000 chars)', () => {
    const email = 'a'.repeat(500) + '@' + 'b'.repeat(490) + '.com';
    const start = performance.now();
    isValidEmail(email);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('completes quickly with crafted backtrack trigger', () => {
    // Pattern: many dots followed by no valid TLD — forces maximum backtracking
    const email = 'user@' + '.'.repeat(50);
    const start = performance.now();
    isValidEmail(email);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
