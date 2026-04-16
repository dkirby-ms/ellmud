# regis — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

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

### 2026-07-22: Combat Stats Display — Character Tab
**Status:** ✅ Complete — Lint clean, TypeScript clean (pre-existing error in ZoneExploration unrelated)

**Problem:** Players had no way to see their combat stats (weapon skills, defence, health) in the game UI.

**Changes:**
1. **store.ts** — Added `CombatStats` interface and `combatStats` field to AppState with placeholder defaults. Added `SET_COMBAT_STATS` action for future server sync.
2. **StatusPanel.tsx** — Replaced "Skills & reputation coming soon" placeholder with a full Combat Skills section in the Character tab:
   - ⚔ Weapon Skills: Unarmed, One-Handed, Two-Handed, Ranged
   - 🛡 Defence: Dodge, Shield Block, Armour
   - ❤ Health: Max HP
   - New `StatRow` helper component for label/value pairs
   - Consistent styling with existing panel (text-xs, font-sans headers, font-mono values)

**Design Decisions:**
- Text-driven layout respecting MUD aesthetic — no bars or gauges, just labels + numbers
- Stats grouped into Weapon Skills / Defence / Health categories
- Placeholder values until server sends combat stats via room state
- Quick Actions moved below Combat Skills (stats are more persistent/important)

**Server Dependency:** `SET_COMBAT_STATS` action is wired but server doesn't send combat stats yet. TODO comments in store.ts mark what's needed.

## Learnings — Combat Stats Display

- `AppState` is the single source of truth for all player-visible data; new stat domains get an interface + action + reducer case
- CharacterTab section order: Sound Cues → Combat Skills → Quick Actions (persistent info before transient actions)
- 8 combat stats confirmed: maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour (no agility)
- `CombatStats` interface exported from store.ts for reuse across components

---

---

### 2026-04-13T23:36–2026-04-14T00:05: Combat Stats UI & Inventory Fix Phase 1 (DELIVERED)

**Task:** Implement combat stats display in StatusPanel Character tab + store action. Fix inventory UI regression (zone vs stash branching).

**Outcome:** ✅ DELIVERED — Combat Skills section visible, SET_COMBAT_STATS action dispatched, inventory UI regression fixed.

**Deliverables:**

**Combat Stats UI:**
- **StatusPanel Character tab:** Added Combat Skills section between Sound Cues and Quick Actions
- **3-group display:**
  - Weapon Skills: unarmed, oneHanded, twoHanded, ranged (derived from Strength/Dexterity)
  - Defence Stats: dodge, shieldBlock, armour (derived from Constitution/Wisdom)
  - Health: maxHp (current/max)
- **Redux store:** Implemented SET_COMBAT_STATS action + reducer in store.ts
- **Placeholder defaults:** UI displays frozen defaults until server sends combat stats

**Inventory UI Regression Fix:**
- **Issue:** CombinedStashLoadout always rendered stash items, failed to branch on loadout type (zone vs stash)
- **Fix:** Added conditional render: `if (type === 'stash') renderStash() else renderZone()`
- **Result:** Zone and stash inventories now mutually exclusive; no cross-contamination

**Integration Notes:**
- StatusPanel ready to receive live combat stats once server dispatches SET_COMBAT_STATS
- Waiting for server integration: Character.combatStats needs to be loaded from DB and sent via WebSocket
- Inventory fix resolves user-reported regression on live

**Server Team Action Needed:**
When combat stats are added to room state or player_state messages, dispatch:
```ts
dispatch({ type: 'SET_COMBAT_STATS', stats: { maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour } });
```

**Team Coordination:**
- Coordinated with Jarlaxle: Ready to receive CombatStats type from combat system
- Coordinated with Drizzt: Waiting for character base stats loading
- Coordinated with Elminster review: Integration gap C3 (frontend placeholder) tracked

---


## Learnings — Effective Stats (#455)

- Server rebuildPlayerStatsCache() is the single point where effective stats are computed — send to client from there
- findClient(playerId) on ZoneRoom maps DB player ID to Colyseus Client for sending messages
- Shared package must be rebuilt (tsc --build) before server/client can see new exports
- MessageCollector in test helpers needs manual update for each new message type
- Connection service wires handlers in both connect() and switchRoom() — must update both
- EffectiveStats (attack, armour, shieldBlock, dodge, maxHp) are distinct from base CombatStats (8 weapon skills)
- Pattern: show effective stats as primary, base as (base: N) suffix when they differ

### 2025-07-24: Compact ANSI Color Swatch Grid (#458)
**Status:** Complete — All 51 tests pass, TypeScript clean, lint clean

**Problem:** The ANSI color selector in admin editor screens displayed full color names as text buttons, taking excessive horizontal space (16 buttons with names like "bright-magenta").

**Changes:**
1. **AnsiToolbar.tsx** — Replaced text-label color buttons with a compact 2x8 grid of colored squares:
   - Added COLOR_HEX map (16 entries) matching tailwind.css .ansi-* classes
   - Color swatches are 20x20px with background-color set to actual ANSI hex value
   - Hover shows gold border highlight + subtle scale; title tooltip shows [name]...[/name]
   - aria-label on each swatch for screen reader accessibility
   - Grid wrapped in role="group" with aria-label="ANSI colors"
   - Modifier buttons (bold/dim/italic/underline) unchanged as text labels
