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

## Learnings

### AnsiToolbar Component Tests (execCommand undo/redo support)

**What was tested:**
- Created comprehensive test suite for AnsiToolbar component's tag insertion behavior
- 50 tests covering all aspects: button rendering, tag insertion, selection wrapping, cursor positioning, edge cases
- Test file: `packages/client/src/components/admin/__tests__/AnsiToolbar.test.tsx`

**Pattern Discovery:**
- `document.execCommand` is not available in jsdom/happy-dom test environments
- Needed to mock `execCommand` to simulate its behavior: manually update textarea value + fire input event
- The new `execCommand` approach bypasses the `onInsert` callback - value changes now happen via native input events
- This matches the pattern already used in AnsiDescriptionEditor.tsx

**Coverage Notes:**
- ✅ All 18 color/bright-color buttons render correctly
- ✅ All 4 modifier buttons (bold, dim, italic, underline) render correctly
- ✅ Tag insertion at cursor position (empty selection) works for all tag types
- ✅ Tag wrapping around selected text works correctly
- ✅ Cursor positioning after insertion: between tags (empty) or after wrapped text (with selection)
- ✅ Multiple sequential insertions work as expected
- ✅ Edge cases: null ref, multiline text, rapid clicks, selection across newlines
- ✅ Button accessibility: type="button" to prevent form submission, title attributes for ARIA

**Mock Implementation Pattern:**
```typescript
// Mock document.execCommand for jsdom
document.execCommand = vi.fn((command, _showUI, value) => {
  if (command === 'insertText') {
    const el = document.activeElement;
    const { selectionStart, selectionEnd, value: current } = el;
    el.value = current.slice(0, selectionStart) + value + current.slice(selectionEnd);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
});
```

**Test Wrapper Pattern:**
- Test wrapper provides textarea ref + input event handler (not onInsert callback)
- Input event handler captures value changes from execCommand
- This simulates how AnsiToolbar is actually used in the admin UI

**Key Learnings:**
- Browser-native features like undo/redo (Ctrl+Z) cannot be meaningfully tested in unit tests
- Focus tests on the actual behavior (tag insertion, cursor positioning) not the undo stack
- When testing components that use deprecated browser APIs (execCommand), mock the API to simulate behavior
- execCommand approach means value updates happen via input events, not callbacks
- Always check if component implementation has changed before writing tests (AnsiToolbar was already using execCommand)

**Test Quality:**
- All 50 tests passing
- No false confidence patterns
- Clear, descriptive test names
- Comprehensive edge case coverage
- Tests document expected behavior for future maintainers

### 2026-04-13: AnsiToolbar Test Coverage & Test Quality Proposal
**Status:** ✅ Complete

📌 Team update (2026-04-13T1145Z): Testing Components with document.execCommand — Mock execCommand in test setup to simulate browser behavior in jsdom. Decided by Minsc.

📌 Team update (2026-04-13T1145Z): Test Quality Guard Rails — Proposal to ban tautological assertions and establish lint-level quality gates. Decided by Minsc.

**Work Done:**
- Wrote 50 comprehensive tests for AnsiToolbar (buttons, tag insertion, selection wrapping, cursor positioning, edge cases)
- Mocked `document.execCommand("insertText")` to simulate browser behavior in jsdom/happy-dom test environments
- All 50 tests passing; no false-confidence patterns

**Test Pattern:**
The mock accurately simulates tag insertion: modify selection, fire input event, let parent React component handle state update.

**Quality Initiative:**
Proposed ESLint rule to flag `expect(true).toBe(true)` and similar tautological assertions that create false confidence.

Cross-team note: Regis implemented the undo/redo pattern these tests verify.

---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.
