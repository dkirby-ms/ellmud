# regis — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

**Role:** Client Architect

**Key Focus Areas:**
- Core responsibilities for this agent
- Integration with wider system architecture  
- Test coverage and reliability
- Documentation and knowledge transfer

**Recent Work (Last 30 Lines):**

  - Item count source: `inventory.length` when in zone, `stash.length` in stash room
  - Empty-state message: "No items carried." when in zone, "No items in stash." in stash room
- TypeScript build passes. Component properly leverages existing `inZone` prop for context-aware UI.
- Decision documented in `.squad/decisions.md`: All future text additions to this component must follow the same `inZone` conditional pattern.

### 2026-04-13: Issue #445 — Zone Designer Exit Icon Clickability
**Status:** ✅ Complete and Merged — branch `squad/445-zone-designer-exit-icons`, commit 80119f0, PR #448 squash-merged to dev

**Problem:** Up/down exit icons in zone designer were not clickable for editing. No visual feedback for connected exits when a room was selected.

**Changes:**
- **ZoneRoomNode.tsx:** Added `pointerEvents: 'auto'` to up/down exit indicator container, made icons interactive with hover effects (1.3x scale + color change), added onClick handlers
- **ZoneExitEdge.tsx:** Added `highlighted` property to edge data for connected exit visualization
- **ZoneDesigner.tsx:** When room selected, highlight all connected exits in cyan; added handlers for up/down icon clicks to select exits; clear highlighting on canvas click/ESC
- Connected exits now glow cyan when their room is selected
- Exit labels show for highlighted exits (like selected/hovered)

**Code Review:** Approved by Elminster (2026-04-13T00:05Z). All React/TypeScript patterns correct. Edge cases handled.

## Learnings from #445 Implementation

- **ReactFlow pointer events:** Child elements inside ReactFlow nodes inherit `pointerEvents: 'none'` by default. Must explicitly set `pointerEvents: 'auto'` on interactive elements.
- **Event propagation:** Use `e.stopPropagation()` in onClick handlers to prevent the click from bubbling to the parent node and triggering node selection.
- **Visual affordance:** Hover effects (scale + color change) are critical for indicating clickability of small icon elements.
- **Connected topology visualization:** Highlighting all connected exits (both incoming and outgoing) when a room is selected helps users understand room connectivity patterns in complex zones.

### 2026-04-15: ANSI Toolbar Undo/Redo Support
**Status:** ✅ Complete — AnsiToolbar.tsx updated

**Problem:** When users clicked color toggle buttons in the ANSI toolbar (used by AnsiTextarea), the direct string manipulation bypassed the browser's native undo stack. Ctrl+Z/Ctrl+Y did not work for tag insertions.

**Solution:** Updated `insertTag()` function in AnsiToolbar.tsx to use `document.execCommand("insertText")` pattern (same as AnsiDescriptionEditor already uses). This hooks into browser's native undo/redo.

**Changes:**
- **AnsiToolbar.tsx:** Replaced direct string manipulation with `document.execCommand("insertText", false, wrapped)` approach
- `execCommand` fires input event → textarea's onChange handler captures it → parent state updates
- Removed manual `onInsert(newValue)` call (now redundant)
- Cursor positioning logic updated to match AnsiDescriptionEditor pattern
- TypeScript build passes; all 415 client tests pass

## Learnings — ANSI Toolbar Undo/Redo

- **Browser undo stack integration:** `document.execCommand("insertText")` is technically deprecated but is the ONLY way to hook into native undo/redo (Ctrl+Z/Ctrl+Y) for plain textareas. This is the established pattern in this codebase.
- **Event flow:** `execCommand` modifies the textarea and fires an `input` event, which React's onChange handler catches naturally. No manual state updates needed.
- **Cursor positioning:** Use `requestAnimationFrame()` to ensure cursor positioning happens after React re-render. Position cursor inside empty tags or at end of wrapped selection.
- **Component consistency:** AnsiDescriptionEditor and AnsiToolbar now use identical tag insertion patterns, ensuring consistent undo behavior across all ANSI editors.

### 2026-04-13: ANSI Toolbar + AnsiTextarea Component Build
**Status:** ✅ Merged to dev — PR #449, branch `squad/admin-ansi-toolbar`

**Problem:** Content editors found the old Color Reference palette confusing — it copied ANSI tags to clipboard but never inserted them into the textarea. UI was fragmented across admin pages with raw `<textarea> + <AnsiPreview>` pairs.

**Changes:** Extracted `AnsiToolbar` component that directly inserts/wraps ANSI tags at cursor. Created `AnsiTextarea` composite component (toolbar + textarea + preview) as canonical pattern. Migrated all 7 admin detail pages (Creature, Items, Rooms, Skills, Factions, Zones) to use AnsiTextarea. Removed non-functional Color Reference from AnsiPreview — now read-only only. Removed duplicate Live Preview panel from CreatureDetail.

**Code Review:** Approved by Elminster (2026-04-13T00:28:21Z). Clean component extraction, no breaking changes, backward-compatible with read-only AnsiPreview.

### 2026-04-13: Publish Workflow Refactor — Status Simplification
**Status:** ✅ Merged to dev — PR #448, branch `squad/publish-refactor`