2. **AnsiToolbar.test.tsx** — Updated all 51 tests:
   - Color button lookups changed from getByText to getByRole with aria-label
   - Added getColorButton() helper for consistency
   - Added test for grid group rendering (verifies 16 swatches in group)

## Learnings
- ANSI color hex values live in packages/client/src/styles/tailwind.css lines 133-150
- AnsiToolbar is used via AnsiTextarea, which combines toolbar + textarea + preview
- Color swatches should use aria-label (not visible text) + title for tooltip
- The insertTag function uses document.execCommand("insertText") for undo support

---

### 2025-07-24: Revert Browser Timeout/Proxy Changes
**Status:** Complete — TypeScript clean, linting clean, commit 7a37b30

**Problem:** Commit a6c804b added AbortController timeouts and Vite proxy timeout configs that caused Firefox to display a blank screen. The timeout logic was unnecessary and broke browser compatibility.

**Changes Reverted:**
1. **api.ts** — Removed AbortController + setTimeout wrappers from `request()` and `validateToken()`. Reverted to simple fetch calls without signal/timeout.
2. **connection.ts** — Removed `withTimeout()` helper function and `CONNECTION_TIMEOUT_MS` constant. Reverted `connect()` and `switchRoom()` to call `colyseus.joinOrCreate()` and `colyseus.joinById()` directly without timeout wrapping.
3. **vite.config.ts** — Removed `timeout: 5000` and `proxyTimeout: 5000` from all 8 proxy entries. Kept proxy routes and `ws: true` on `/colyseus` entry.

## Learnings
- Browser-side timeouts via AbortController can break Firefox when wrapping fetch/WebSocket connections
- Vite proxy timeout configs are optional and can cause blank screen issues in certain browsers
- Connection timeout logic should be handled server-side, not client-side
- When reverting commits, verify TypeScript + linting before committing
- Every repository in the project follows a provider singleton pattern (init*Provider, get*Repository) for DI — new repos must match this pattern, not hard-code Pg implementations
- InMemory test doubles use Map-based storage keyed by composite strings (e.g. `${characterId}:${skillName}`)
- ZoneRoom defaults repos to InMemory and upgrades via provider in onCreate — tests skip the provider init to stay in-memory

### 2025-07-25: Fix Duplicate Minimap Down Arrows (#463)
**Status:** ✅ Complete — PR #466 opened

**Problem:** Minimap showed duplicate down arrows: one from ExitEdge (inter-floor text indicator at edge midpoint) and one from RoomNode (badge next to room circle). Additionally, the RoomNode down arrow was positioned at the top of the room when no up exit was present.

**Changes:**
1. **ExitEdge.tsx** — Removed the `{interFloor && <text>}` block that rendered ↑/↓ at edge midpoints. RoomNode badges are the canonical vertical exit indicators.
2. **RoomNode.tsx** — Fixed down badge y-position from `cy - r + 2` (top of room) to `cy + r - 2` (below room). When both up and down exits present, down shifts to `cy + r + 2` to avoid overlap.
3. **ExitEdge.test.tsx** — 5 new tests: line rendering, stroke styles, and verification that no text indicators render for inter-floor edges.
4. **RoomNode.test.tsx** — 5 new tests: badge presence for up/down exits, down badge y-positioning, and absence of badges when no vertical exits.

## Learnings
- Minimap ExitEdge and RoomNode are separate SVG components in `packages/client/src/components/map/`
- RoomNode badges (↑/↓) are the canonical indicators for vertical exits; ExitEdge should only render the line
- `ExploredRoomData.exits` is `Record<string, string>` — truthy check on key works for presence detection

### 2025-07-25: Fix Phantom Minimap Arrows (follow-up to #466)
**Status:** ✅ Complete

**Problem:** After PR #466 removed duplicate arrows from ExitEdge, phantom ↑/↓ arrows still appeared on the minimap. Root cause: inter-floor ghost rooms (Layer 2 in MapRenderer) rendered as full `<RoomNode>` instances with roomData, so they also displayed ↑/↓ badges — producing duplicate arrows from adjacent floors.

**Changes:**
1. **RoomNode.tsx** — Added `hideVerticalBadges` prop. When true, suppresses ↑/↓ badge rendering.
2. **MapRenderer.tsx** — Pass `hideVerticalBadges` to Layer 2 inter-floor ghost RoomNodes.
3. **ExitEdge.tsx** — Skip rendering zero-length edges (inter-floor exits where rooms share x,y coords produce invisible dot artifacts).
4. **RoomNode.test.tsx** — Added test for `hideVerticalBadges` prop.
5. **ExitEdge.test.tsx** — Added test for zero-length edge skipping; updated inter-floor stroke test to use non-zero-length edge.

## Learnings
- Inter-floor ghost rooms (Layer 2) in MapRenderer are dimmed `<RoomNode>` instances — they inherit all badge rendering unless explicitly suppressed
- `computeLayout.ts` uses separate occupied sets per z-level, so up/down-connected rooms share (x,y) → edges between them are zero-length
- Three rendering layers can produce vertical exit indicators: ExitEdge text (removed in #466), RoomNode badges (canonical), and ghost RoomNode badges (now suppressed)

