# regis — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Recent Work

### 2026-04-15: Hall of Fame Navigation Links
**Status:** ✅ Complete — Build verified

**Problem:** The Hall of Fame page (`/hall-of-fame`) existed but was not accessible from the UI. Users had no way to navigate to it from Character Select or during gameplay.

**Changes:**
1. **CharacterSelect.tsx** — Added Hall of Fame link to top bar:
   - Added Skull icon import from lucide-react
   - Added button with skull icon between username and Settings button
   - Navigates to `/hall-of-fame` on click
   - Styled consistently with other top bar buttons (text-secondary with gold hover)
   - Added tooltip: "Hall of Fame"

2. **ZoneExploration.tsx** — Added Hall of Fame link to game client top nav:
   - Added Skull icon import from lucide-react
   - Placed between username and Settings button in top navigation bar
   - Same styling and tooltip as Character Select
   - Accessible during gameplay, not obtrusive
   - Positioned as secondary nav item (not primary action)

**Testing:** TypeScript build passes clean. Client bundle builds successfully (no errors).

**Design Decisions:**
- Skull icon chosen to match Hall of Fame page aesthetic (memorial/permadeath theme)
- Placed in top bar as secondary nav item (not prominent, but accessible)
- Consistent placement in both screens (between user info and settings)
- Hover states use gold accent for consistency with MUD theme
- Small icon size (w-4 h-4) keeps it subtle and non-intrusive

**UX Flow:** Users can now access Hall of Fame from:
1. Character Select screen (before entering world) — view past lives/memorials
2. Game client during gameplay (quick access to check rankings/past characters)

### 2026-04-13T19:39:59Z: Spawn Manifest — Hall of Fame UI Links Deployment
**Status:** ✅ Complete — Build verified

📌 **Team Update:** Deployed Hall of Fame navigation links as part of permadeath feature completion (see Coordinator lint fixes + Jarlaxle starter kit reset).

**Outcome:** Completed Hall of Fame UI links for CharacterSelect and ZoneExploration. Part of three-agent spawn manifest:
- Coordinator: Lint fixes + hall_of_fame migration  
- Jarlaxle: Starter kit flag reset
- Regis: Hall of Fame UI links ← THIS

**Deliverable:** Skull icon links added to top navigation in both Character Select and Zone Exploration screens. Users can now access `/hall-of-fame` from anywhere.

---

### 2026-04-15: Permadeath UI — Death Screen + Hall of Fame Page
**Status:** ✅ Complete — Build verified

**Problem:** Permadeath mode needed client-side UI for permanent character deletion events and a memorial page for fallen heroes.

**Changes:**
1. **PermadeathOverlay.tsx** — Dramatic full-screen overlay for permanently deleted characters:
   - Displays character name, level, survival time, total kills/deaths, cause and zone of death
   - Large skull icon with "PERMANENT DEATH" title in danger red
   - Stats panel with legacy information
   - Memorial message: "Your story has ended. {CharacterName} will be remembered in the Hall of Fame."
   - Two action buttons: "Hall of Fame" (view memorial page) and "Return to Character Select"
   - Does NOT auto-dismiss (unlike normal death screen) — player must manually navigate

2. **HallOfFame.tsx** — Memorial page at `/hall-of-fame` route:
   - Dark, somber aesthetic with skull icon
   - Stats banner displaying server-wide permadeath statistics (total deaths, avg survival, deadliest zone/creature)
   - Table layout ranking all fallen characters by survival time (descending)
   - Columns: Rank, Character, Level, Survival Time, Kills, Cause of Death, Zone, Date
   - Top 3 heroes highlighted in gold
   - Pagination support (50 entries per page)
   - Empty state: "No fallen heroes yet. Will you be the first?"
   - API calls: `GET /api/hall-of-fame?page={}&perPage={}` and `GET /api/hall-of-fame/stats`

3. **api.ts** — Added Hall of Fame API functions:
   - `fetchHallOfFame(token, page, perPage)` — returns paginated hall of fame entries
   - `fetchHallOfFameStats(token)` — returns server-wide permadeath statistics
   - Type definitions for `HallOfFameEntry`, `HallOfFameStats`, `HallOfFameResponse`

4. **useZoneConnection.ts** — Updated overlay state and handler:
   - Extended `OverlayState` interface to include `'permadeath'` status and `permadeathData`
   - Added `PermadeathData` interface exported for component use
   - Updated overlay handler to process `'permadeath'` messages from server
   - Permadeath messages populate `overlay.permadeathData` from `msg.permadeathStats`
   - Room switch handler updated to protect permadeath overlays (like death overlays)

5. **ZoneExploration.tsx** — Wired permadeath overlay into game view:
   - Imported and rendered `PermadeathOverlay` component
   - Conditional rendering based on `overlay.status === 'permadeath'`
   - Separated normal death overlay from permadeath overlay

6. **routes.ts** — Added `/hall-of-fame` route to main navigation

7. **shared/index.ts** — Extended `OverlayMessage` interface:
   - Added `'permadeath'` to state union type
   - Added optional `permadeathStats` field with character legacy data

**Testing:** TypeScript build passes clean. Client bundle builds successfully (no errors).

**Design Decisions:**
- Permadeath overlay is modal and blocking — no auto-dismiss like normal death
- Hall of Fame is accessible from lobby/main menu (not just after permadeath)
- Top 3 heroes get gold highlighting — adds prestige to high survival times
- Survival time formatted as "Xd Yh Zm" for readability
- MUD aesthetic maintained: dark theme, monospace stats, serif character names, gold accents

