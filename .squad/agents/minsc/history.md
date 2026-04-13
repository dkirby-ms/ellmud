# minsc — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

**Role:** Test Infrastructure

**Key Focus Areas:**
- Core responsibilities for this agent
- Integration with wider system architecture  
- Test coverage and reliability
- Documentation and knowledge transfer

**Recent Work (Last 30 Lines):**

### What was done
- All 29 corpse container tests now passing with full Jarlaxle implementation
- Tests uncommented and verified against implemented features
- Comprehensive coverage of corpse creation, container properties, loot contents, and command integration
- No regressions; all 3480+ tests in suite passing

### Test Coverage Summary
- Corpse Creation: Item appears in room with proper name and roomDescription
- Container Properties: Adequate slots/weight, no item type restrictions
- Loot Contents: All creature loot present with correct quantities
- No Direct Loot: Players must use open/take commands to loot
- Multiple Deaths: Distinct corpses created for each creature death
- Empty Loot: Corpses created even for creatures with no loot
- Command Integration: Open, take, and other container commands work seamlessly
- Edge Cases: Single items, many items, persistence, name matching
- System Integration: Uses existing container infrastructure without new entity types

### Collaboration Results
- TDD approach successful: tests guided implementation without blocking
- Clear contract: tests documented expected behavior from day one
- Parallel development: Minsc's tests enabled Jarlaxle to implement independently
- Regression protection: comprehensive test suite prevents future breakage
- Pattern reusability: container test patterns extended to corpse system

### Key Learnings
- Spec-based TDD works well for features with clear, testable contracts
- Reusing existing container infrastructure avoids custom entity types
- Placeholder tests can be written before implementation with clear design guidance
- Test patterns from established systems (container-commands) transfer cleanly to new features

---

### False Confidence Audit (PR #450)

**What was done:**
- Audited all 180 test files across client, server, shared, and e2e packages
- Identified and fixed 6 critical + 3 moderate false-confidence anti-patterns in 4 files
- All 3488 unit tests passing after fixes

**Findings:**
- The test suite is generally healthy — false confidence was concentrated in integration/edge-case tests
- Primary pattern: `expect(true).toBe(true)` used as "didn't crash" placeholder (5 instances in 4 files)
- Secondary patterns: discarded `.some()` result without assertion; vacuous `toBeGreaterThanOrEqual(0)`
- pg-* repository tests, MetricsService tests, and UI component mocks are all legitimate — they mock dependencies, not the SUT

**Key Learnings:**
- Automated scanning (regex/AST) produces many false positives for mocking anti-patterns; manual review is essential to distinguish "mocking the dependency" (correct) from "mocking the SUT" (false confidence)
- `expect(true).toBe(true)` is the most reliable signal for false confidence — easy to grep, always a real problem
- Tests that omit assertions entirely are less dangerous than tautological assertions because most test runners can be configured to fail on zero-assertion tests
- `toBeGreaterThanOrEqual(0)` on array lengths is always vacuous — prefer `toBeGreaterThan(0)` or exact counts

---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.