**Changes:** Implemented user directive to simplify content workflow: removed `review` status, changed "Submit Review" button label to "Publish" across 9 admin detail pages (CreatureDetail, ItemsDetail, RoomsDetail, SkillsDetail, FactionsDetail, ZonesDetail). Updated CreaturesList and ItemsList status type unions to `draft | published | deprecated`. Updated AuditLog filter dropdown to remove "Review" action option.

**Code Review:** Approved by Elminster (2026-04-13T00:05Z). Consistency verified across all pages. Zero regressions. Type-narrowing and UI-label change only, no behavioral changes.

### 2026-04-12: Issue #438 — Remove Collapse Timer from Client
**Status:** ✅ Complete — branch `squad/438-starting-items-no-collapse`, commit 1899488

**Changes:**
- **store.ts:** Removed `collapseTimer` and `collapseTimerMax` from `AppState`, `initialState`, `SET_ZONE_STATE` action, and `SET_COLLAPSE_TIMER` action + reducer case. Simplified `SET_ZONE_STATE` reducer to just set `zoneState`.
- **useZoneConnection.ts:** Simplified `onZoneState` handler — no longer passes `collapseTimer` to dispatch, no longer shows timer countdown in system message.
- **store.test.ts:** Removed 5 tests for collapse timer behavior (SET_ZONE_STATE timer tests + SET_COLLAPSE_TIMER tests). Updated basic SET_ZONE_STATE test to use `'open'` state.
- **Compass/stability tests:** Left `stability` in test fixtures — still present in shared `RoomHeaderMessage` type.
- TypeScript build passes clean. All 415 client tests pass.
- **Context:** Zone lifecycle (Seeding→Open→Active→Destabilising→Collapse) removed server-side; zones are now persistent MUD-style. Drizzt handling shared type changes in parallel.

## Learnings from #438 Implementation

- **ZoneStateMessage protocol:** Shared types in `packages/shared` define the message schema. Server publishes; client subscribes. Removing `collapseTimer` field required parallel updates: server stops sending it, client stops expecting it.
- **Client store simplicity:** Removal of timer-related state + actions streamlined Redux reducer logic. The pattern: if a field is no longer published by server, remove all client state tracking + UI display.
- **Backward compatibility:** Kept `stability` field in `RoomHeaderMessage` even though it's always 1.0 now. Useful for future (dynamic stability calculations) and doesn't hurt current UX.
- **Message handler robustness:** Client should gracefully handle missing fields in messages from server. `onZoneState` handler no longer assumes `collapseTimer` exists.
- **Test coverage:** Removal tests were valuable — they caught that the SET_COLLAPSE_TIMER action was orphaned in the reducer.

## Post-Implementation Documentation — Issue #438 (2026-04-12T17:31Z)

**Scribe:** Documented orchestration for squad. Merged decisions, updated team records.

Outcomes: 5 files changed, 415 client tests all passing. Client state + hooks simplified. PR #439 merged.


### 2026-04-13: ANSI Toolbar Undo/Redo Integration
**Status:** ✅ Complete

📌 Team update (2026-04-13T1145Z): ANSI Editor Undo/Redo Pattern — Use `document.execCommand("insertText")` for tag insertions to integrate with browser undo stack. Decided by Regis.

**Problem:** AnsiToolbar buttons bypassed browser's native undo stack; Ctrl+Z/Ctrl+Y didn't work for ANSI tag insertions.

**Solution:** Switch to `document.execCommand("insertText")` (already used in AnsiDescriptionEditor) to hook into browser undo stack.

**Impact:** All ANSI editors now support native undo/redo. Zero breaking changes.

Cross-team note: Minsc created 50 tests with `document.execCommand` mocked for jsdom environment.

---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.

### 2026-04-15: Admin Content Editors — Remove Draft/Publish Pattern
**Status:** ✅ Complete

**Problem:** Admin content editors had a confusing two-button pattern ("Save Draft" + "Publish"). This required content creators to understand draft vs published states, but in practice all content should be published immediately.

**Changes:**
- Removed "Save Draft" button from 6 admin detail pages: CreatureDetail, ItemsDetail, SkillsDetail, RoomsDetail, FactionsDetail, ZonesDetail
- Single "Save" button now always saves content as status: published
- Button uses gold styling and Save icon
- Simplified handleSave functions
- Removed Send icon imports
- Kept status badge display for backward compatibility

**Files Modified:**
1. CreatureDetail.tsx — Updated handleSave, removed Save Draft button
2. ItemsDetail.tsx — Merged handleSave and handlePublish
3. SkillsDetail.tsx — Updated handleSave to always publish
4. RoomsDetail.tsx — Updated handleSave to always publish
5. FactionsDetail.tsx — Updated handleSave to always publish
6. ZonesDetail.tsx — Merged handleSave and handleSubmit

**Validation:**
- TypeScript compilation passes clean
- All 465 client tests pass
- Backend ContentRegistry filters WHERE status = published

## Learnings — Draft/Publish Simplification

- Single-button pattern is clearer: The draft/publish two-button workflow added cognitive load without value.
- Status field retained: Kept status field in data model for backward compatibility and future flexibility.
- Consistent save behavior: Some pages had functional Publish buttons, others had non-functional placeholders. Standardizing to single Save button removed this inconsistency.
- Button styling matters: Using gold button style for primary Save action provides clear visual hierarchy.