**Backend Notes:** API endpoints `/api/hall-of-fame` and `/api/hall-of-fame/stats` are not yet implemented server-side. Components will gracefully handle 404 errors until backend adds these endpoints.

## Learnings

### Permadeath UI Implementation (2026-04-15)

- **Overlay state management:** Extended the existing overlay pattern (`'death'` → `'death' | 'permadeath'`) to support permanent character deletion events. The permadeath overlay does NOT auto-dismiss (unlike normal death), requiring explicit user navigation.
- **Shared type coordination:** The `OverlayMessage` interface in `@ellmud/shared` already included permadeath support with `permadeathStats` field, demonstrating good server-client coordination.
- **Graceful degradation:** API functions for Hall of Fame return proper TypeScript types but call non-existent endpoints. Components handle 404 errors gracefully with loading/error states.
- **Component separation:** Separated normal death overlay (simple, auto-dismissing) from permadeath overlay (dramatic, persistent, full component) for clearer UX distinction between temporary and permanent death.
- **Memorial aesthetics:** Hall of Fame uses dark theme, skull iconography, gold accents for top 3, and serif fonts for character names to create somber, prestigious tone befitting permanent character loss.
- **Time formatting:** Survival time displayed as "Xd Yh Zm" (e.g., "2d 14h 32m") for human readability across table rows and stat displays.

---

## Archived Work

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

### 2026-04-15: Permadeath UI Redesign — Reset Model (Not Deletion)
**Status:** Complete — TypeScript build verified

**Problem:** Initial permadeath UI implied permanent character deletion with funeral tone. Design changed: characters are RESET (level, inventory, equipment, skills wiped), not deleted. Stash is preserved. Death count persists. Past lives are recorded.

**Changes:**
1. **PermadeathOverlay.tsx:**
   - Title: PERMANENT DEATH changed to DEATH & REBIRTH (dramatic but not final)
   - Message updated to: Death claims your progress, but not your spirit. Character rises again, stripped of all but stash items
   - Button: Return to Character Select changed to Rise Again
   - Behavior: Dismissing overlay returns to gameplay (respawned character), NOT character select
   - handleReturnToLobby renamed to handleRiseAgain - just dismisses overlay, server handles respawn
   - Hall of Fame link preserved (past lives still recorded)
   - Stats display preserved (shows pre-reset achievements)
   - Overall tone shift: funeral to rebirth with consequences

2. **HallOfFame.tsx:**
   - Loading text: fallen heroes changed to chronicles of past lives
   - Empty state: No fallen heroes yet changed to No past lives recorded yet. Will you be the first to fall and rise again?
   - Page aesthetic: memorial/graveyard changed to chronicles of past lives
   - Ranking, stats banner, pagination unchanged (all still valid)

3. **useZoneConnection.ts:**
   - Updated permadeath handler comment: Player must manually navigate away changed to Player must manually dismiss to respawn
   - Dismissal clears overlay state; normal gameplay resumes (server sends respawn location)

4. **ZoneExploration.tsx:**
   - Verified permadeath overlay dismissal flow: onDismiss clears overlay state, no navigation
   - Player sees game world after dismissing (respawned character)

**Testing:** TypeScript build passes clean.

**Design Decisions:**
- Permadeath is now a reset cycle mechanic, not permanent deletion
- Hall of Fame records past lives (previous character states before reset)
- Stash preservation incentivizes banking valuable items before risky ventures
- Death count persists across resets (cumulative legacy)
- Tone shifted from somber memorial to dramatic rebirth narrative
- Rise Again button conveys continuation, not ending

**Backend Integration:** Server handles actual character reset and respawn location. Client shows overlay, player dismisses, gameplay resumes with reset character.

---

### 2026-04-13: Permadeath UI Implementation (ROUND 1 — DEPRECATED)

**Task:** Build client-side UI for permadeath character death events.

**Outcome:** ⚠️ ITERATION — Components built with "permanent death" framing; messaging pivot required.

**Deliverable (Then Deprecated):**
- PermadeathOverlay component with dramatic death screen
- HallOfFame page (/hall-of-fame) with leaderboard
- UI tone: "Permanent Death", loss, finality
- Ranking: survival time + death count

**Process Note:** User directive pivoted design from character deletion to character reset. Round 1 UI messaging misaligned with reset semantics (not permanent loss). Round 2 messaging correction applied.

---

### 2026-04-13: Permadeath UI — Death & Rebirth Messaging (ROUND 2 — DELIVERED)

**Task:** Reframe permadeath UI for reset-based model (correction).

**Outcome:** ✅ DELIVERED — UI messaging reframed from loss to renewal.

**Deliverable:**
- **Messaging update:** "Permanent Death" → "Death & Rebirth"
- **Button text:** "Fallen Heroes" → "Rise Again"
- **Leaderboard:** "The Fallen" → "Past Lives"
- **Narrative:** Character resets and continues (not lost forever)
- **Mechanics:** Stash carries over, gear/level wiped, respawn in-game

**Key Changes:**
- Tone: Loss → Renewal
- Framing: Memorial → Survival metrics
- Intent: Honors extraction-loop incentive (stash preserved)

**Impact:** UI now reinforces reset model semantics; supports hardcore mode identity (difficult but continuable).

---

