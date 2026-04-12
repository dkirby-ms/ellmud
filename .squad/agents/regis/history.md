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


---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.
