# regis — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

## Learnings & Assignments

### 2026-04-17: Issue #467 — Combat HUD Phase A (Client)

**Assignment:** Wire combatant state to CombatHUD component via store + message handler

**Context:**
- Elminster completed architecture analysis for Combat HUD feature (#467)
- CombatHUD component is 90% built with proper props structure
- Server will broadcast new COMBAT_STATE message each combat tick
- Client needs to: receive message → expand state reducer → bind to CombatHUD

**Your Role (Phase A — Client Stream):**
1. Expand AppState.combat in store.ts:
   - Add combatants: Array<{id, name, hp, maxHp, hpTier, isPlayer, currentTarget, telegraphedAction}>
   - Add hostileIds: string[]
   - Add playerTargetId: string
2. Add SET_COMBAT_STATE reducer case to update combat state from message payload
3. Wire message handler in ZoneExploration.tsx:
   - Listen for MessageTypes.COMBAT_STATE
   - Dispatch SET_COMBAT_STATE action with message payload
4. Update StatusPanel.tsx to pass real data to CombatHUD:
   - availableTargets from combat.combatants filtered by combat.hostileIds
   - groupMembers from combat.combatants filtered by isPlayer flag
   - enemyStatus derived from combatants where id === playerTargetId

**Dependencies:** None — Jarlaxle (server stream) can work in parallel once message type is defined

**Timeline:** ~3 hours including testing

**Related Files:**
- packages/client/src/store.ts (state + reducers)
- packages/client/src/components/ZoneExploration.tsx (message handler)
- packages/client/src/components/StatusPanel.tsx (UI binding)
- packages/client/src/components/CombatHUD.tsx (component definition)

**Full Specification:** See `.squad/decisions/decisions.md` (merged from inbox)

**Status:** ✅ Completed — PR #469

## Learnings

### Architecture: Message handler wiring pattern
- Message handlers live in `useZoneConnection.ts`, NOT `ZoneExploration.tsx` (history had wrong file)
- `connection.ts` has a `MessageHandlers` interface — new messages need: import type, add to interface, wire in both `connect()` and `switchRoom()`
- Existing `SET_COMBAT_STATE` action only toggles `inCombat` boolean — I added `SET_COMBAT_COMBATANTS` as a separate action to avoid overloading it
- Jarlaxle's shared types use `CombatantSnapshot` (not `CombatantInfo`) with richer telegraph structure (`{abilityName, remainingTicks, targetId}`)
- Shared `MessageTypes` count is tested — update `types.test.ts` when adding new message types
- CombatHUD gets data through prop drilling: store → StatusPanel → EnvironmentTab → CombatHUD
- Graceful fallback: when no COMBAT_STATE has been received yet, the aggressive creature list is used with placeholder HP (100/100)

---

### COMBAT_STATE PR #470 Review — Approved by Elminster (2026-04-17)

**Status:** ✅ APPROVED — No revisions requested

Elminster completed comprehensive architecture review of PR #470 (re-PR of #469 targeting `dev`). No architectural concerns, no implementation issues, no cherry-pick artifacts.

**Review Details:**
- Client-side state management (`SET_COMBAT_COMBATANTS` action, atomic dispatch) correctly implemented
- `useZoneConnection` handler properly wired for both `connect()` and `switchRoom()`
- CombatHUD fallback to `roomOccupants.creatures` preserves graceful behavior during initial tick
- Cleanup on combat end (`SET_COMBAT_STATE` with `inCombat: false` clears arrays) works correctly
- All 6 client tests verified + 11 server tests verified passing
- Message handler wiring pattern validated as correct

**No revisions requested. Ready to merge to `dev`.**

See `.squad/decisions/decisions.md` for full review details.

### 2025-07-25: Client State Management Audit (Zustand Migration Assessment)

**Status:** ✅ Complete — Audit written to `.squad/decisions/inbox/regis-client-state-audit.md`

**Key Findings:**
- Current pattern: React Context + useReducer with 30 flat state fields, 25 action types, monolithic reducer
- **No selector granularity** — every `useAppContext()` consumer re-renders on any state change (biggest perf issue)
- `useZoneConnection.ts` is 577 lines with 15 inline message handlers; grows with every new server message
- `connection.ts` has duplicated handler registration in both `connect()` and `switchRoom()` (maintenance trap)
- 19 consumer files, 15 test files with manual AppContext.Provider boilerplate
- Multi-dispatch in async Colyseus callbacks may bypass React batching

**Zustand Opportunities (ranked):**
1. **Selectors** (HIGH) — fix re-render problem, components subscribe to specific slices
2. **Slice pattern** (HIGH) — split monolith into auth/combat/terminal/equipment/connection slices
3. **Store outside React** (MEDIUM) — message handlers call `useStore.getState()` directly, eliminating stale closure issues and the 577-line hook
4. **DevTools middleware** (LOW but free) — currently zero state debugging tooling

**Migration Risk:** Medium. ~19 consumer files + ~15 test files. Combat slice is highest-risk/highest-reward. Recommended order: auth → terminal → combat → connection.

---

### 2026-04-20: Client State Audit for Zustand Migration (Frontend Dev)

**Status:** ✅ Complete — Audit delivered, paired with Elminster evaluation

**Task:** Audit current React Context + useReducer state management. Map surface area, identify pain points, confirm Zustand compatibility. NO CODE CHANGES — fact-finding only.

**Key Findings:**

**Four Critical Pain Points:**
1. **No selector granularity (HIGH):** Every component calling `useAppContext()` re-renders on ANY state change. Combat tick updates trigger re-renders in inventory panel, settings modal, compass — components that don't use that state. This is the #1 performance problem in real-time game with 10-50 updates/sec.

2. **Monolithic 577-line WebSocket handler hook (HIGH):** `useZoneConnection.ts` contains 15 inline message handlers (~300 lines). Each new server message type adds ~20 lines. File is hard to navigate, test in isolation, and reason about. Largest refactor target.

3. **Duplicated handler registration (MEDIUM):** `connection.ts` `connect()` and `switchRoom()` have identical 35-line handler registration blocks. Every new message type requires updates in 4 places (MessageHandlers interface, both functions, hook). Maintenance trap.

4. **Test boilerplate sprawl (MEDIUM):** 9 test files manually create identical `useReducer(appReducer, state)` + `AppContext.Provider` wrappers (~15 lines each).

**Surface Area Metrics:**
- 26 files importing from `store.ts` (7 direct + 19 via `useAppContext`)
- 19 components consuming state
- ~56 `dispatch()` call sites
- ~100+ `state.` property accesses in TSX across 13 component files
- 15 test files touching store/dispatch
- 9 test files with manual provider boilerplate

**Current State Structure:**
- 30 top-level fields in monolithic `AppState`
- 25 action types
- Single 78-line reducer switch/case
- Domains (auth, combat, inventory, connection, terminal) all flattened to root level

**Zustand Migration Opportunities (HIGH-VALUE):**
1. **Selectors fix re-render problem** — `useStore(s => s.playerHp)` re-renders ONLY when playerHp changes. Single biggest win.
2. **Store slices enable domain separation** — `createAuthSlice`, `createCombatSlice`, `createInventorySlice`, etc. Each owns its state + actions.
3. **`subscribeWithSelector` moves handlers outside React** — WebSocket handlers call store methods directly, no dispatch indirection, no closure staling, eliminates ref workarounds.

**Recommended Migration Order:**
1. Auth slice (fewest dependencies, easiest)
2. Terminal/messages slice
3. Combat slice (most complex, biggest win)
4. Connection + WebSocket handlers (riskiest, requires careful testing)
5. Remove Context, update all tests

**Risk Assessment:**
- 19 consumer files (MEDIUM) — mechanical find-replace
- 15 test files (MEDIUM) — simpler patterns with Zustand
- connection.ts handler registration (LOW) — Zustand store accessible outside React
- **useZoneConnection.ts (HIGH)** — largest refactor, requires careful testing

**Deliverable:** `.squad/decisions/inbox/regis-client-state-audit.md` (206 lines) — merged to decisions.md

**Process:**
- Paired audit with Elminster (architectural evaluation)
- Both agreed on pain points and Zustand fit
- Elminster designing phased migration; Regis providing implementation surface analysis

**Next:** Await Phase 1 planning. Ready to begin migration when team prioritizes.

- useAppContext compatibility shim fully removed: all 17 consumer files now use useAppStore(selector) directly for optimal re-render granularity
- Sub-agents committed component/page/hook migrations in separate commits; shim removal was a final cleanup commit
- StatusPanel (20+ fields) and ZoneExploration (9 fields) used useShallow for grouped selectors; all others use individual selectors

### 2026-07-15: Domain Store Slices — Zustand Decomposition

**Status:** ✅ Complete — Pushed to `squad/zustand-domain-slices`

**Task:** Decompose monolithic Zustand store into 5 domain-specific stores per Elminster's architecture proposal.

**Changes:**
1. **Created `packages/client/src/store/` directory** with 7 files:
   - `createStore.ts` — Generic factory with `subscribeWithSelector(devtools(...))` middleware
   - `auth.ts` — AuthState (6 fields), authReducer, useAuthStore
   - `terminal.ts` — TerminalState (4 fields), terminalReducer, useTerminalStore
   - `combat.ts` — CombatState (13 fields), combatReducer, useCombatStore
   - `connection.ts` — ConnectionState (3 fields), connectionReducer, useConnectionStore
   - `inventory.ts` — InventoryState (10 fields), inventoryReducer, useInventoryStore
   - `index.ts` — Barrel with logoutAll(), resetAllStores(), initializeAllStores()

2. **Replaced monolithic `store.ts`** with backward-compatible barrel that still exports AppState, appReducer, useAppStore for test compatibility. `resetAppStore`/`initializeAppStore` now cascade to domain stores.

3. **Migrated all 19 consumer files** to domain-specific store imports:
   - Components: App, ProtectedRoute, CompassControl, MudPrompt, CombinedStashLoadout, SettingsModal, CombatHUD, StatusPanel
   - Pages: ZoneExploration, CharacterSelect, Settings, HallOfFame, AuthCallback, Login, AdminLayout
   - Hooks: useWhoList, useFlags, useSettings, useDevAutoLogin, useZoneConnection

4. **All 391 tests pass, TypeScript clean, ESLint clean.**

## Learnings
- `createStore()` factory pattern: `subscribeWithSelector(devtools(...))` + `{ dispatch: _, ...state }` to strip dispatch before reducer
- Cross-domain side effects (e.g., old `CLEAR_MESSAGES` also clearing `roomOccupants`) must be handled by callers dispatching to multiple stores
- `LOGOUT` cascade replaced with `logoutAll()` resetting all 5 stores
- Test backward compatibility achieved by having `initializeAppStore()` call `initializeAllStores()` to distribute flat fields to correct domain stores
- `CombatStoreAction` (not `CombatAction`) avoids name collision with `@ellmud/shared`'s `CombatAction` type
- `useZoneConnection.ts` (583 lines) is the hardest file to migrate — uses `.getState().dispatch()` pattern to avoid stale closures in effect handlers
