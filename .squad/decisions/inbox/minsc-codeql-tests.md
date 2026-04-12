# Decision: Security Test Coverage for CodeQL Alert Fixes (Issue #419)

**Author:** Minsc (Tester)
**Date:** 2025-07-21
**Status:** Implemented

## Context
CodeQL flagged security issues in chat sanitization, email regex (ReDoS), and missing rate limiting. Drizzt is fixing implementations in parallel.

## Decision
Created 60 security tests across 3 files testing expected secure behavior rather than implementation details. Tests target public APIs so they remain valid regardless of implementation approach.

### Test Strategy
- **Sanitization (28 tests):** Tests all three chat handlers independently despite shared sanitizeInput() — catches future divergence.
- **ReDoS (27 tests):** Uses performance.now() timing assertions (< 100ms) on adversarial inputs.
- **Rate Limiting (5 tests):** Uses vi.resetModules() to test both ALLOW_LOCAL_AUTH branches.

## Impact
- No changes to production code
- All 60 tests passing against current codebase
- Tests serve as regression guards for Drizzt's fixes
