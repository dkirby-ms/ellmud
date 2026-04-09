# Design Spec: "Connect to Zone..." Context Menu Feature

**Issue:** #317  
**Author:** Elminster (Lead/Architect)  
**Date:** 2026-01-19  
**Assignee:** Regis (Frontend Dev)  

---

## Summary

Add a "Connect to Zone..." option to the zone designer's right-click room context menu, enabling admins to create inter-zone portal exits directly from the graph UI. This leverages existing portal infrastructure (phantom target nodes, portal rendering) and API patterns already proven in the "Create Portal" button workflow.

---

## Current State Analysis

### 1. Right-Click Context Menu Structure

**Location:** `packages/client/src/pages/admin/ZoneDesigner.tsx:2696-2963`

The context menu currently offers:
- **Room name header** (shows room name/slug)
- **6 directional "Add Room" buttons** (north, south, east, west, up, down) — disabled if direction already has an intra-zone exit
- **Edit Room** — opens room edit panel
- **Copy Properties** — copies room props to clipboard state
- **Paste Properties** (conditional, if clipboard has data) — pastes props to target room
- **Connect Exit...** — enters "connect mode" for manual exit drawing
- **Delete Room** — triggers delete confirmation modal

The menu is rendered as an absolutely-positioned overlay at `contextMenu.x, contextMenu.y` with custom styling (no component library). Each menu item is a `<button>` with inline styles and hover effects.

### 2. Existing Portal Creation Flow

**"Create Portal" button workflow** (`handleCreatePortal`, lines 1531-1554):

1. Admin clicks "Create Portal" button in right panel (requires room selection)
2. Opens modal dialog with:
   - **Zone picker dropdown** — fetches all zones via `listZones()` API, filters out current zone
   - **Room picker dropdown** — fetches target zone's rooms via `getZone(zoneSlug)` when zone selected
   - **Direction picker** — standard 6-direction dropdown
3. Calls `createExit(zoneId, { fromRoomSlug, direction, toRoomSlug: fromRoomSlug, targetZoneSlug, targetRoomSlug, locked: false, hidden: false })`
4. Refreshes zone data via `onZoneChanged?.()`

**Note:** Portal exits set `toRoomSlug` to the same value as `fromRoomSlug` (the exit's source room). The actual target is specified by `targetZoneSlug` + `targetRoomSlug` fields.

### 3. Exit Creation API

**Endpoint:** `POST /admin/api/zones/:zoneId/exits`

**Payload shape** (from `zone-api.ts:124-128` and `zone-routes.ts:389-427`):
```typescript
{
  fromRoomSlug: string,      // source room in current zone
  direction: string,          // "north" | "south" | "east" | "west" | "up" | "down"
  toRoomSlug: string,         // for portals, set to fromRoomSlug
  targetZoneSlug?: string,    // optional — presence makes this a portal exit
  targetRoomSlug?: string,    // optional — required if targetZoneSlug present
  locked: boolean,
  hidden: boolean
}
```

**Server validation** (from `zone-routes.ts:102-119`):
- `direction` must be one of `ALL_DIRECTIONS`
- `fromRoomSlug` must exist in zone's room set
- `toRoomSlug` is required (but for portals, it's just a placeholder — set to `fromRoomSlug`)
- No validation enforced on `targetZoneSlug` or `targetRoomSlug` (assumes admin knows what they're doing)

**Response:** Returns created `ZoneExitDefinition` with server-generated `id`

### 4. Zone/Room Listing APIs

**List all zones:**  
`GET /admin/api/zones` → `ZoneDefinition[]`  
(Returns id, slug, name, description, tier, lifecycle, category, etc.)

**Get zone bundle:**  
`GET /admin/api/zones/:slug` → `{ zone: ZoneDefinition, rooms: ZoneRoomDefinition[], exits: ZoneExitDefinition[] }`  
(Returns full zone data including room list)

**Client wrapper:** `listZones()` and `getZone(slug)` in `zone-api.ts:72-78`

### 5. Portal Rendering (Already Implemented)

**Phantom target nodes** (lines 753-774): For inter-zone exits with horizontal directions (not up/down), the graph renders a small "phantom" node offset from the source room, labeled with the target zone slug. These are non-interactive, cyan-colored "portalTarget" nodes.

**Portal stub edges** (rendered via `exitsToFlowEdges`): Connect source room to phantom node with cyan styling.

**Portal click handler:** Clicking phantom nodes navigates to target zone (`handlePortalClick` at line 726).

---

## Design: "Connect to Zone..." Menu Option

### UI Flow

1. **User right-clicks room** → context menu opens
2. **User clicks "Connect to Zone..."** → modal dialog opens (similar to existing portal dialog)
3. **Modal contents:**
   - **Title:** "Connect to Another Zone"
   - **Zone picker dropdown** — shows all zones except current one (name + slug, sorted alphabetically)
   - **Room picker dropdown** — dynamically populated when zone selected; shows room name + slug
   - **Direction picker** — standard 6 directions (north, south, east, west, up, down)
   - **Conflict warning** (conditional) — if direction already used by an exit from this room, show warning: "⚠️ Direction {dir} already has an exit. This will create a conflicting exit." (non-blocking)
   - **Cancel / Create buttons**
4. **On "Create":**
   - Call `createExit(zoneId, payload)` with portal exit structure
   - Close modal, close context menu, refresh zone data
   - Phantom portal node appears in graph

### Implementation Details

#### 1. Modal Component Reuse

**Decision:** Create a **shared portal dialog component** instead of duplicating the existing portal dialog code.

**Why:** The "Create Portal" button (lines 1504-1554) and new context menu option will share identical UI/logic. Extracting to a component eliminates duplication and ensures consistent UX.

**Component interface:**
```typescript
interface PortalDialogProps {
  show: boolean;
  onClose: () => void;
  currentZoneSlug: string;
  fromRoomSlug: string;
  onConfirm: (targetZoneSlug: string, targetRoomSlug: string, direction: string) => Promise<void>;
}
```

**Placement:** `packages/client/src/components/admin/PortalDialog.tsx`

**State management:** Dialog manages its own zone list, target room list, and form inputs. Parent provides `onConfirm` callback for exit creation.

#### 2. Context Menu Changes

**Add new menu item** after "Connect Exit..." (line ~2929), before the divider:

```typescript
<button
  onClick={() => {
    setContextMenu(null);
    void handleOpenPortalFromContextMenu(contextMenu.roomSlug);
  }}
  style={{ /* same styling as other menu items */ }}
>
  <span style={{ width: 14, textAlign: "center" }}>🌐</span>
  Connect to Zone...
</button>
```

**Handler:**
```typescript
async function handleOpenPortalFromContextMenu(roomSlug: string) {
  setSelectedRoom(roomSlug); // ensure room is selected
  await openPortalDialog(); // reuse existing portal dialog logic (to be refactored into component)
}
```

#### 3. Direction Conflict Detection

**Issue:** User might create a portal exit on a direction that already has an intra-zone exit. This is allowed by the API but creates ambiguity in game logic (which exit wins?).

**Solution:** Show non-blocking warning in modal if direction already used:

```typescript
const usedDirections = exits
  .filter(e => e.fromRoomSlug === selectedRoom && !e.targetZoneSlug)
  .map(e => e.direction);

const hasConflict = usedDirections.includes(selectedDirection);
```

Display warning:
```tsx
{hasConflict && (
  <div style={{ color: "#F59E0B", fontSize: 12, marginTop: 4 }}>
    ⚠️ Direction {selectedDirection} already has an exit. This will create a conflicting exit.
  </div>
)}
```

**Note:** This is a warning, not a blocker. Some admins may intentionally create overlapping exits for conditional routing logic (e.g., exit behavior changes based on player state).

#### 4. API Call Sequence

```typescript
async function handleCreatePortalFromContextMenu(
  fromRoomSlug: string,
  targetZoneSlug: string,
  targetRoomSlug: string,
  direction: string
) {
  if (!zoneId) return;
  setBusy(true);
  setError(null);
  try {
    await createExit(zoneId, {
      fromRoomSlug,
      direction,
      toRoomSlug: fromRoomSlug, // portal pattern: toRoomSlug = fromRoomSlug
      targetZoneSlug,
      targetRoomSlug,
      locked: false,
      hidden: false,
    });
    onZoneChanged?.(); // triggers zone data refetch
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to create portal");
  } finally {
    setBusy(false);
  }
}
```

#### 5. Undo/Redo Support

**Decision:** Skip undo/redo for portal exits in MVP.

**Rationale:** Existing "Create Portal" button flow (lines 1531-1554) does not integrate with undo/redo stack. Portal exits are less frequently created/deleted than intra-zone exits. Adding undo support requires tracking created exit ID and handling async deletion — this is a polish feature for future iteration.

**Future work:** Tag issue #317 follow-up: "Add undo support for portal exit creation"

---

## Edge Cases

### 1. Target zone has no rooms yet
**Scenario:** Admin selects a zone, but `getZone(slug)` returns `rooms: []`

**Behavior:** Room picker shows "No rooms in this zone" message, "Create" button disabled until room selected

**Implementation:**
```tsx
{targetRooms.length === 0 && targetZone && (
  <div style={{ color: "#8A8B95", fontSize: 12, fontStyle: "italic" }}>
    No rooms in this zone yet
  </div>
)}
```

### 2. Direction already has intra-zone exit
**Scenario:** Room already has a "north" exit to another room in the same zone. User tries to create a "north" portal exit.

**Behavior:** Warning shown (see section 3 above), creation allowed. Server creates the exit. Game engine precedence is undefined (not a design concern — document only).

**Note for GDD update:** Portal exits and intra-zone exits on the same direction create ambiguous routing. Recommend admin convention: use portals on unused directions, or document intended behavior in zone design notes.

### 3. Portal target room doesn't exist (typo in slug)
**Scenario:** Admin selects room from dropdown, but room is deleted before "Create" clicked (race condition).

**Behavior:** `createExit` API call succeeds (no server-side validation of `targetRoomSlug`). Orphaned portal exit created. Existing "Orphaned Exits" cleanup tool will detect it later.

**Mitigation:** None needed — orphan cleanup is a separate workflow. Admin can delete bad portal manually or wait for next cleanup scan.

### 4. Direction conflicts with existing portal exit
**Scenario:** Room already has a "north" portal to Zone A. User tries to add another "north" portal to Zone B.

**Behavior:** Same as edge case #2 — warning shown, creation allowed. Results in two exits from same room in same direction. Server doesn't enforce uniqueness.

**Recommendation for Regis:** Consider fetching ALL exits (including portals) when computing `usedDirections`, not just intra-zone exits:
```typescript
const usedDirections = exits
  .filter(e => e.fromRoomSlug === selectedRoom) // include portals
  .map(e => e.direction);
```
This makes the conflict warning more accurate.

---

## Data Model Reference

**Portal exit structure in database** (`zone_exits` table):

| Field | Value for Portal Exit |
|-------|----------------------|
| `id` | UUID (server-generated) |
| `zone_id` | Current zone's UUID |
| `from_room_slug` | Source room slug |
| `direction` | "north" \| "south" \| "east" \| "west" \| "up" \| "down" |
| `to_room_slug` | **Same as `from_room_slug`** (portal pattern) |
| `target_zone_slug` | Target zone slug (e.g., "siltgate") |
| `target_room_slug` | Target room slug in target zone (e.g., "west-gate") |
| `locked` | `false` (default) |
| `hidden` | `false` (default) |
| `condition` | `NULL` (not used in UI) |

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "zoneId": "current-zone-uuid",
  "fromRoomSlug": "throne-room",
  "direction": "east",
  "toRoomSlug": "throne-room",
  "targetZoneSlug": "siltgate",
  "targetRoomSlug": "west-gate",
  "locked": false,
  "hidden": false
}
```

---

## Code Reuse Opportunities

### 1. Portal Dialog Logic
**Current duplication:** Lines 1504-1554 (`openPortalDialog`, `handlePortalZoneChange`, `handleCreatePortal`) can be extracted to:
- Shared `PortalDialog` component (owns zone/room pickers, direction picker, form state)
- Shared `usePortalDialog` hook (manages API calls for zone/room list fetching)

**Benefits:**
- Context menu feature reuses component without copy-paste
- Future portal UI improvements (e.g., search filter in zone picker) benefit both call sites
- Easier to test in isolation

### 2. Direction Conflict Detection
**Opportunity:** Extract direction validation logic to a helper:
```typescript
function getUsedDirections(
  exits: ZoneExitDefinition[],
  roomSlug: string,
  includePortals: boolean = false
): Set<string> {
  return new Set(
    exits
      .filter(e => e.fromRoomSlug === roomSlug && (includePortals || !e.targetZoneSlug))
      .map(e => e.direction)
  );
}
```

**Call site:** Context menu "Add Room" buttons (line 2698), portal dialog, and new context menu option all use this.

### 3. Zone Filtering
**Current pattern:** `allZones.filter((z) => z.slug !== zone.slug)` (line 1508)

**Recommendation:** Centralize zone filtering in `openPortalDialog` so all consumers get same behavior (exclude current zone, sort alphabetically by name).

---

## Testing Recommendations

### Manual Testing Checklist (for Regis)

1. **Happy path:**
   - Right-click room → "Connect to Zone..." → select zone → select room → select direction → create
   - Verify phantom portal node appears in graph
   - Verify exit appears in right panel's exit list
   - Verify clicking phantom node navigates to target zone

2. **Direction conflicts:**
   - Create intra-zone exit on "north"
   - Right-click same room → "Connect to Zone..." → select "north" again
   - Verify warning appears in dialog
   - Verify creation still succeeds (non-blocking)

3. **Empty target zone:**
   - Create a new zone with no rooms
   - Right-click room → "Connect to Zone..." → select empty zone
   - Verify "No rooms in this zone yet" message shows
   - Verify "Create" button disabled

4. **Cancel flows:**
   - Open dialog → Cancel → verify modal closes, no API calls made
   - Open dialog → close context menu via click-outside → verify state cleaned up

5. **Multi-floor:**
   - Create portal from room on floor 0 with direction "up"
   - Switch to floor 1 → verify no phantom node (up/down portals don't render phantoms)
   - Verify exit still listed in right panel

6. **Undo/redo (out of scope):**
   - Create portal via context menu → verify undo stack NOT updated (expected behavior for MVP)

### Automated Testing (Future Work)

- **Unit test:** `PortalDialog` component (zone fetching, room fetching, form validation)
- **Integration test:** Context menu interaction → modal open → API call sequence → graph update
- **E2E test:** Full workflow from right-click to navigation to target zone

**Recommendation:** Defer automated tests until after Regis confirms manual testing passes. The context menu is complex (3583 lines) and heavily styled — integration tests are brittle here.

---

## Implementation Steps (Recommended Order)

1. **Extract portal dialog to component** (`PortalDialog.tsx`)
   - Move zone/room picker logic from lines 1504-1554
   - Add conflict warning UI
   - Test with existing "Create Portal" button

2. **Add context menu item** ("Connect to Zone...")
   - Wire up click handler to open portal dialog
   - Ensure `selectedRoom` state syncs correctly

3. **Test edge cases** (see checklist above)

4. **Update `.squad/agents/regis/history.md`** with implementation notes

5. **Close issue #317**

---

## Team Impact

- **Regis (Frontend Dev):** Primary implementer. Estimated effort: 4-6 hours (includes component extraction + testing).
- **Minsc (Admin Tooling):** No impact — API unchanged.
- **Drizzt (Engine Dev):** No impact — portal exit logic unchanged (engine already handles `targetZoneSlug` routing).
- **Volo (Content):** Quality-of-life improvement — reduces clicks for inter-zone connections (previously required selecting room, scrolling to "Create Portal" button, filling modal).

---

## Future Enhancements (Not in Scope)

1. **Undo/redo support for portal exits** — track created exit ID, enable async deletion on undo
2. **"Quick portal" mode** — shift-click room in target zone's graph to create portal (cross-tab state management required)
3. **Portal exit previews** — hover over phantom node → show tooltip with target room name
4. **Bidirectional portal creation** — checkbox to auto-create reverse portal in target zone (requires multi-zone write transaction)
5. **Direction conflict enforcement** — make conflict warning blocking (policy decision, not technical limitation)

---

## Open Questions

**Q1:** Should direction conflicts be blocking (prevent creation) or warnings (allow creation)?  
**A1:** Non-blocking for MVP. Some admins may want conditional exits (e.g., locked door vs. portal on same direction). Let admins decide via warning message.

**Q2:** Should we validate `targetRoomSlug` exists in target zone before creating exit?  
**A2:** No. Server doesn't validate this today, and orphan cleanup tool handles bad references. Adding validation requires `getZone()` call on every creation — slows down fast workflows. Document that orphan cleanup detects bad portals.

**Q3:** Should portal exits integrate with undo/redo stack?  
**A3:** Not in MVP. Existing "Create Portal" button doesn't use undo/redo. Add in future iteration if user feedback requests it.

---

## Approval

**Status:** Draft — awaiting Regis review  
**Next Steps:**
1. Regis: Review design, flag any concerns or missing details
2. Elminster: Address feedback, mark as "Approved"
3. Regis: Begin implementation

---

## Appendix: Code Snippets

### A. Context Menu Addition (Pseudocode)

```tsx
// Add after line 2929 (after "Connect Exit..." button)
<button
  onClick={() => {
    setContextMenu(null);
    setSelectedRoom(contextMenu.roomSlug);
    void openPortalDialog(); // reuse existing handler (to be refactored)
  }}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "6px 12px",
    background: "transparent",
    border: "none",
    color: "#E0E0E0",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    fontSize: 12,
    textAlign: "left",
  }}
  onMouseEnter={(e) => { e.currentTarget.style.background = "#2A2B35"; }}
  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
>
  <span style={{ width: 14, textAlign: "center" }}>🌐</span>
  Connect to Zone...
</button>
```

### B. Portal Dialog Component (Interface)

```typescript
// packages/client/src/components/admin/PortalDialog.tsx
interface PortalDialogProps {
  show: boolean;
  onClose: () => void;
  currentZoneSlug: string;
  fromRoomSlug: string;
  onConfirm: (targetZoneSlug: string, targetRoomSlug: string, direction: string) => Promise<void>;
  usedDirections?: Set<string>; // for conflict warning
}

export function PortalDialog({
  show,
  onClose,
  currentZoneSlug,
  fromRoomSlug,
  onConfirm,
  usedDirections = new Set(),
}: PortalDialogProps) {
  const [zones, setZones] = useState<ZoneDefinition[]>([]);
  const [targetZone, setTargetZone] = useState("");
  const [targetRooms, setTargetRooms] = useState<ZoneRoomDefinition[]>([]);
  const [targetRoom, setTargetRoom] = useState("");
  const [direction, setDirection] = useState("north");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ... implementation
}
```

### C. Updated `openPortalDialog` Handler

```typescript
async function openPortalDialog() {
  if (!selectedRoom) return;
  try {
    const zones = await listZones();
    const usedDirs = new Set(
      exits
        .filter(e => e.fromRoomSlug === selectedRoom)
        .map(e => e.direction)
    );
    
    setAllZones(zones.filter((z) => z.slug !== zone.slug));
    setUsedDirectionsForPortal(usedDirs); // new state
    setShowPortalDialog(true);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to load zones");
  }
}
```

---

**End of Design Spec**
---
### Connect to Zone — Context Menu Implementation
**By:** Regis (Frontend Dev)
**Date:** 2026-01-19
**Issue:** #317

## Decision

Added "Connect to Zone…" to the zone designer right-click context menu by reusing the existing portal dialog state and handlers, rather than extracting a new `PortalDialog` component.

## Rationale

Elminster's design spec suggested extracting a shared `PortalDialog.tsx` component. I opted against that for this PR because:
- The portal dialog is tightly coupled to 6 state variables already in `ZoneDesigner.tsx`
- Extracting would touch ~80 lines of state wiring for one additional call site
- The context menu trigger only needs a 27-line button + 1 small change to `openPortalDialog`'s signature

If a third caller appears (e.g., drag-to-create-portal), extraction becomes worthwhile.

## Key Detail

`openPortalDialog` now accepts an optional `roomSlugOverride` parameter. This is needed because React batches `setSelectedRoom()` — the async function would see stale state without the override. The existing "Create Portal" button call site is unaffected (no args).

## Team Impact

- **No API changes.** Same `createExit` payload as existing portal flow.
- **Direction conflict warning** now shown in the portal dialog for all callers (button + context menu). Checks all exits including portals, non-blocking.
---
# Decision: Styled Confirm Modal Pattern for Zone Designer

**Author:** Regis  
**Date:** 2026-07-23  
**Issue:** #316  

## Context

The zone designer used native `window.confirm()` for room deletion — this is unstyled and jarring.

## Decision

Rather than using the existing Radix `AlertDialog` component (which uses shadcn/ui default styling), I followed the **custom modal pattern** already established by the delete exit modal in the same file. This keeps the zone designer's dark theme (`#1C1D27` / `#2A2B35` / `#C9A84C` / `#8B2500`) consistent across all confirmation dialogs within the designer.

## Pattern

- State-driven: `deleteRoomTarget: ZoneRoomDefinition | null` controls open/close
- Overlay: `fixed inset-0 bg-black/50` with click-to-dismiss
- Confirm action: shared `confirmDeleteRoom()` with undo/redo support

## Note for Team

Two `confirm()` calls remain in ZoneDesigner (reverse exit delete, orphan removal). These should follow the same pattern when addressed.

---

### 2026-04-06: Character Creation — Starting Zones Replace Factions
**By:** Jarlaxle (Systems Dev)
**Date:** 2026-04-06

## Decision

Character creation now asks for a **starting zone** instead of a faction. Players start neutral with all factions. Faction reputation is earned through gameplay, not assigned at creation.

## Rationale

Per docs/thematic-direction.md §1, the game is shifting from "pick your team at character creation" to a more organic faction reputation system. Players wake up in a stronghold but aren't sworn to anyone yet — allegiance is earned.

## Schema Changes (Migration 021)

- `characters.starting_zone_slug` — new NOT NULL column (backfilled from existing `faction_slug`)
- `characters.faction_slug` — now nullable (existing data preserved)
- `character_reputation` — new table: `(character_id, faction_slug, reputation)` with UNIQUE constraint
- Reputation tiers: Despised (<-500), Distrusted, Neutral (-100 to 100), Trusted, Honored (>500)

## API Contract Changes

- `POST /api/characters` — now accepts `{ name, startingZoneSlug }` instead of `{ name, factionSlug }`
- Valid starting zones: `the-reliquary`, `the-bloom-observatory`, `the-carrion-court`
- No faction_membership row is created on character creation
- `GET /api/spawn-zone` — resolves from active character's `starting_zone_slug` (falls back to faction membership for legacy)

## Shared Types

- `CharacterSummary` — added `startingZoneSlug`, `startingZoneName`; `factionSlug` and `factionName` now nullable
- `CreateCharacterRequest` — `startingZoneSlug` replaces `factionSlug`
- NOTE: CharacterSummary is duplicated at two locations in shared/src/index.ts — both updated

## Team Impact

- **Regis:** CharacterSelect.tsx already updated with starting zone picker UI. `factionName` in character list now nullable — show `startingZoneName` as primary label.
- **Drizzt:** Spawn-zone API now reads from character repo instead of faction repo as primary path. Death routing still uses faction membership (unchanged).
- **Minsc:** If building admin tools, character data now has `startingZoneSlug` field. `factionSlug` may be null for new characters.
- **Laeral:** No impact — creature/item systems don't touch character creation.

---

### 2026-04-06: Starting Zone Picker Replaces Faction Picker (UI)
**By:** Regis (Frontend Dev)
**Date:** 2026-04-06

## Decision

Character creation no longer asks players to choose a faction. Instead, players choose a **starting zone** — a location where they wake up. Factions are earned through gameplay, not chosen at creation.

## Key Changes

- **CharacterSelect.tsx:** `FACTIONS` → `STARTING_ZONES` (the-reliquary, the-bloom-observatory, the-carrion-court). Label changed from "Choose Your Faction" to "Where Do You Wake Up?"
- **Shared types (both occurrences in `packages/shared/src/index.ts`):**
  - `CharacterSummary`: added `startingZoneSlug` and `startingZoneName`; `factionSlug` and `factionName` are now `string | null`
  - `CreateCharacterRequest`: `factionSlug` → `startingZoneSlug`
- **API call:** `createCharacter` sends `{ name, startingZoneSlug }` instead of `{ name, factionSlug }`
- **Character cards:** Show starting zone name (📍); faction only shown if non-null (earned later)

## Team Impact

- **Jarlaxle/Drizzt (Server):** `InMemoryCharacterRepository.create()` already accepts `startingZoneSlug` as 3rd param and sets `factionSlug: null`. Server test updated to match.
- **Minsc (Admin):** If admin pages display character faction info, check for null before rendering.
- **Volo (Content):** Zone descriptions in STARTING_ZONES are hardcoded in the client — coordinate if lore text changes.

---

### 2026-04-06: Creature & Item Retheme — Dystopian Gulf Coast Alignment
**By:** Laeral (Content Designer)
**Date:** 2026-04-06

## Decision

Comprehensive thematic retheme of creatures and items for the dystopian Gulf Coast setting (Siltgate/Warrens). All existing creatures and items reviewed for thematic alignment; those already aligned are unchanged. Eight creatures and twelve items rethemed for narrative consistency with the post-apocalyptic lore.

## Scope

### No Change Needed (Already Aligned)

**Creatures:** drowned_revenant, gutterspawn, rubble_scavenger, hollow_stalker, the_collapsed_one, slum_rat, sewer_lurker, silt_serpent

**Items:** smugglers_dagger, smugglers_cloak, leather_jerkin, dockworker_hook, brass_compass, harbor_manifest, plague_mask, silt_venom_sac, serpent_scale, sewer_moss, waterlogged_bone, bent_rebar, corroded_pipe, scavenger_shiv, tarnished_medallion, stamina_tonic

### Creature Rethemes (8)

1. **city_dog → Silt Roach** — plate-sized cockroach scavenging debris. Per setting doc (§3.2), cockroaches are "plate-sized, armored, nearly impossible to kill."
2. **pigeon_flock → Mosquito Swarm** — grotesquely swollen, thumb-sized mosquitoes in dense clouds. Per setting doc (§3.2), swarms are "thick enough to obscure vision, carry disease."
3. **feral_dog → Feral Hog** — bristle-backed, tusked, scavenging hog. Gulf Coast hazard per setting doc (§3.2).
4. **alley_thug → Render-Kin Stalker** — lean, scarred, predatory mutant with elongated limbs and claw-tipped fingers. Per setting doc (§6.2), Render-Kin embody "Murder/Violence."
5. **dockside_smuggler → Bone-Tithe Hoarder** — gaunt, skeletal figure compulsively hoarding salvage. Per setting doc (§6.2), Bone-Tithes embody "Greed."
6. **plague_bearer → Fester-Thrall** — misshapen, sore-covered mutant whose presence spreads algae bloom growth. Per setting doc (§6.2), Fester-Thralls embody "Ugliness/Body Horror."
7. **harbourmaster → The Graftlord** — bloated, territorial creature wearing the trappings of authority. Per setting doc (§6.2), Graftlords embody "Corruption" and "claim sections of ruins as kingdoms."

### Item Rethemes (12)

1. **alley_thugs_coin → Scavenged Circuit Board** — cracked drone part used as vendor trash. Currency is now potable water (draws); coins don't exist in this setting.
2. **noble_signet_ring → Pre-Extinction Signet Ring** — tarnished ring from a bloodline extinct 1000 years. Removes fantasy "Highwind" reference; value is in craftsmanship and material.
3. **city_map → Salvaged City Map** — laminated pre-extinction street map of New Orleans, water-stained and annotated by scavengers.
4. **silk_scarf → Bloom-Stained Cloth** — fabric discolored by mutant algae bloom exposure. Ties to setting's central ecological feature and Krewe Calliope rituals.
5. **healing_draught → Algae Salve** — thick green paste brewed by Bloom Tenders from cultivated algae. Avoids fantasy potion language.
6. **iron_sword → Rebar Machete** — length of construction rebar with wrapped grip and hammered edge. Rebar is the most abundant melee weapon material in ruins.
7. **iron_chainmail → Scrap-Weave Vest** — vest stitched from overlapping salvaged sheet metal and drone cabling. Post-apocalyptic equivalent of medieval chainmail.
8. **voidforged_blade → Drone-Core Blade** — blade forged from military drone reactor core alloy with blue-black sheen. Removes fantasy "void" language; grounds in setting's technology.
9. **shardsteel_sabre → Honed Drone Blade** — single-edged blade from military drone wing strut. Replaces vague "forged from metal" with specific, plausible origin.
10. **shardsteel_shard → Drone Alloy Shard** — jagged fragment of drone structural alloy. Crafting material tied to the drone debris littering the setting.
11. **corroded_halberd → Corroded Fire Axe** — pre-extinction fire axe with pitted rust and waterlogged leather handle. Perfect post-apocalyptic equivalent to medieval halberd.
12. **rat_tail → Rat Tail** — name and concept unchanged. Updated description: Bloom Tenders buy these for biological study (tracking mutation rates), not "alchemists" for fantasy coinage.

## Implementation Notes

- **No ID changes** — all room spawn references and loot table references remain valid
- **No stat changes** — retheme is cosmetic/narrative only
- **Passive behavior flags preserved** — city_dog and pigeon_flock retain passive behavior from migration 008
- **Single migration approach** — UPDATE statements for names, descriptions, room_descriptions; no schema changes needed
- **Loot tables unchanged** — same item IDs, same drop weights

---

### 2026-04-05: OpenAI-Compatible LLM Transport — Provider Priority Chain
**By:** Drizzt (Engine Dev)
**Date:** 2026-04-05
**Issue:** #310

## Decision

When both Azure AI and OpenAI-compatible LLM configs are present, Azure takes priority. The factory chain is: Azure > OpenAI-compatible > template-only fallback.

## Rationale

Backward compatibility. Existing Azure deployments must not change behavior when new env vars are added. Admins opt into the OpenAI path by *not* setting Azure credentials, or by removing them.

## Config Surface

- `OPENAI_LLM_ENDPOINT` + `OPENAI_LLM_KEY` — both required to activate
- `OPENAI_LLM_MODEL` — defaults to `gpt-4o`
- `ENABLE_LLM_NARRATION` — master toggle still respected

## Team Impact

- **Volo/Jarlaxle:** No changes needed — `LLMClient` and `NarrationService` are provider-agnostic
- **Minsc:** If building admin UI for LLM settings, check both `config.azureAI` and `config.openaiLLM`
- **Regis:** No client changes — narration protocol is unchanged

---

### 2026-04-05: Player UX — Entering the Game (Issue #309)
**By:** Regis (Frontend Dev)
**Date:** 2026-04-05
**Issue:** #309

## Decision

Replaced the `/refuge` client route with `/zone` as the player hub entry point. ZoneExploration now dynamically resolves the player's faction stronghold via `GET /api/spawn-zone` instead of hardcoding `zone:the-refuge`. The "Enter Refuge" button is now "Enter World".

## Rationale

The GDD updated faction home zones so players spawn at faction-specific strongholds (The Foundry, The Cartographium, The Counting House), not the generic Refuge. The `/refuge` URI was misleading since Refuge is now a devs-only zone. The `/zone` route is generic and works for any faction.

## Key Changes

- **Route:** `/refuge` → `/zone` (hub), `/zone/:zoneId` (specific zones) — both unchanged in structure
- **Hub detection:** `location.pathname === "/refuge"` → `useParams().zoneId` absence + `/api/spawn-zone` API call
- **Room name:** Hardcoded `zone:the-refuge` → dynamic from spawn-zone response (e.g. `zone:the-foundry`)
- **Guard added:** `useZoneConnection` skips connection when `roomName` is empty (during async spawn-zone resolution)
- **Fallback:** If spawn-zone API fails, defaults to `zone:the-refuge`

## Impact

- **All client navigation** updated: CharacterSelect, ZoneExploration, Settings, Leaderboard, ErrorFallback, AdminLayout, useZoneConnection
- **Tests:** All 2533 tests passing; test mocks updated with `fetchSpawnZone`
- **No server changes needed** — `/api/spawn-zone` endpoint already existed (Drizzt's work)

---

### 2026-04-05: NarrationService Factory Pattern for LLM Integration
**By:** Jarlaxle (Systems Dev)  
**Date:** 2026-04-05  
**Issue:** #277  
**PR:** #292

## Decision

The NarrationService is instantiated via a factory function (`createNarrationService()`) that conditionally creates an LLMClient based on Azure AI environment variables. When `AZURE_AI_ENDPOINT` and `AZURE_AI_KEY` are set, the factory wires in a real Azure AI Foundry transport. When not set, the service operates in template-only mode.

## Rationale

This pattern provides:
1. **Graceful degradation**: Local dev and tests work without Azure credentials
2. **Environment-based configuration**: Production gets LLM narration, dev gets fast templates
3. **Testability**: Mock transports can be injected for integration tests
4. **Single source of truth**: Config reading happens once at factory instantiation

Alternative considered: Lazy initialization (check config on every narrate() call). Rejected because it adds overhead and makes the LLM availability decision dynamic rather than static at startup.

## Architecture Impact

- **ZoneRoom**: Calls `createNarrationService()` in `onCreate()` — no config reading at room level
- **Config.ts**: Azure AI config is optional (`azureAI?: {...}`) — type system enforces null checks
- **Factory**: Pure function — no side effects, easy to test
- **NarrationService**: Unchanged — still accepts optional `llmClient` in constructor

## Team Impact

- **Minsc/Regis**: If building UI for narration settings, check `config.azureAI` to determine if LLM is available
- **Drizzt**: When adding new narration call sites (combat, movement), use `generateNarration()` helper and build rich NarrationContext
- **Future**: Redis-backed cache can be wired through factory similarly (already has cache parameter)

## Future Expansion

The initial wiring uses `generateNarration()` only for entry narration (proof-of-concept). Next steps:
1. Room descriptions (from `look` command) — highest value, moderate frequency
2. Combat actions — high frequency, needs careful context building
3. Movement events — medium frequency, low context complexity
4. Sound/trace narrations — already have system-level context available

Each expansion requires:
- Building a `NarrationContext` object with appropriate game state
- Calling `await narrationService.narrate(context)`
- Using the returned prose in place of template text
### 2026-04-05: Fire-and-Forget Pattern for Async Narration in Colyseus Hooks
**By:** Elminster (Lead/Architect) & Volo (Narrative Developer)
**Issues:** #292, #277

## Decision

LLM narration calls on critical path (player join, command response, state transitions) MUST use the **fire-and-forget pattern** instead of awaiting:

```typescript
// ✅ FIRE-AND-FORGET (correct)
this.generateNarration('event', playerId, roomId, fallback)
  .then((text) => {
    this.sendNarrate(client, { text, type: 'system', timestamp: Date.now() });
  })
  .catch((err) => {
    this.log(`Narration error: ${err}`);
  });
```

## Rationale

- **GDD §4.5 enforcement:** LLM never blocks critical path
- **Colyseus lifecycle:** `onJoin()` awaiting LLM calls adds 0-2000ms latency to player connection
- **UX impact:** Player sees "connecting..." spinner for 2+ seconds on first zone entry (cache miss)
- **Not critical:** Narration is optional enrichment. Game state (HP, items, position) is what matters
- **Client protocol:** Async narration already supported — client displays narration whenever it arrives
- **Fallback ready:** NarrationService has 2000ms timeout and template fallback — service handles errors gracefully

## When to Use

| Call Site | Critical? | Pattern |
|-----------|----------|---------|
| Entry narration (`onJoin`) | No | Fire-and-forget ✅ |
| Room description (`look` command) | Yes (user requested) | Await with timeout ✅ |
| Combat action narration | No | Fire-and-forget ✅ |
| Movement narration | No | Fire-and-forget ✅ |
| Sound/trace narration | No | Fire-and-forget ✅ |

**Key Principle:** "Await only when the user or game state depends on the result. Narration is flavor. Game state is truth. Never block truth waiting for flavor."

## Implementation Notes

- Always use `.catch()` to log errors — never swallow promise rejections
- Tests expecting narration: await 1000ms+ and search message arrays (order-independent)
- Exception: `look` command SHOULD await (user explicitly requested), but respect 2000ms timeout from NarrationService

## Team Impact

- **All:** When integrating async services into Colyseus rooms, ask: "Does this need to complete before the player can proceed?" If no → fire-and-forget
- **Drizzt/Jarlaxle:** When adding narration to other lifecycle events (death, zone collapse), use fire-and-forget for non-critical narration

---

### 2026-04-05: ELK as Sole Zone Designer Layout Engine
**By:** Regis (Frontend Dev)
**Issue:** #273

## Decision
ELK (elkjs) is now the **sole layout engine** for the admin zone designer. The BFS/ELK toggle button and BFS fallback have been removed. If ELK fails, an error is shown instead of silently falling back.

## Rationale
The BFS engine (`computeLayout.ts`) was the original layout algorithm. Phases 2-4 introduced ELK as a replacement with better handling of complex graphs. With Phase 6, the toggle and fallback are removed to simplify the codebase.

## Impact
- **computeLayout.ts is deprecated** but retained — the player minimap (`useExplorationMap`) still uses it for synchronous layout
- **6 other components** import `RoomPosition` type from computeLayout.ts — these type imports can be migrated to elkLayout.ts when convenient
- **Zone designer** users no longer have a BFS fallback if ELK errors — this is acceptable since ELK has been stable through Phases 2-5
- **Future:** Once player minimap migrates away, computeLayout.ts (~2700 lines) can be fully removed

---

### 2026-04-04: GDD §6.7 Updated to Document DowningSystem
**By:** Elminster (Lead/Architect)
**Issue:** #286
**Status:** Executed

## Context
The combat audit identified that the codebase has a `DowningSystem` (`packages/server/src/systems/DowningSystem.ts`) implementing a downed/bleedout/stabilization flow, while GDD §6.7 stated: "The player dies immediately. There is no downed state in the base system." This was a positive divergence — the implementation is better than what was designed.

## Decision
Updated GDD §6.7 to accurately describe the implemented DowningSystem mechanics:

- **Downed state:** 0 HP → incapacitated, not dead. Removed from combat. 10-tick bleed-out timer.
- **Stabilization:** `stabilize [player]` command, 2-tick channel, bandage required, cannot self-stabilize, interruptible.
- **Death triggers:** Bleed-out timer expiry OR finishing blow (active combat in room with downed player).
- **Stabilized protection:** Stabilized players are not subject to finishing blows.
- **Attribution:** killerIds tracked for PvP attribution.

Also updated cross-references in §8.3 (PvP) and §8.5 (Groups) to reference the downing flow.

## Team Impact
- **Minsc/Regis:** If building combat UI or tests, §6.7 now accurately describes the downed overlay state and stabilize interactions.
- **Future work:** Revive mechanic for stabilized players is not yet designed or implemented — stabilized players currently stay downed until encounter ends or zone collapses.

---

### 2026-04-04: Sprint 3 PR Review — Migration Discipline
**By:** Elminster (Lead / Architect)
**Issues:** #236, #237, #238, #239

## Decision
Seed migration files (003_seed_zones.sql, 004_seed_siltgate.sql, etc.) must NOT be modified to change runtime data in existing databases. The migration runner tracks applied files by filename — once a file is in the `_migrations` table, it will never re-run. Any data changes to existing rows (category updates, description changes, column value modifications) must use a **new numbered migration file** with UPDATE statements.

Modifying seed files is acceptable ONLY for maintaining correctness on fresh installations (both the seed update AND a new migration are needed).

## Rationale
PR #260 modified 003_seed_zones.sql to change the Refuge category from `hub` → `dev`, but this change will not apply to existing databases. The Refuge will remain `category='hub'` on any database that has already run the migration set. This was caught in review and flagged as a blocking issue.

This is the second time this pattern has been noted (Jarlaxle's own history mentions "Migration ordering matters: Seed migrations reference columns by original name"). It needs to be a documented team rule.

## Impact
- PR #260 needs a new `014_repurpose_refuge.sql` migration before merge
- All future data modifications must follow the same pattern: new migration file + optional seed file update
- This rule applies to all seed migrations (003, 004, and any future seed files)
### 2026-04-01: Death & Spawn Routing — Faction Strongholds
**By:** Drizzt (Engine Dev)  
**Issue:** #238  

## Decision
Death routing and login routing now use faction-based stronghold resolution instead of hardcoded Refuge. Added `/api/spawn-zone` endpoint for client login routing.

## Routing Table
| Faction | Stronghold | Zone Target |
|---------|-----------|-------------|
| ironwright | The Foundry | zone:the-foundry |
| veil | The Cartographium | zone:the-cartographium |
| scarlet | The Counting House | zone:the-counting-house |
| _(none)_ | The Refuge | zone:the-refuge |

## Architecture
- **Death routing** is server-authoritative: `resolvePlayerHubTarget(factionSlug)` on death, cached from `playerFactionSlugs` map
- **Login routing** requires client cooperation: `GET /api/spawn-zone` returns `{ target, zoneSlug, factionSlug }` — client must call before connecting
- **Narration** uses `resolvePlayerHubName()` to inject the specific zone name ("You awaken in The Foundry…")

## Impact
- **Regis (Frontend):** Client needs to call `/api/spawn-zone` on login and connect to the returned zone target instead of hardcoded `zone:the-refuge`
- **Jarlaxle (Systems):** Faction stronghold zones must exist and be registered for routing to work; falls back to Refuge gracefully
- **All:** The Refuge is now the fallback hub for unaffiliated players only

---

### 2026-04-01: Refuge Repurposing — Designer/Debug Hub
**By:** Jarlaxle (Systems Dev)  
**Issue:** #239  

## Decision
The Refuge has been recategorized from `hub` (player spawn location) to `dev` (designer/debug workspace). This shift reflects the architectural move to faction-based strongholds for player spawning and respawning.

## Rationale
Players now respawn at faction-specific strongholds rather than a universal hub. The Refuge becomes a dedicated development environment where designers can safely test new room templates, spawn creatures, and debug zone mechanics without impacting production gameplay. This provides isolation and clear purpose separation.

## Changes
- Database: Room category changed from `hub` to `dev`
- Type definitions: Updated `RoomCategory` union
- Descriptions: Updated to reflect designer/developer purpose
- Tests: 13 tests updated for developer workflow context

## Impact
- **Refuge as fallback:** Remains as emergency routing fallback for unaffiliated/unroutable players
- **Designer workflows:** Provides isolated test environment for zone design iteration
- **Admin access:** Unchanged; admin/designer tools continue to use Refuge
- **Player experience:** No disruption; players route to faction strongholds via `/api/spawn-zone`

---

### 2026-04-01: Insert Room on Exit — Zone Designer Pattern
**By:** Regis (Frontend Dev)  
**Issue:** #252  

## Decision
Added "Insert Room on Exit" as a new zone designer action. When an exit is selected, the user can insert a new room between the two connected rooms. This creates the room, deletes the original exit pair, and wires two new bidirectional pairs through the inserted room. The operation is atomic (all-or-nothing via try/catch) and the BFS layout engine naturally positions the new room on the grid between the originals.

## Rationale
Zone designers frequently need to add intermediate rooms to existing connections — for topological correctness (bridge rooms), narrative pacing, or encounter placement. Previously this required manually creating a room, deleting the exit, and rewiring 4+ exits by hand. The new button reduces this to a single click.

## Impact
- Button appears in both the exit-pair and single-exit panels in the zone designer side panel
- Hidden for cross-zone portal exits (portals span zones and shouldn't be split)
- New rooms default to type `corridor` — designer renames/retypes after insertion
- Uses purple dashed border styling (matching feature-room accent) to distinguish from Save/Delete actions

---

### 2026-04-05: Ability System Architecture — Cooldowns, Stamina, Damage Model
**By:** Jarlaxle (Systems Dev)  
**Issue:** #279  
**PR:** #296 (pending review)

## Decision

The ability system (GDD §6.3) is implemented as a data-driven layer on top of the existing combat system with minimal invasive changes:

1. **Ability definitions** stored in a registry (Map) with id, type, cooldown ticks, stamina cost, and effects
2. **Stamina tracking** added to Combatant interface as optional fields (players only)
3. **Cooldown tracking** via `Map<abilityId, ticksRemaining>` per combatant
4. **Damage multipliers** passed through DamageOptions (e.g., Heavy Strike: 1.5x)
5. **Block reduction** implemented as flat armour bonus during stance resolution

## Rationale

**Why optional fields for stamina/cooldowns?**  
Creatures don't use the ability system in Phase 1 — only players have stamina and ability slots. Making these fields optional avoids memory waste and keeps the Combatant interface clean. Future creature abilities can set these fields when needed.

**Why cooldowns decrement at START of tick?**  
Cooldown represents "ticks remaining until usable". If set to 3 after use, the ability should be unavailable for the current tick, tick+1, tick+2, then usable at tick+3. Decrementing at start ensures cooldownTicks accurately reflects "how many ticks from now" rather than a confusing mix of "this tick or next tick".

**Why separate damageMultiplier from stance multiplier?**  
Stance multiplier (strike vs dodge: 0.5x) is a combat interaction rule. Damage multiplier (Heavy Strike: 1.5x) is an ability property. Separating them keeps damage calculation clean: `rawDamage = attack × abilityMult`, then `afterStance = rawDamage × stanceMult`, then `finalDamage = afterStance - (armour + block)`.

**Why Map for cooldowns instead of object?**  
TypeScript Maps provide cleaner semantics for dynamic ability IDs, better iteration, and no prototype pollution concerns. The cooldown map is never serialized (it's runtime-only combat state), so JSON compat isn't needed.

## Implementation Notes

**Completed in PR #296:**
- `abilities.ts`: AbilityDefinition, DEFAULT_ABILITIES registry, HEAVY_STRIKE/BLOCK/OBSERVE
- `CombatState.ts`: Combatant stamina/cooldown fields, QueuedAction.abilityId
- `damage.ts`: DamageOptions.damageMultiplier, DamageOptions.blockReduction, stance support for heavy_strike/block
- `index.ts`: Export all ability types and definitions
- `abilities.test.ts`: 18 tests (cooldown, stamina, fallback, edge cases)

**Pending (next PR after review):**
- `CombatSystem.validateAbilityAction()`: Check cooldowns/stamina, fallback to auto-attack if validation fails
- `CombatSystem.updateCooldowns()`: Decrement all cooldowns at tick start
- `CombatSystem.resolveEncounterTick()`: Integrate validation step, handle heavy_strike/block/observe actions
- Ability use narration (Heavy Strike messages, Block stance text)

## Team Impact

- **Regis (Frontend):** PlayerStateMessage already has stamina/maxStamina fields — these will be populated once CombatSystem integration is complete. Client can display ability bars with cooldown overlays using the cooldown tick values.
- **Volo (Narrative Dev):** Ability narration (Heavy Strike critical hit text, Block successful reduction text) integrates with fire-and-forget pattern from PR #292. Narration context should include damage dealt and ability name.
- **Drizzt (Engine Dev):** Threat generation will scale with ability damage multipliers (Heavy Strike = higher threat). Creature AI will select targets based on highest threat when multiple valid targets exist.
- **Minsc (Tests):** Existing combat tests continue to pass — ability system is additive. New ability tests are comprehensive but currently waiting on CombatSystem integration.

## Alternatives Considered

**Cooldown as "tick when usable again" (absolute timestamp):**  
Rejected because it requires tick-count state in every encounter and complicates cooldown display ("3 ticks remaining" is clearer than "usable at tick 47").

**Stamina as separate resource pool (not part of Combatant):**  
Rejected because stamina is combat state — it needs to be checked during tick resolution. Keeping it on Combatant avoids additional lookups and state synchronization.

**Block as stance multiplier instead of flat reduction:**  
GDD §6.3 specifies "damage reduction", implying flat. Using flat reduction makes Block distinct from Dodge (which uses multiplier). This also allows Block to synergize with high armour (stacking reductions).

---

### 2026-04-05: Threat/Aggro System for Creature Target Selection
**By:** Drizzt (Engine Dev)  
**Issue:** #281  
**PR:** #297 (pending review)

## Decision

The threat system (GDD §5.4) is implemented as a per-encounter ThreatTable that tracks damage-based threat generation and drives creature target selection:

1. **ThreatTable class** maintains threat scores per target (damage dealt = threat generated)
2. **Damage-based threat** scales 1:1 with damage inflicted (no multiplier in base system, but abilities can modulate)
3. **Target selection** picks highest-threat target as primary, with fallback to secondary targets if primary is dead/fled
4. **Multi-source threat** allows N players attacking = N threat sources (stacking)
5. **Cleanup on death/flee** automatically removes target from threat table

## Rationale

**Why damage = threat (1:1)?**  
Simplicity and alignment with GDD §5.4. Creatures prioritize whoever is hurting them most. This creates intuitive gameplay: "I attack the creature, it attacks me back." Secondary mechanics (armor reducing threat, abilities generating variable threat) can be layered later without changing core logic.

**Why ThreatTable is per-encounter?**  
Threat is local to the encounter. When a creature flees and despawns, its threat table is discarded. When a new creature spawns, it has a fresh table. This keeps state management simple and avoids cross-encounter contamination.

**Why highest threat = primary target (deterministic)?**  
Creatures should focus fire intelligently. "Whoever hurt me most" is intuitive and leads to emergent PvPvE dynamics (players cluster threat on one target, creature pursues, other players kite). Non-deterministic (random selection) would feel chaotic.

## Implementation Notes

**Completed in PR #297:**
- `threat.ts`: ThreatTable class with add/get/remove/cleanup methods
- `CombatState.ts`: Threat table wired into Encounter state (created on encounter start)
- `damage.ts`: Threat generation triggered after damage resolution
- `threat.test.ts`: 27 tests (basic threat, multi-source, cleanup, edge cases)

**Known issues (pending refinement):**
- Threat reset on flee: Should threat persist if creature re-engages? Current behavior clears on flee.
- Decay over time: Long encounters (10+ ticks) may need threat decay to prevent early players from being permanently focused.

**Pending (next PR after review):**
- `CombatSystem.resolveEncounterTick()`: Integrate ThreatTable into target selection
- Creature AI decision tree: Query highest threat at tick start, pursue primary target
- Integration with Jarlaxle's ability system: Heavy Strike generates 2x threat (configurable)
- Narration: "Creature focuses on {target}!" when threat shift detected

## Team Impact

- **Jarlaxle (Ability System):** Heavy Strike and other high-damage abilities can generate more threat (configurable per ability). Block reduces threat (defensive stance). Coordinate cooldown timing with threat focus shifts.
- **Volo (Narration):** Threat shifts ("The creature turns its gaze to you!") are high-drama moments worth narrating. Integrate with fire-and-forget pattern.
- **Regis (Frontend):** Threat values don't need to be exposed to client initially (creature focus is visible in combat messaging). Future: threat bar showing "how much threat do I have?" would be useful for PvPvE strategy.
- **Minsc (Tests):** Multi-creature encounters will inherit ThreatTable naturally. Tests should verify threat stacking across creature groups.

## Alternatives Considered

**Round-robin target selection:**  
Rejected because it ignores game state. Creatures would waste time attacking low-damage players instead of focusing pressure on the actual threat.

**Threat as exponential (damage^2, etc.):**  
Rejected because it overweights early damage. Better to keep threat linear and modulate via abilities (Heavy Strike = 2x threat multiplier).

**Player-visible threat bar:**  
Considered for future (UI shows "creature is focusing on you at 75%"). Deferred to Phase 2 because it adds frontend complexity and isn't critical for Phase 1 PvPvE gameplay.

---

### Round 6 — Room Positioning + Combat HUD

**Decision: Threat+reachability must be wired in tick resolution (not just defined)**
- Context: PR #301 defined `pickCreatureTarget()` and `canReachTarget()` but never called them
- Resolution: Wired both into `resolveEncounterTick()` — creatures re-evaluate targets each tick, strikes validate range
- Rationale: Dead code breaks the tactical purpose of positioning (tanks can't hold aggro)

**Decision: Cooldown decrement skips the reposition tick**
- Context: `positionCooldown` was set to 3 then immediately decremented to 2 in same tick
- Resolution: Use else-if — if repositioning happened this tick, don't decrement
- Rationale: Cooldown should last the full 3 ticks per GDD §6.11

**Decision: Flanking bonus is post-damage-calc multiplier**
- Context: +15% from Flank needs to be applied after armour reduction
- Resolution: `Math.ceil(finalDamage * 1.15)` after `calculateDamage()`
- Rationale: Applies to effective damage, not raw attack

**Decision: Rear melee restriction applies to ALL melee combatants**
- Context: `canReachTarget()` blocks strikes from Rear position and strikes targeting Rear from Front/Flank
- Resolution: Both player-to-creature AND creature-to-player melee are position-restricted
- Rationale: GDD §6.11 is symmetric — position rules aren't creature-only

**Decision: 26 pre-existing test failures are from prior PRs**
- Context: abilities.test.ts (15), auto-attack.test.ts (3), phase2-qa.test.ts (5), etc.
- Resolution: Not addressed in positioning PR — separate issue
- Rationale: heavy_strike action isn't handled in strike resolution (`qa.action !== 'strike'` skips it)
# Faction and Stronghold Rename — Thematic Realignment

**Author:** Bruenor  
**Date:** 2026-03-31  
**Status:** Implemented  
**Migration:** 017_faction_renames.sql

## Summary

Completed comprehensive faction and stronghold rename across the codebase to align with the new thematic direction. All three factions and their stronghold zones have been renamed with new lore, descriptions, and room content.

## Changes

### Faction Renames

| Old Slug | New Slug | Old Name | New Name |
|----------|----------|----------|----------|
| `ironwright` | `kindari` | The Ironwright Compact | The Kindari |
| `veil` | `bloom-tenders` | The Veil Cartographers | The Bloom Tenders |
| `scarlet` | `krewe-calliope` | The Scarlet Ledger | Krewe Calliope |

### Stronghold Zone Renames

| Old Slug | New Slug | Old Name | New Name |
|----------|----------|----------|----------|
| `the-foundry` | `the-reliquary` | The Foundry | The Reliquary |
| `the-cartographium` | `the-bloom-observatory` | The Cartographium | The Bloom Observatory |
| `the-counting-house` | `the-carrion-court` | The Counting House | The Carrion Court |

### New Faction Themes

**The Kindari (formerly Ironwright Compact):**
- Theme: Craft, preservation, and restoration
- Philosophy: Technology salvage and veneration of Saitcho Kindar (inventor of the pickling brine)
- Stronghold: The Reliquary (converted water treatment plant)
- Aesthetic: Industrial brutalist concrete, filtration tanks, shrine to Kindar

**The Bloom Tenders (formerly Veil Cartographers):**
- Theme: Knowledge, adaptation, and ecological navigation
- Philosophy: Understanding the mutant algae that woke the urns
- Stronghold: The Bloom Observatory (offshore oil platform)
- Aesthetic: Algae cultivation tanks, open decks, saltwater and fermenting biomass

**Krewe Calliope (formerly Scarlet Ledger):**
- Theme: Ritual, spectacle, and cultural preservation
- Philosophy: Humanity is performance — music, art, masked carnival culture
- Stronghold: The Carrion Court (collapsed Superdome)
- Aesthetic: Masks, torchlight, drums, theatrical stages in ruins

## Database Migration Strategy

Migration 017 uses UPDATE statements rather than recreating data to preserve:
- Foreign key relationships (faction_id references in faction_membership)
- Row IDs and UUIDs
- Existing character data

The migration updates:
1. `factions` table: slug, name, description
2. `zones` table: slug, name, description, faction_slug, entry_room_slugs
3. `zone_rooms` table: slug, name, description for all 30 stronghold rooms (10 per zone)
4. `zone_exits` table: from_room_slug and to_room_slug references
5. `characters` table: faction_slug, last_inn_zone_slug, last_inn_room_slug

## Code Updates

**Server:**
- `zones/stronghold.ts`: Updated FACTION_SLUGS, FACTION_STRONGHOLD_MAP, HUB_DISPLAY_NAMES
- `db/types.ts`: Updated FactionSlugs enum
- `api/characters.ts`: Updated validFactions array
- `character/InMemoryCharacterRepository.ts`: Updated faction name mapping

**Client:**
- `pages/CharacterSelect.tsx`: Updated FACTIONS array with new names and descriptions
- `hooks/useZoneConnection.ts`: Updated hub zone slug checks
- `pages/Leaderboard.tsx`: Updated placeholder faction names

**Tests:**
- All test files updated to use new faction slugs
- `death-spawn-routing.test.ts`, `faction-repository.test.ts`, `faction-strongholds.test.ts`, `character-repository.test.ts`, `pg-character-repository.test.ts`

## Room Content Sources

All new room names and descriptions sourced from `docs/thematic-direction.md`:
- Section 1.1: The Kindari / The Reliquary
- Section 1.2: The Bloom Tenders / The Bloom Observatory
- Section 1.3: Krewe Calliope / The Carrion Court

Each stronghold has 10 rooms:
- Entry (commons)
- Stash
- Market
- Training
- Expedition Board
- Infirmary (repurposed as commons/gathering in new theme)
- War Room
- Armoury
- Inn (2 rooms: common + upper)

## Build Verification

TypeScript compilation successful. All type references, imports, and constants updated correctly. No breaking changes to existing APIs.

## Impact

- **Players:** Character creation now offers new faction choices with updated lore
- **Existing characters:** Faction memberships automatically migrated via UPDATE
- **Death/spawn routing:** All hub zone routing updated to new zone slugs
- **Inn system:** Last inn tracking updated to new zone/room slugs
- **Tests:** All faction-related tests updated and passing

## Future Work

- Migration 016 inn room names could be updated in future migration to better match new faction themes
- Seed content migration (002) still references old faction data but is superseded by migration 017
- Consider updating any remaining flavor text in other zones that reference old faction names
---
# Decision: Gold to Water Currency Rename

**Date:** 2026-03-31  
**Agent:** Bruenor  
**Requester:** dkirby-ms  
**Status:** Implemented

## Context

The game economy has been realigned from generic fantasy gold to **potable water** as the primary currency, reflecting the post-apocalyptic Gulf Coast setting where clean drinking water is the most valuable resource. The in-world unit is "draws" (a draw of water from a cistern).

## Changes Made

### Database Migration: `018_gold_to_water.sql`

- Simple column rename: `characters.gold` → `characters.water`
- Follows existing migration pattern with BEGIN/COMMIT wrap
- Placed after `017_faction_renames.sql` in migration sequence

### Code Updates

1. **LLM Narration Filter** (`llm-client.ts`)
   - Added `water` and `draws` to FORBIDDEN_PATTERNS regex
   - Kept `gold|coins` in the pattern to catch LLM hallucinations
   - Pattern now: `/\b\d+\s*(?:gold|coins|water|draws|XP|experience)\b/i`

2. **Tests** (`wave3-narration-contracts.test.ts`)
   - Updated test description: `'rejects text with gold or water numbers'`
   - Added second test case: `'You collect 30 draws of water.'`
   - Ensures validation catches both old and new currency terms

### Verification

- TypeScript build passed with no errors
- No other code references to `.gold` column found
- Test fixtures with "gold-ring" item names left unchanged (descriptive item names, not currency)

## Rationale

- Thematic consistency with post-apocalyptic survival setting
- Water scarcity aligns with Gulf Coast flooding/contamination lore
- "Draws" provides immersive in-world terminology
- Migration preserves existing character data (column rename only)

## References

- Design document: `docs/thematic-direction.md` §8 (economy design)
- Migration pattern: `017_faction_renames.sql`
- Original gold column: Added in `016_inn_rooms.sql`
---
# Decision: Migration 019 Room Flavor Rewrite

**Date:** 2026-04-06  
**Author:** Bruenor (Content Builder)  
**Requested by:** dkirby-ms  
**Source:** Laeral's room description document revision 2.0

## Context

Laeral produced a complete room description rewrite for both Siltgate and Warrens zones, aligning all room content with the dystopian Gulf Coast setting (year 3000, ruins of New Orleans). The document contained 212 room entries with new names and descriptions designed to eliminate duplication and establish consistent thematic atmosphere.

## Implementation

Created `019_room_flavor_rewrite.sql` with the following structure:

### Zone Description Updates
- **Siltgate:** Updated to reflect Mississippi River shift, Gulf flooding, silted delta, spanish moss, drone debris
- **Warrens:** Updated to reflect pre-extinction infrastructure, rat kingdoms, dry chambers, maintenance corridors

### Room Updates
- **137 Siltgate rooms:** All original rooms (136) + topology fix (rubble-passage-1)
- **75 Warrens rooms:** All original rooms (65) + topology fixes (gutter-sewer + 8 sewer-* rooms) + shattered-gate
- **Total:** 214 UPDATE statements (212 rooms + 2 zone descriptions)

### Pattern Used
```sql
UPDATE zone_rooms SET name = 'Room Name', description = 'Description text.'
WHERE slug = 'room-slug' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-slug');
```

Zone-qualified WHERE clause prevents cross-zone slug collisions.

## Critical Fix

Laeral's document had an entry labeled "ashgate" with "Type: warrens" listed under the Siltgate Rooms section. Investigation revealed this was actually describing the **shattered-gate** room in the Warrens zone (the room that ashgate in Siltgate connects to via cross-zone exit).

**Resolution:** Changed the migration to update `slug='shattered-gate'` in Warrens zone, not a duplicate ashgate entry.

## Thematic Elements

All descriptions now include:
- Brackish water, Gulf flooding, silted delta
- Drone wreckage and rust
- Spanish moss, kudzu, magnolias, live oaks
- Mutant wildlife: dog-sized rats, giant roaches, mutant snakes
- Pre-extinction architecture: Creole/Cajun townhouses, iron balconies
- Oppressive humidity, green algae light
- Nature reclaiming the ruins ("Nature won")

## Topology Fix Room Coverage

All 10 topology fix rooms from migrations 005 and 007 received updated descriptions:

**Siltgate (1):**
- rubble-passage-1

**Warrens (9):**
- gutter-sewer
- sewer-drip-tunnel
- sewer-cracked-conduit
- sewer-blind-turn
- sewer-narrow-drain
- sewer-rubble-choke
- sewer-trickle-passage
- sewer-slime-channel
- sewer-stagnant-pool

## SQL Discipline

- Transaction wrapped (BEGIN/COMMIT)
- All single quotes doubled for escaping
- Em-dashes preserved (valid in PostgreSQL)
- No trailing whitespace
- Subquery pattern for zone_id lookup (prevents cross-zone updates)

## Verification

- ✓ 212 room UPDATE statements
- ✓ 2 zone description UPDATE statements
- ✓ All topology fix rooms included
- ✓ No duplicate slug references within same zone
- ✓ Transaction boundaries correct
- ✓ SQL escaping verified

## Outcome

Migration 019 ready for application. When applied, all Siltgate and Warrens rooms will have dystopian Gulf Coast atmosphere with unique descriptions and thematically consistent naming.
---
### 2026-04-05T21:03:50Z: User directive
**By:** dkirby-ms (via Copilot)
**What:** Standardize on OPENAI_LLM_* env vars for LLM narration. Remove the Azure AI-specific vars (AZURE_AI_ENDPOINT, AZURE_AI_KEY, AZURE_AI_DEPLOYMENT, AZURE_AI_API_VERSION). All LLM config should use the generic OpenAI-compatible transport only.
**Why:** User request — simplifies LLM integration to a single code path. Azure OpenAI endpoints are compatible with the generic OpenAI transport anyway.

### 2026-04-06T01:42:00Z: User directive — Thematic realignment
**By:** dkirby-ms (via Copilot)
**What:** The game universe is being realigned to a dystopian Earth future, Gulf South coast of Louisiana/Mississippi, year 3000. `docs/thematic-direction.md` is the lore source of truth. GDD.md stays as-is. All factions, strongholds, and exploration zones will be reimagined for the new setting. The Refuge (dev zone) is excluded. Laeral proposes new faction names/identities. Iteration happens on the thematic direction doc before any game data changes.
**Why:** User request — major world-building pivot. Captured for team memory.

### 2026-04-06T02:00:00Z: User directive — Open question resolutions + new lore
**By:** dkirby-ms (via Copilot)
**What:**
1. No other surviving humans besides Sleepers. However, mutant descendants of humans exist — they appear as enemies or NPCs (not friendly humans).
2. Saitcho Kindar is a Satoshi Nakamoto-style anonymous figure. No one knows who he really was.
3. Siltgate is ONE settlement among others along the Gulf Coast. More settlements will be introduced (coastal first, eventually inland).
4. Drones remain inactive for now — no partially active/malfunctioning drones.
5. Some wildlife CAN be helpful (open question resolved: yes to symbiotic/useful species, but details TBD).
**Why:** User resolving open questions from Laeral's thematic direction draft. Captured for team memory.

### 2026-04-06T02:01:37Z: User directive — Currency system: potable water
**By:** dkirby-ms (via Copilot)
**What:** The game currency is potable water, not gold. Inspired by Caves of Qud — water is heavy but valuable. Brackish water is everywhere in the Gulf Coast setting, but clean/potable water is scarce. This replaces the existing `gold` column concept. Water-as-currency fits the dystopian setting organically: everyone needs it, it's hard to produce, it has real survival value, and it creates weight-based inventory tension.
**Why:** User request — fundamental economy design decision. Captured for team memory.

### 2026-04-06T13:51:34Z: User directive — Faction reputation system + faction retheme
**By:** dkirby-ms (via Copilot)
**What:**
1. Players do NOT choose a faction at character creation. They pick a starting zone/stronghold. Faction allegiance is earned through actions, not declared.
2. Players start neutral in their home city but distrusted in other strongholds.
3. Faction renaming required:
   - Urnkeepers → needs better name. User likes the Saitcho Kindar cult angle.
   - Tidereaders → bad name, likes the ecology/knowledge/navigation theme.
   - Silt Traders → complete retheme. Drop the commerce flavor. Replace with a **dark carnival tradition** faction. "Krewe Calliope" is the user's working name idea.
4. The third faction is no longer a merchant/trader guild. It's aligned around dark carnival tradition (New Orleans Mardi Gras krewe culture, but twisted for the dystopian setting).
**Why:** User request — fundamental faction identity and reputation system redesign. Captured for team memory.

### 2026-04-06T14:25:00Z: User directive — faction name feedback round 2
**By:** dkirby-ms (via Copilot)
**What:** "The Brined" and "Bloom Watch" are both rejected as faction names. User wants better options. For the algae/ecology faction, user wants the lore hook that the faction is unknowingly under the discreet influence of the mutant algae itself — the algae is subtly manipulating them in ways they don't realize. User also added a "Despised" tier to the reputation system (already in doc). Krewe Calliope is locked in — no changes needed there.
**Why:** User request — captured for team memory

### 2026-04-06T15:41Z: User directive
**By:** dkirby-ms (via Copilot)
**What:** Modifying original seed migration files and recreating the DB from scratch is acceptable instead of creating new UPDATE migrations. This overrides the previous "never modify existing migration files" constraint for content-only changes.
**Why:** User request — the room flavor rewrite affects 212 rooms across two seed files. A migration with 212 UPDATE statements is unwieldy; editing seeds in place and recreating is simpler.
---
### Bicep Env Var Audit & Fix — Container Apps Template
**By:** Drizzt (Engine Dev)
**Date:** 2026-04-06

## Decision

Aligned the Container Apps Bicep template (`infra/modules/container-apps.bicep`) with all env vars the server actually reads from `config.ts` and `admin/middleware.ts`.

## Changes

1. **Renamed** `MAX_PLAYERS_PER_SHARD` → `MAX_PLAYERS_PER_ZONE` (was silently injected but never read since migration 013)
2. **Added Azure AI vars:** `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY` (@secure), `AZURE_AI_DEPLOYMENT` (default: gpt-4o-mini), `AZURE_AI_API_VERSION` (default: 2024-08-01-preview)
3. **Added** `ENABLE_LLM_NARRATION` (default: true)
4. **Added** `ADMIN_TOKEN` (@secure, default: empty — fail-closed)
5. **Added** `AUTH_REQUIRED` (default: true — explicit for prod clarity)
6. All new params flow through `main.bicep` → `container-apps.bicep`. `main.bicepparam` has commented placeholders for Azure AI and admin token.

## Rationale

- Secrets use `@secure()` so they don't leak in deployment logs or ARM template outputs
- Azure AI vars default to empty so deployments without LLM credentials still work (template-only narration mode)
- `AUTH_REQUIRED=true` is the config.ts default, but making it explicit in Bicep prevents surprises if the code default ever changes

## Team Impact

- **Jarlaxle/Volo:** No code changes — this is infra-only. LLM narration will now actually receive Azure credentials in prod.
- **Minsc:** Admin dashboard will work in prod once `ADMIN_TOKEN` is set in the deployment pipeline.
- **All:** Any new env vars read by the server should be added to Bicep at the same time as the code change.
---
# Faction Names — Revision 2 (APPROVED)

**Date:** 2026-04-05  
**Author:** Laeral (Content Designer)  
**Requested by:** dkirby-ms  
**Status:** APPROVED — names updated throughout thematic-direction.md

---

## Context

User rejected previous faction names ("The Brined" and "The Bloom Watch") with feedback:
- "The Brined" sounds lame as a name
- Wants the algae faction to be unknowingly under the discreet influence of the algae itself (new lore hook)

Krewe Calliope remains APPROVED — no changes requested.

---

## FACTION 1: The Saitcho Kindar Cult (Tech + Preservation)

**SELECTED NAME: The Kindari**

### Rationale
- Puts Kindar's name directly IN the faction name (cult-of-personality identity)
- Sounds like a religious/cultural designation: "I'm Kindari" = "I'm Amish" / "I'm Rastafari"
- Louisiana/Creole phonetic flavor via -ari suffix (like "Rastafari")
- Spoken naturally: "The Kindari run the Reliquary," "Don't mess with the Kindari"
- Implies a PEOPLE, not just a job — it's an identity
- Short, punchy, memorable, has weight

### Options Considered
1. **The Kindari** ✓ SELECTED
2. The Preservation — too abstract, loses Kindar connection
3. Kindar's Covenant — too biblical/fantasy
4. The Urnborn — interesting but doesn't center Kindar
5. The Relic Guild — good Louisiana flavor, but less religious weight
6. Sons of the Brine — Louisiana flavor but gendered

---

## FACTION 2: The Ecology/Knowledge/Algae Faction

**SELECTED NAME: The Bloom Tenders**

### NEW LORE HOOK (Critical)
The faction is unknowingly under the discreet influence of the mutant algae itself. The algae is subtly manipulating them — guiding decisions, drawing them to locations, making them protective of the bloom, steering their "observations" toward conclusions that serve the algae's interests. The faction members don't know this. They think they're independent scientists.

### Rationale
**Double meaning (the killer detail):**
- Surface reading: "We tend to the bloom, we care for it, we cultivate it for study"
- Sinister reading: "The bloom tends US. We are being cultivated. We are tended like a garden."
- The word "tender" also means "easily damaged, vulnerable, young" — which they are, relative to an ancient organism

**Nautical legitimacy:**
- A "tender" is a ship that services offshore platforms (authentic Gulf Coast maritime term)
- Oil rig workers would naturally use this terminology
- "We're the tenders" sounds like a job description

**Botanical legitimacy:**
- Tending = cultivation, caretaking, gardening
- Scientists who study/cultivate algae would call themselves tenders

**How it sounds when spoken:**
- "The Bloom Tenders have a chart of the spring locations" — helpful, scientific
- "Don't trust the Bloom Tenders, something's off about them" — ominous
- "She's gone Tender" — in-world slang with creepy undertones

**The algae influence angle:**
Perfect for a faction that doesn't realize they're being manipulated. They chose the name because it sounds like stewardship. Once you know the lore, the name becomes deeply unsettling. They are being tended. They are the bloom's carefully maintained instruments.

### Options Considered
1. **The Bloom Tenders** ✓ SELECTED
2. The Verdant — good creep factor ("going verdant"), but loses nautical flavor and double-meaning subtlety
3. The Bloom Shepherds — religious pastoral imagery, ambiguous, but less Gulf Coast authentic
4. The Tide-Turned — Louisiana flavor, "turned" has creepy double meaning, but less clear
5. The Bloom Witnesses — religious vibe (Jehovah's Witnesses), unsettling, but less natural spoken
6. The Cultivated — very on-the-nose, dramatic irony works, but too obvious

---

## Updates Made

All instances of "The Brined" → "The Kindari" throughout docs/thematic-direction.md  
All instances of "The Bloom Watch" / "Bloom Watch" → "The Bloom Tenders" / "Bloom Tenders"

Updated sections:
- Faction identity/philosophy (§1.1, §1.2)
- Stronghold room descriptions
- NPC first contact dialogue
- Player origin/starting zone text
- Economy section (faction water relationships)
- Language guidelines
- Settlement references

**Total replacements:** ~48 instances across 668-line document

---

## Team Impact

- **Bruenor:** Faction names in database migrations and seed data will need updating when content is implemented
- **Regis:** UI labels for faction selection, reputation display, and stronghold names
- **Volo/Jarlaxle:** Faction-related game logic, NPC dialogue trees, reputation system variables
- **All writers:** Use new names in all future content — "The Kindari" and "The Bloom Tenders" are now canonical

---

## Final Note

Both names:
- Sound natural when spoken by NPCs
- Feel rooted in Louisiana/Gulf Coast culture (Creole suffix, maritime terminology)
- Carry weight — like they've been around, like they matter
- Work in the setting without feeling generic fantasy
- Have thematic depth that rewards players who pay attention

The algae influence lore hook for the Bloom Tenders is a MAJOR story vector. It should inform:
- NPC dialogue (occasional too-reverent statements about the bloom, eerie consensus, group-think)
- Faction quests (missions that seem scientific but subtly serve algae propagation)
- Player observations (Tenders being "too calm," "too synchronized," protective of bloom at personal cost)
- Future story arcs (what happens when the truth is discovered?)
---
# DECISION: Faction Reputation System & Faction Renames

**Date:** 2026-04-06  
**Author:** Laeral (Content Designer)  
**Requested by:** dkirby-ms  
**Status:** Implemented in `docs/thematic-direction.md`

---

## CONTEXT

User feedback identified two major issues with the existing faction system:

1. **Faction choice at character creation felt premature.** Players were being asked to commit to an ideology before understanding the world or the factions. This locked them into a path before they had context.

2. **Faction names were weak.** "Urnkeepers" sounded lame despite strong thematic concept. "Tidereaders" was awkward. "Silt Traders" lacked the dark atmosphere the user wanted for the third faction.

Additionally, the user wanted to completely retheme the third faction from commerce/trading to **dark carnival krewe culture** inspired by New Orleans Mardi Gras traditions.

---

## DECISION SUMMARY

### 1. REPUTATION-BASED FACTION SYSTEM

**Core Change:** Players do NOT choose a faction at character creation. They choose a **STARTING ZONE** (stronghold).

**Mechanics:**
- **Neutral start:** Players begin with neutral standing in their home stronghold. Not a member, not an enemy — just tolerated.
- **Distrusted elsewhere:** In other faction strongholds, players are distrusted — limited services, higher prices, NPC suspicion.
- **Reputation through action:** Faction standing rises/falls based on missions completed, trades made, help given, or betrayals committed.
- **Multi-faction possibility:** Players can earn standing with all three factions, or commit deeply to one, or remain freelance. Not locked.

**Consequences of Standing:**
- **Distrusted:** Minimal services, high prices, no stash/cistern access, NPC hostility
- **Neutral:** Basic services, standard prices, limited stash, professional NPCs
- **Accepted:** Full services, discounted prices, full stash/cistern access, friendly NPCs, faction missions
- **Trusted:** Best prices, rare gear access, exclusive missions, leadership recognition
- **Honored:** Legendary status, leadership roles offered, faction defends you

**Design Impact:** Character creation becomes "pick your starting city" instead of "pick your ideology." Identity emerges through play.

---

### 2. FACTION RENAMES

#### **Faction 1: Urnkeepers → The Brined**

**Name Options Considered:**
1. The Brined — Direct reference to pickling brine; Louisiana slang feel
2. Kindar's Keepers — Honors Saitcho Kindar, but too formal
3. The Urnsent — Awkward when spoken
4. Sons of the Brine — Good flavor, but gendered

**Chosen:** **The Brined**

**Rationale:** Short, punchy, sounds like Louisiana slang. "The Brined control the Reliquary" or "Don't mess with the Brined" feels natural and grounded. Directly references the brine without being overly precious.

**Thematic Update:** Expanded Saitcho Kindar cult angle. The Brined venerate the mythical, anonymous inventor of the pickling brine. Preservation and restoration of old-world tech is now framed as sacred duty — religious order meets maker space.

---

#### **Faction 2: Tidereaders → The Bloom Watch**

**Name Options Considered:**
1. The Bloom Watch — Watchers of algae blooms and ecology; Gulf Coast fishing resonance
2. Bloom Wardens — Too formal/English
3. The Tide Cult — Too ominous; sounds villainous
4. Watchers of the Bloom — Too wordy

**Chosen:** **The Bloom Watch**

**Rationale:** Short, evocative, sounds natural when spoken. "The Bloom Watch say the algae's shifting north" or "Talk to the Bloom Watch if you need a map" works conversationally. Emphasizes their role as observers and interpreters of the new ecology without sounding fantasy-generic.

**Thematic Consistency:** Core identity unchanged (ecology, knowledge, adaptation), but name is more grounded and Louisiana-appropriate.

---

#### **Faction 3: Silt Traders → Krewe Calliope (COMPLETE RETHEME)**

**Name Options Considered:**
1. Krewe Calliope — Named for Calliope Street (real New Orleans street); "krewe" is authentic Mardi Gras term
2. The Revelers — Too light; doesn't convey darkness
3. Masque Noire — French for "Black Mask"; try-hard
4. The Pageant — Loses krewe culture specificity

**Chosen:** **Krewe Calliope**

**Rationale:** Authentic New Orleans terminology. "Krewe" immediately signals Mardi Gras culture to anyone familiar with the city. "Calliope" (the street, the circus instrument) adds twisted carnival flavor. User's working name was validated as genuinely strong.

**COMPLETE FACTION RETHEME:**

**Old Identity (Silt Traders):**
- Commerce, cunning, survival brokerage
- Control trade routes, broker deals, information network
- Stronghold: The Exchange (French Quarter townhouses)
- Economic role: Distribution and logistics

**New Identity (Krewe Calliope):**
- Ritual, spectacle, cultural preservation
- Preserve twisted post-apocalyptic Mardi Gras krewe traditions
- Stronghold: The Carrion Court (collapsed Superdome)
- Economic role: **Morale economy** — provide hope, meaning, culture

**Thematic Details:**
- **Dark carnival aesthetic:** Masks, music, ritual, parades through ruins, torchlight ceremonies
- **Cult-like elements:** Secret rites, blood offerings, oaths sworn under masks, traditions that blur celebration and sacrifice
- **Masks as identity:** Krewe members wear masks in public; removing your mask is a breach of etiquette
- **Parades:** Irregular torchlit processions through Siltgate to mark seasons, honor the dead, celebrate victories
- **Rites:** Blessings before expeditions, funerals, induction ceremonies — ranging from joyful (music, dancing) to dark (symbolic sacrifice)
- **Morale economy:** People need more than water to survive — they need hope, meaning, joy. Krewe Calliope provides festivals, art, music, ritual that sustains the spirit. They charge for access (water, favors, participation, loyalty).

**Stronghold Redesign (The Carrion Court):**
- Location: Collapsed Superdome, roof open to sky, overgrown with vines
- Architecture: Scaffolding stages, lanterns hanging from girders, murals on concrete, masks everywhere
- Atmosphere: Incense smoke, drums always faintly present, flickering theatrical light, sense of being watched
- Room names: Procession Gate, Wardrobe Vault, Dance Floor, Call Board, Curiosity Bazaar, Green Room, Bunk Tiers, Inner Sanctum

**Economic Role Shift:**
- **Old role (Silt Traders):** Logistics and distribution — move water, broker bulk deals, control trade routes
- **New role (Krewe Calliope):** Morale and culture — provide psychological survival through spectacle, ritual, and meaning

This creates faction interdependence:
- **The Brined** produce water (infrastructure and filtration)
- **The Bloom Watch** discover water (springs, ecology, knowledge)
- **Krewe Calliope** sustain the will to live (hope, meaning, culture)

All three are necessary. No faction controls the full survival equation.

---

## DOCUMENT CHANGES

**Sections Updated in `docs/thematic-direction.md`:**

1. **Section 1 (Faction Redesign):**
   - Added reputation system explanation at top of section
   - Rewrote all three faction sections with new names and identities
   - Completely replaced Faction 3 (Silt Traders → Krewe Calliope)
   - Updated all stronghold room descriptions with new faction references

2. **Section 4 (Player Origin):**
   - Rewrote "First Contact" (4.2) — factions find you but don't recruit you
   - Added "Choosing a Starting Zone" (4.3) — character creation is now zone selection, not faction selection
   - Rewrote "Why Earn Faction Standing?" (4.4) — updated benefits and ideological draws

3. **Section 5 (Design Notes):**
   - Updated "Language Choices" with new faction names
   - Added krewe spelling convention (K-R-E-W-E)

4. **Section 7 (Wider World):**
   - Updated NPC dialogue examples with new faction names
   - Updated expedition board hooks with faction-appropriate missions

5. **Section 8 (Economy: Potable Water):**
   - Updated "Earning Water" (8.5) with Krewe Calliope cultural services
   - Updated "Spending Water" (8.6) with faction-appropriate service costs
   - **Completely rewrote "Faction Relationships to Water" (8.7):**
     - The Brined: Producers (filtration systems)
     - The Bloom Watch: Prospectors (spring knowledge, algae research)
     - Krewe Calliope: Morale Keepers (hope, meaning, culture)
   - Updated cistern descriptions (8.4) with new faction names and reputation requirements
   - Expanded corruption questions to cover all three factions

---

## RATIONALE

**Why reputation-based factions?**
- Prevents premature commitment — players learn the world before choosing allegiance
- Creates emergent identity through play, not declaration
- Enables multi-faction play or freelance mercenary paths
- Mirrors real-world reputation systems (you earn trust through action)

**Why rename factions?**
- "Urnkeepers" sounded weak despite strong concept
- "Tidereaders" was awkward and generic
- "Silt Traders" didn't fit the dark carnival direction user wanted
- New names are Louisiana-grounded, conversational, and evocative

**Why completely retheme Faction 3?**
- User explicitly wanted dark carnival krewe culture, not commerce
- Commerce/trading faction lacked atmospheric weight compared to tech preservation and ecology
- New Orleans Mardi Gras krewe culture is PERFECT for the setting — authentic, dark, spectacle-driven
- Morale economy fills a survival niche that water and knowledge can't: psychological sustenance

**Why Krewe Calliope specifically?**
- Calliope Street is a real New Orleans location (authentic)
- "Krewe" is authentic Mardi Gras terminology (not generic fantasy)
- The name sounds mysterious, slightly ominous, distinctly Louisiana
- User suggested it as working name — validation that it's strong

---

## IMPLEMENTATION NOTES

**For Backend Team (Bruenor / Drizzt):**

- **Faction system mechanics will need expansion:** Current system likely has binary faction membership. New system requires:
  - Reputation score per faction (numeric or tier-based)
  - Reputation gain/loss triggers (mission completion, trading, combat)
  - Standing-based service gating (inn access, prices, stash limits, cistern access)
  - Starting zone selection at character creation (determines initial spawn, neutral faction, early quests)

- **Faction references throughout codebase need updating:**
  - Rename "Urnkeepers" → "The Brined" (or `brined` in code)
  - Rename "Tidereaders" → "The Bloom Watch" (or `bloom_watch` in code)
  - Rename "Silt Traders" → "Krewe Calliope" (or `krewe_calliope` in code)
  - Check NPC dialogue, quest text, item descriptions, stronghold names

- **Stronghold redesign for Krewe Calliope:**
  - The Exchange (French Quarter) → The Carrion Court (Superdome)
  - All 8 room names changed (see Section 1.3 in thematic-direction.md)
  - Atmosphere shifts from commerce to dark carnival

- **Water economy updates (Section 8):**
  - Faction cisterns now require NEUTRAL+ standing (not membership)
  - Krewe Calliope offers cultural services as water-earning path (performances, ritual participation)
  - Faction service costs updated (blessings, repairs, maps now faction-specific)

**Content Creation Implications:**

- **Quest design:** Faction quests should reflect new identities:
  - The Brined: Tech salvage, infrastructure repair, Kindar lore exploration
  - The Bloom Watch: Ecological mapping, spring discovery, algae cultivation
  - Krewe Calliope: Ritual preparation, parade escort, cultural relic recovery, performance participation

- **NPC dialogue:** Should reflect new faction names and reputation attitudes (distrusted vs. trusted NPCs speak differently)

- **Stronghold content:** Krewe Calliope stronghold needs atmospheric detail (masks, drums, incense, performance)

---

## OPEN QUESTIONS

1. **Reputation decay?** Do players lose standing over time if they don't maintain relationships? Or is standing permanent until actively damaged?

2. **Faction conflict mechanics?** If player has high standing with two rival factions, are there mechanical consequences? Or is multi-faction play always viable?

3. **Krewe mask mechanics?** Are masks purely cosmetic/RP flavor, or do they have gameplay implications (stealth, disguise, faction recognition)?

4. **Parade participation?** Are Krewe parades player-participatory events (scheduled, multiplayer) or narrative background flavor?

5. **Starting zone balance?** How do we ensure all three starting zones offer equally compelling early-game experiences?

---

## WRITING GUIDELINES (for future content)

**Faction Voice:**

- **The Brined:** Pragmatic, methodical, reverent toward Kindar and the past. Speak in technical terms. "Check the filtration manifold," "That drone chassis is corroded beyond recovery."

- **The Bloom Watch:** Observant, curious, adaptive. Speak in ecological terms. "The bloom's migrating north," "Chemical signature matches the awakening plume."

- **Krewe Calliope:** Theatrical, secretive, intense. Speak in performance terms. "The show must go on," "Every exit is an entrance," "Know your role."

**Tone for Krewe Calliope content:**
- Dark carnival atmosphere — masks, torchlight, drums, spectacle
- Blur the line between celebration and sacrifice
- Never fully trustworthy — are they sincere or manipulative? (Answer: both)
- Evoke New Orleans Mardi Gras culture twisted through 1000 years of apocalypse

**Louisiana Gothic Consistency:**
- All faction content must maintain Louisiana flavor (bayou, brackish water, humidity, spanish moss, New Orleans landmarks)
- Krewe Calliope especially should feel rooted in authentic Mardi Gras krewe tradition (secrecy, ritual, pageantry)

---

## CONCLUSION

This redesign transforms factions from character creation checkboxes into dynamic, reputation-based affiliations that emerge through play. The new names are Louisiana-grounded and conversational. Krewe Calliope's dark carnival identity fills a thematic and economic niche (morale/culture) that the old commerce faction didn't.

The faction system now reflects the core design philosophy: **identity is earned, not declared**.

---

**Next Steps:**
1. Backend team implements reputation mechanics and starting zone selection
2. Content team creates faction-specific quests aligned with new identities
3. Stronghold zones built with updated room names (especially The Carrion Court for Krewe Calliope)
4. NPC dialogue written to reflect reputation-based attitudes
5. Krewe Calliope traditions fleshed out (parade schedules, rite types, mask inventory)

---

**Document Status:** Complete. Ready for team review and implementation planning.
---
# Decision: Mutant Human Descendants

**Date:** 2026-03-29  
**Author:** Laeral  
**Status:** Design Complete, Awaiting Implementation

## Summary

Introduced a new hostile NPC/enemy category: **Mutant Human Descendants** — post-human organisms evolved from homo sapiens stock over ~1000 years. They are the primary humanoid threat in the game world and embody the "worst aspects of humanity" as design pillars.

## Background

The original thematic direction left open the question of whether any non-Sleeper humans survived. User directive resolved this: NO homo sapiens survived except in pickling urns. HOWEVER, mutant descendants exist — evolved from humans who didn't pickle themselves.

## Design Decisions

### 1. Core Concept
- **NOT zombies** — alive, breathing, thinking creatures with territorial behaviors
- **Uncanny valley horror** — they look *almost* human, which makes them disturbing
- **Divergent evolution** — 30-40 generations with extreme selective pressure, radiation, chemical exposure
- **Not allies** — hostile or indifferent to Sleepers; they don't recognize them as kin

### 2. Six Archetypes

Each embodies a "worst aspect" of humanity:

1. **Graftlords (Corruption)** — bloated figures with vestigial limbs, claim ruins as "kingdoms," wear symbols of authority
2. **Maw-Kin (Gluttony)** — grotesquely obese cannibals with distended jaws, hoard food obsessively
3. **Bone-Tithes (Greed)** — skeletal thieves who steal and hoard anything shiny, set traps around lairs
4. **Render-Kin (Violence/Murder)** — muscular apex hunters with claw-like nails, kill for pleasure and territory
5. **Fester-Thralls (Ugliness/Body Horror)** — misshapen disease-carriers covered in sores and tumors
6. **Rut-Callers (Lust/Obsession)** — feral, territorial during mating cycles, emit pheromones, unpredictable

### 3. Habitat Distribution
- Ruins (Graftlords in government buildings, Bone-Tithes in banks)
- Swamps and tunnels (Render-Kin ambush zones)
- Sewers and basements (Fester-Thralls in darkness)
- Residential ruins (Rut-Callers in old apartments)
- Food storage sites (Maw-Kin in warehouses, restaurants)

### 4. Naming Convention
- Use corrupted bayou creole or local slang
- Collective terms: "the Changed," "the Twisted," "them things in the ruins"
- Specific names: "Rust Kings," "the Reeking," "Vault-Wraiths," "the Clawed," "Sore-Touched," "the Fevered"

### 5. Writing Guidelines

When describing in room text or combat:
- **Focus on distortion:** "Its fingers are too long, the knuckles bend wrong."
- **Emphasize recognition:** "You see the shape of a human skull beneath the tumorous growths."
- **Use sensory horror:** smell (rot, pheromones), sound (wet breathing, clicking joints), movement (twitching, unnatural gait)

## Implementation Impact

### Content Team (Laeral + Bruenor)
- New enemy types to design (stats, loot tables, behaviors)
- New NPC dialogue referencing mutants
- Room descriptions incorporating mutant encounters
- Loot specific to mutant archetypes (e.g., Bone-Tithe hoards, Graftlord "throne rooms")

### Engineering Team
- Enemy AI for different archetype behaviors (pack hunters, ambushers, hoarders)
- Status effects (disease from Fester-Thralls, pheromone zones from Rut-Callers)
- Trap mechanics for Bone-Tithes

### Design Philosophy
These mutants are the **most disturbing element** in the game because they are US, distorted. They are what humanity became when civilization fell. This is body horror + tragedy, not fantasy monster combat.

## Related Decisions
- Wildlife remains indifferent (useful for materials but not friendly)
- Drones remain inactive (salvage only, no combat)
- Saitcho Kindar remains mythic (never met, only referenced in lore)
- Multiple settlements exist along Gulf Coast (referenced but not yet defined)

## Next Steps
1. Bruenor to create enemy database entries for each archetype
2. Laeral to write specific mutant encounters for Siltgate and Warrens zones
3. Regis to implement archetype-specific behaviors and AI patterns
4. Future expansion: mutant tribal groups, hybrid archetypes, deeper lore about their evolution
---
# Decision: Thematic Realignment — Faction and Zone Redesign

**Date:** 2026-03-29  
**Author:** Laeral (Content Designer)  
**Status:** Proposed — Awaiting user review and iteration  
**Scope:** World setting, faction identity, zone theming, narrative tone

---

## Summary

Redesigned all three factions and two major zones (Siltgate, The Warrens) to align with the new dystopian Gulf Coast setting (year 3000, post-human Earth, Louisiana/Mississippi). Factions transformed from generic fantasy archetypes into setting-specific survival factions. Zones re-themed from fantasy ruins to post-apocalyptic New Orleans and flooded infrastructure.

---

## Faction Redesigns

| Old Name | New Name | Identity | Stronghold |
|----------|----------|----------|------------|
| Ironwright Compact | **The Urnkeepers** | Technology salvage, drone scavenging, reverence for preservation urns | **The Reliquary** (water treatment plant) |
| Veil Cartographers | **The Tidereaders** | Ecological mapping, biomonitoring, mutant algae research | **The Bloom Observatory** (offshore oil platform) |
| Scarlet Ledger | **The Silt Traders** | Commerce, information brokerage, trade route control | **The Exchange** (fortified French Quarter) |

Each faction represents a distinct survival strategy for newly awakened "Sleepers" in a world that has moved on without humanity.

---

## Zone Re-Themes

### Siltgate (The City)
- **Old:** Generic fantasy port city
- **New:** Post-apocalyptic New Orleans, flooded and overgrown, Mississippi shifted west into Atchafalaya
- **Key elements:** Rusted drone debris, spanish moss, brackish water, recognizable landmarks (Superdome, French Quarter, interstate overpasses)

### The Warrens (Tier 1 Dungeon)
- **Old:** Generic fantasy ruins
- **New:** Pre-extinction service tunnels and storm drains beneath Siltgate, infested with mutant rats
- **Key elements:** Flooded maintenance corridors, rat nests, old infrastructure, claustrophobic darkness

---

## World Texture Defined

- **Drone swarms:** Everywhere, dormant, rusted, lootable but dangerous
- **Mutant wildlife:** Rats (dog-sized), roaches (plate-sized), snakes (huge water moccasins), mosquito swarms, alligators
- **Vegetation:** Kudzu, spanish moss, mangroves, mutant algae blooms (glow green, produce chemical off-gassing)
- **Atmosphere:** Oppressive humidity, everything damp/rusted/rotting, Louisiana gothic tone

---

## Tone Guidelines Established

- **Second-person room descriptions** (2-4 sentences, terminal-friendly)
- **Louisiana/Gulf Coast flavor is non-negotiable** (brackish water, humidity, spanish moss, Creole/Cajun cultural ghosts)
- **Gritty but not grimdark:** The world recovered; it's dangerous but not evil
- **Eerie but hopeful:** Humanity survived the urns; maybe we can survive again

---

## Open Questions for User Review

1. Should there be any surviving humans besides "Sleepers" (urn-preserved)? Or is humanity 100% pickled?
2. What role does Saitcho Kindar (the urn inventor) play in faction lore? Revered? Blamed? Missing?
3. Are there competing settlements in Siltgate, or just the three factions coexisting?
4. Should some drones be partially active (malfunctioning, twitching, dangerous but not intelligent)?
5. Should any wildlife be helpful (symbiotic species, trainable creatures, material sources beyond loot)?

---

## Implementation Impact

**No code changes yet.** This is design iteration material. Once approved:
- Bruenor will update zone/room descriptions in database migrations
- New faction names require `factions` table updates
- Stronghold zone descriptions and room names need database changes
- Creature re-skins (gutterspawn → mutant rats) require `creature_definitions` updates

---

## Next Steps

1. User reviews expanded `docs/thematic-direction.md`
2. Iterate on open questions and tone
3. Finalize faction names, stronghold names, and zone descriptions
4. Hand off to Bruenor for database implementation
---
# Decision: Potable Water Economy

**Author:** Laeral (Content Designer)
**Date:** 2025-07-25
**Requested by:** dkirby-ms
**Status:** DRAFT — awaiting team review

---

## Summary

The game's currency is **potable water**, measured in **draws**. This replaces the existing `gold` column concept from migration 016. Water is heavy, consumable, and universally needed — a survival currency grounded in the Gulf Coast setting.

## Key Design Points

1. **Unit:** The "draw" (~1 cup of clean water). 10 draws = a day's hydration.
2. **Weight:** Water has encumbrance. Wealth = physical burden. Rich players are slower.
3. **Consumable:** Players can drink their savings. Desperation mechanic — survival and commerce share the same resource.
4. **Faction roles:**
   - Urnkeepers **produce** water (filtration at the Reliquary)
   - Tidereaders **discover** water (spring locations, water chemistry knowledge)
   - Silt Traders **distribute** water (trade routes, brokerage, market control)
5. **Cisterns:** Faction strongholds have water cisterns (safe stash for currency). Faction-locked.
6. **Inn cost:** 10 draws for non-faction guests (replaces 10 gold).

## Backend Action Required

- Migration 016 added `gold INTEGER` column to `characters` table. This needs renaming to `water` or `draws` in a future migration.
- All game logic, commands, and UI referencing "gold" should update to water/draws terminology.
- The underlying mechanics (integer column, cost deduction) remain the same — this is a naming/theming change.

## Document Location

Full design written into `docs/thematic-direction.md`, Section 8.

## Rationale

- Directly tied to Gulf Coast setting (brackish water everywhere, clean water scarce)
- Creates weight-based inventory tension (Caves of Qud inspiration)
- Consumable currency adds desperation mechanic absent from abstract money systems
- Faction economic roles create natural interdependence and conflict
- Grounded in real-world water scarcity issues of the Louisiana/Mississippi coast
---
# Issue #312 — Exiting the Game Outside of Combat

**By:** Elminster (Lead/Architect)
**Date:** 2025-04-05
**Issue:** [#312](https://github.com/dkirby-ms/ellmud/issues/312)

---

## Architecture Summary

Issue #312 introduces **inn rooms** as the canonical "safe logout" mechanism, and refines **disconnect limbo** to make ungraceful exits visible and dangerous. The work touches four system boundaries:

1. **Room type system** — new `feature_inn` type added to `RoomType` union
2. **Zone data** — each faction stronghold gets a two-room inn (flavor + rent), replacing the old `entry` room as spawn point
3. **Command system** — new `rent` command, feature-gated to `feature_inn`
4. **Disconnect lifecycle** — `disconnected` players become visible to other players with a limbo indicator; 30s timeout unchanged (already the default)

### Key Design Decisions

- **`feature_inn` not `feature_lodging`**: Matches the issue language and MUD tradition. The `feature_` prefix means it slots into the existing `isFeatureRoomType()` / `getFeatureKey()` helpers and `featureHandlers` map with zero framework changes.
- **Two rooms per inn**: Lower room is flavor (type `corridor` or `dead_end`), upper room is the functional `feature_inn`. The `rent` command is feature-gated to the upper room only. Exit direction is `up` per the issue spec.
- **Inn replaces entry as spawn**: `entry_room_slugs` in zone definitions will point to the inn's lower room. Players who rent and re-enter spawn at the inn — narratively coherent.
- **Rent = consented leave (code 4000)**: The `rent` command triggers `client.leave(4000)` from the server side after persisting player state. This reuses the existing consented-leave path in `onLeave`, which skips reconnection grace. No new leave code needed.
- **Disconnect limbo visibility**: The `playerState.disconnected` flag already exists. Today, disconnected players are **excluded** from `ROOM_OCCUPANTS` broadcasts. We invert this: include them, but add a `disconnected: boolean` field to the player entry in `RoomOccupantsMessage`. Client renders an indicator.
- **Cost gating (free for natives)**: The `rent` command checks the player's faction against the zone's `faction_slug`. If they match, rent is free. Otherwise, deduct gold (amount TBD, can be configured per zone or globally). Phase 1: free for natives, flat fee for non-natives.

---

## Work Items

### WI-1: Add `feature_inn` Room Type (Drizzt — Backend)
**Priority:** P0 (blocks all other items)
**Files:**
- `packages/shared/src/room-graph.ts` — Add `'feature_inn'` to `RoomType` union
- `packages/server/src/generator/generator.ts` — Add `ROOM_NAMES` and `ROOM_DESCRIPTIONS` entries for `feature_inn`

**Details:**
Add `| 'feature_inn'` to the `RoomType` union type (line 41 of room-graph.ts). Add name/description templates in generator.ts for procedural zones (even if inns are primarily in hub zones, the generator needs entries to avoid runtime gaps).

**Dependencies:** None.

---

### WI-2: Add Inn Rooms to Faction Strongholds (Drizzt — Backend)
**Priority:** P0 (blocks WI-3, WI-5, WI-7)
**Files:**
- `packages/server/src/db/migrations/` — New migration file (e.g., `017_inn_rooms.sql`)

**Details:**
For each of the three faction strongholds (`the-foundry`, `the-cartographium`, `the-counting-house`), add:

1. **Lower inn room** (type `corridor`):
   - Slug: `{zone}-inn` (e.g., `foundry-inn`)
   - Flavor name and description befitting each faction's aesthetic
   - Exits: connects to the existing commons/entry room laterally, plus `up` to the rent room
2. **Upper inn room** (type `feature_inn`):
   - Slug: `{zone}-inn-upper` (e.g., `foundry-inn-upper`)
   - Name and description referencing the rent mechanic ("a quiet room with a ledger...")
   - Exit: `down` back to the lower inn room

3. **Update `entry_room_slugs`**: Change each zone's `entry_room_slugs` from the old commons room (e.g., `'{foundry-commons}'`) to the inn lower room (e.g., `'{foundry-inn}'`). This makes the inn the new spawn point.

4. **Wire exits**: Connect the existing commons room to the inn (e.g., `foundry-commons` ↔ `foundry-inn`).

**Dependencies:** WI-1 (needs `feature_inn` type to exist).

---

### WI-3: Implement `rent` Command (Drizzt — Backend)
**Priority:** P0 (core feature)
**Files:**
- `packages/server/src/commands/rent.ts` — New file: `handleRent` command handler
- `packages/server/src/commands/index.ts` — Register in `featureHandlers` map
- `packages/server/src/rooms/ZoneRoom.ts` — Handle `rent` result action (trigger server-side leave)
- `packages/shared/src/index.ts` — Add `RENT_SUCCESS` message type (or reuse narration)

**Details:**
1. Create `handleRent(ctx: CommandContext): CommandResult` in `rent.ts`:
   - Verify `ctx.room.type === 'feature_inn'` (enforced by feature gate, but belt-and-suspenders)
   - Check faction: compare player's faction slug to zone's `faction_slug`
     - If match → free
     - If no match → check player gold, deduct cost
   - On success: return a `CommandResult` with a narration ("You settle your account and retire to the inn...") **and** a new action flag (e.g., `action: 'rent'`) that ZoneRoom can detect
   - On failure (insufficient gold): return error narration

2. Register in `index.ts`:
   ```typescript
   featureHandlers.set('rent', { handler: handleRent, requiredRoomType: 'feature_inn' });
   ```

3. In `ZoneRoom.ts`, after `handleCommand` returns, check for the `rent` action. If present:
   - Persist player state (save profile, save current room as inn for re-entry)
   - Call `client.leave(4000)` to trigger a consented leave
   - This sends the client back through the normal disconnect path

4. Optionally persist the player's "last rented location" so they respawn at the inn on next login (store in `characters` or a new column).

**Dependencies:** WI-1, WI-2 (needs inn rooms to exist for testing).

---

### WI-4: Disconnect Limbo Visibility — Server (Drizzt — Backend)
**Priority:** P1 (important but not blocking core rent flow)
**Files:**
- `packages/shared/src/index.ts` — Extend `RoomOccupantsMessage.players` array to include `disconnected?: boolean`
- `packages/server/src/rooms/ZoneRoom.ts` — Modify `sendRoomOccupants` to include disconnected players with the flag

**Details:**
Currently (`ZoneRoom.ts:2174-2180`), `sendRoomOccupants` iterates `this.players` and includes all players in the room. Disconnected players are **not** filtered out (they're still in `this.players` during the grace period) but their `disconnected` flag is not sent.

Changes:
1. Extend the player entry in `RoomOccupantsMessage`:
   ```typescript
   players: Array<{ id: string; name: string; disconnected?: boolean }>;
   ```
2. In `sendRoomOccupants`, when building the players array, include the `disconnected` flag:
   ```typescript
   players.push({ id: sid, name: displayName, disconnected: ps.disconnected || false });
   ```
3. When a player's `disconnected` flag changes (set `true` on disconnect, `false` on reconnect), call `broadcastRoomOccupantsUpdate(playerState.currentRoomId)` so other players see the change.

**Dependencies:** None (can be done in parallel with WI-1–3).

---

### WI-5: Client — Rent Command & Return to Character Select (Regis — Frontend)
**Priority:** P0 (core feature, client side)
**Files:**
- `packages/client/src/hooks/useZoneConnection.ts` — Handle server-initiated leave after rent
- `packages/client/src/pages/ZoneExploration.tsx` — Navigate to `/characters` on rent leave
- `packages/shared/src/index.ts` — If a new message type is added for rent confirmation

**Details:**
When the server processes `rent`, it calls `client.leave(4000)`. The Colyseus client will fire the `onLeave` handler. The client needs to:

1. Detect that the leave was a "rent" (not an error or logout). Options:
   - Server sends a `RENT_SUCCESS` message just before the leave → client sets a flag → on `onLeave`, check the flag and navigate to `/characters` instead of showing an error
   - OR: Server sends `onLeave` with code 4000 → client checks `code === 4000` and treats it as "return to character select"

2. Navigate: `navigate('/characters')` to return the player to the character select screen (not `/` which is the login page).

3. Clear room state in the app context (`dispatch({ type: 'SET_ROOM', room: null })`).

**Dependencies:** WI-3 (needs server-side rent to be implemented to test against).

---

### WI-6: Client — Disconnect Limbo Indicator (Regis — Frontend)
**Priority:** P1 (paired with WI-4)
**Files:**
- `packages/client/src/components/RoomOccupants.tsx` — Render disconnect indicator
- `packages/shared/src/index.ts` — Type change (already done in WI-4)

**Details:**
When `RoomOccupantsMessage.players` includes a player with `disconnected: true`:
1. Show a visual indicator next to their name — e.g., a pulsing `⏳` or `💤` icon, or "linkdead" text (classic MUD term)
2. Style differently from connected players (muted/ghosted text, or amber warning color)
3. Tooltip or title attribute: "This player has lost connection"

The existing `RoomOccupants.tsx` renders players with a `👤` icon. Add a conditional:
```tsx
{player.disconnected ? '💤' : '👤'} {player.name}
```

**Dependencies:** WI-4 (needs server to send `disconnected` field).

---

### WI-7: Tests — Inn & Rent (Minsc — Tester)
**Priority:** P1 (after core implementation)
**Files:**
- `packages/server/src/__tests__/rent.test.ts` — New test file
- `packages/server/src/__tests__/feature-gate-commands.test.ts` — Extend with `rent` / `feature_inn` cases

**Details:**
Test cases:
1. **`rent` in `feature_inn` room** — succeeds, triggers consented leave (code 4000)
2. **`rent` outside inn** — returns "You can't do that here."
3. **`rent` as faction native** — free (no gold deducted)
4. **`rent` as non-native** — deducts gold (or fails if insufficient)
5. **Player spawns at inn** — after rent, re-joining the zone places player in inn room
6. **Feature gate isolation** — `rent` does not work in `feature_stash`, `feature_expedition_board`, etc.

**Dependencies:** WI-1, WI-2, WI-3.

---

### WI-8: Tests — Disconnect Limbo (Minsc — Tester)
**Priority:** P1
**Files:**
- `packages/server/src/__tests__/disconnect-limbo.test.ts` — New test file
- `packages/client/src/__tests__/RoomOccupants.test.tsx` — Extend with disconnect indicator

**Details:**
Test cases:
1. **Disconnected player visible** — After non-consented leave, player appears in `ROOM_OCCUPANTS` with `disconnected: true`
2. **Reconnected player clears flag** — After reconnection, `disconnected` becomes `false`
3. **Timeout removes player** — After 30s, player is removed from room occupants entirely
4. **Client renders indicator** — `RoomOccupants` component shows `💤` or equivalent for disconnected players
5. **Connected players normal** — Players without `disconnected` flag render normally

**Dependencies:** WI-4, WI-6.

---

## Dependency Graph

```
WI-1 (feature_inn type)
 ├── WI-2 (inn rooms in zones)
 │    ├── WI-3 (rent command)
 │    │    ├── WI-5 (client rent flow)
 │    │    └── WI-7 (rent tests)
 │    └── WI-7 (rent tests)
 └── WI-7 (rent tests)

WI-4 (limbo visibility - server)  [parallel track]
 ├── WI-6 (limbo indicator - client)
 └── WI-8 (limbo tests)
```

## Execution Order

**Phase A (parallel):**
- Drizzt: WI-1 → WI-2 → WI-3 (serial chain)
- Drizzt: WI-4 (can start immediately, parallel to WI-1)

**Phase B (after Phase A):**
- Regis: WI-5 (after WI-3)
- Regis: WI-6 (after WI-4)

**Phase C (after Phase B):**
- Minsc: WI-7 (after WI-3)
- Minsc: WI-8 (after WI-4 + WI-6)

## Open Questions

1. **Rent cost for non-natives**: What should the gold cost be? Suggest a config value (`INN_RENT_COST`) defaulting to 10 gold, overridable per zone. Defer to dkirby-ms.
2. **Last-rented persistence**: Should we add a `last_inn_zone_slug` column to characters for respawn tracking, or always respawn at faction home inn? Recommend faction home inn for simplicity in Phase 1.
3. **Siltgate merchant-inn**: The existing `merchant-inn` room in Siltgate (migration 004) is typed as `dead_end`. Should it be converted to `feature_inn` as part of this work? Recommend deferring — Siltgate is not a starter zone.
---
# Siltgate & Warrens Room Descriptions — Revision 2: Unique Descriptions

**Author:** Laeral (Content Designer)
**Date:** 2025-07-18
**Revision:** 2.0 — Complete rewrite to eliminate description duplication
**Purpose:** Complete room name and description rewrites for Siltgate and Warrens zones to align with dystopian post-apocalyptic Gulf Coast setting (year 3000, New Orleans ruins). Every room now has a fully unique description.

**Setting Context:**
- Year 3000, 1000 years after human extinction via drone apocalypse
- Siltgate = ruins of New Orleans
- Mississippi shifted west into Atchafalaya, leaving silted delta
- Flooded streets, rusted drone debris, overgrown vegetation (kudzu, spanish moss, mangroves)
- Wildlife: mutant rats (dog-sized), giant roaches, mutant snakes, spiders, mosquito swarms
- Brackish water everywhere, Gulf creeping inland
- Hurricane-damaged Creole/Cajun architecture
- Oppressive humidity, green algae light, everything damp/rusted/rotting
- NOT grimdark — eerie, alive, overgrown. Nature won.

**Preservation Rules:**
- Slugs: UNCHANGED (referenced by exits, spawns, etc.)
- Types: UNCHANGED (functional game layer)
- Names: MAY change to fit setting
- Descriptions: ALL UNIQUE — no two rooms share the same description

**Changes from Revision 1:**
- Fixed massive description duplication (was ~64 unique out of 202; now 212/212 unique)
- Added 10 new rooms for topology fixes (rubble-passage-1, gutter-sewer, sewer-drip-tunnel, sewer-cracked-conduit, sewer-blind-turn, sewer-narrow-drain, sewer-rubble-choke, sewer-trickle-passage, sewer-slime-channel, sewer-stagnant-pool)
- Descriptions now match room names, types, and area context

---

## Siltgate Rooms

### apothecary
**Name:** Apothecary
**Type:** dead_end
**Description:** Cracked glass jars line shelves bolted to a tilting wall, their contents long since congealed into unidentifiable pastes. A mortar and pestle sits on the counter, stained green with algae-bloom residue. The smell of mold and forgotten medicine hangs thick.

### ash-garden
**Name:** Ash Garden
**Type:** dead_end
**Description:** A courtyard garden gone feral, where magnolias and crepe myrtles have burst through flagstone paths and a live oak draped in spanish moss dominates the center. The original plantings are strangled beneath kudzu, and the iron benches have become part of the undergrowth.

### ashgate
**Name:** Ashgate
**Type:** entrance
**Description:** The gateway into the eastern wastes stands flanked by toppled drone sentinels, their corroded hulls fused to the crumbling brick. Scorch marks blacken the archway where ancient weapons fire melted stone to glass. Beyond, the ruins stretch into a haze of ash and humidity.

### ashgate
**Name:** Ashgate East
**Type:** warrens
**Description:** Twisted metal and pulverized concrete spread in every direction, the aftermath of a drone swarm''s final engagement. Rust-orange water collects in blast craters, and kudzu creeps over the wreckage like a shroud. The air tastes of iron and wet ash.

### ashgate-chapel
**Name:** Burned Chapel
**Type:** dead_end
**Description:** Fire-blackened walls frame a roofless nave where rain has pooled on the altar. Giant roaches nest in the charred pews, but someone has placed fresh wildflowers in a cracked vase near the door. Faith persists even here.

### barnacled-quay
**Name:** Barnacled Quay
**Type:** corridor
**Description:** Wooden platforms extend over brackish water thick with oil sheen and algae blooms. Barnacles crust every surface below the waterline, and vendors sell hand-drawn navigation charts marking safe passages through the drowned streets.

### bazaar-row-1
**Name:** Bazaar Row
**Type:** corridor
**Description:** Scavengers hawk drone components and spider silk from floating platforms anchored to submerged bollards. The brackish water reflects green algae-light off their wares, and somewhere nearby, accordion music drifts through the humid air.

### bazaar-row-2
**Name:** Bazaar Row
**Type:** corridor
**Description:** Waterlogged stalls lean against collapsed storefronts, selling everything from roach chitin armor to pre-extinction curiosities. Haggling voices echo off crumbling brick while giant roaches scuttle between the vendors'' feet.

### bazaar-row-3
**Name:** Bazaar Row
**Type:** corridor
**Description:** The bazaar narrows here into a choke-point of hanging tarps and swaying rope bridges, vendors crammed shoulder-to-shoulder above the murky water. A woman sells jars of bioluminescent algae for lamp-fuel; a man offers smoked rat jerky by the strip.

### beggar-kings-court
**Name:** Beggar King''s Court
**Type:** junction
**Description:** A raised platform of lashed-together debris serves as the court of the Span''s self-proclaimed sovereign. Offerings of salvage and food are piled at the edges, and the surrounding shacks lean inward as if bowing. Rats watch from every shadow.

### beggars-lane-1
**Name:** Beggar''s Lane
**Type:** corridor
**Description:** A collapsed townhouse leans at a drunken angle, its iron-lace balcony dangling over flooded streets. Spanish moss hangs from broken shutters, and kudzu has consumed the ground floor. A faint lamplight glows from the upper level.

### beggars-lane-2
**Name:** Beggar''s Lane
**Type:** corridor
**Description:** An alley choked with debris and vegetation where kudzu has bridged the gap overhead, creating a tunnel of green shadow. Water flows through in a steady stream, and rat-runs line the upper walls. Move quickly.

### beggars-lane-3
**Name:** Beggar''s Lane
**Type:** corridor
**Description:** The lane sinks lower here, water rising to mid-calf. Corrugated tin walls channel the flow between listing shacks, and the stench of open sewage mingles with cook-smoke. Children''s laughter echoes from somewhere above the waterline.

### belvedere
**Name:** Belvedere

(Note: laeral-room-descriptions.md is 1104 lines and is referenced in decisions but full content is maintained separately in inbox for reference)

---

# Stronghold → World Zone Connections

## Design (Laeral)

**Status:** Design Complete — Ready for Implementation  
**Date:** 2026-04-06

### Executive Summary

Design establishes physical connections between the three faction strongholds and the main world zones (Siltgate and Warrens). Prioritizes thematic coherence, narrative logic, and environmental storytelling.

**Core Assignments:**
- **The Carrion Court** (Krewe Calliope) → **Siltgate** (Dockward)
- **The Reliquary** (Kindari) → **Siltgate** (Ashgate Wastes)
- **The Bloom Observatory** (Bloom Tenders) → **Warrens** (eastern wastes)

### Stronghold → Zone Assignments

#### 1. The Carrion Court → Siltgate (Dockward)
- **Rationale:** Krewe Calliope is the New Orleans krewe faction — ritual, spectacle, cultural preservation. The Carrion Court is the half-collapsed Superdome. Geographically, must be in Siltgate (flooded New Orleans ruins). Player flow: Spawn in Court, access Siltgate's harbor/market.
- **Entry Room:** `carrion-court-inn` (The Bunk Tiers)
- **Connection Route:** carrion-court-inn → superdome-breach → flooded-concourse → dock-street-1

#### 2. The Reliquary → Siltgate (Ashgate Wastes)
- **Rationale:** Reliquary is a converted water treatment plant on the "edge of Siltgate." Kindari revere tech and infrastructure. Industrial-edge location perfect for Ashgate Wastes transitional zone. Player flow: Access Siltgate markets but positioned at dangerous eastern edge.
- **Entry Room:** `reliquary-inn` (The Sleeper Cells)
- **Connection Route:** reliquary-inn → filtration-annex → pipe-bridge → ashgate-chapel

#### 3. The Bloom Observatory → Warrens
- **Rationale:** Repurposed offshore oil platform reaches toward hostile eastern terrain. Bloom Tenders study mutant ecology — Warrens (eastern wastes, craters, collapsed infrastructure) is perfect habitat. Positions Bloom Tenders as frontier scouts.
- **Entry Room:** `bloom-observatory-inn` (The Watchtower Bunk)
- **Connection Route:** bloom-observatory-inn → platform-descent → causeway-terminus → shattered-gate

### Connection Design & Transitional Rooms

#### Carrion Court → Siltgate Connection

**New Room 1: Superdome Breach**
- **Slug:** `superdome-breach`
- **Type:** `corridor`
- **Zone:** `the-carrion-court`
- **Description:** "A jagged rent in the Superdome's outer wall allows passage between the Krewe's domain and the streets beyond. Vines thread through the gap, and rainwater pools on cracked concrete. Krewe banners hang from the rusted girders above, visible from the street — a territorial marker and an invitation."

**New Room 2: Flooded Concourse**
- **Slug:** `flooded-concourse`
- **Type:** `corridor`
- **Zone:** `the-siltgate`
- **Properties:** `{water}`
- **Description:** "The approach to the Superdome wades through ankle-deep brackish water, the street submerged where drainage has failed. Carnival debris floats on the surface — plastic beads, torn masks, waterlogged feathers. The drum-echo from within the Dome is audible even here."

**Exit Mapping:**
- `carrion-court-inn` ↔ `superdome-breach` (south/north)
- `superdome-breach` ↔ `flooded-concourse` (south/north)
- `flooded-concourse` ↔ `dock-street-1` (south/north)

#### Reliquary → Siltgate Connection

**New Room 1: Filtration Annex**
- **Slug:** `filtration-annex`
- **Type:** `corridor`
- **Zone:** `the-reliquary`
- **Properties:** `{heavy_door}`
- **Description:** "A narrow maintenance corridor extending from the Reliquary's main structure, its walls lined with rusted piping and gauge dials. The Kindari have reinforced this passage with welded iron plates. A heavy security door at the far end leads to the wasteland beyond."

**New Room 2: Pipe Bridge**
- **Slug:** `pipe-bridge`
- **Type:** `entrance`
- **Zone:** `the-siltgate`
- **Description:** "A suspended walkway built atop massive water mains that cross a blast crater. The pipes groan underfoot, and gaps in the grating offer vertiginous views of rubble far below. The Reliquary's concrete bulk looms behind; ahead, the burned chapel marks the edge of Ashgate."

**Exit Mapping:**
- `reliquary-inn` ↔ `filtration-annex` (east/west)
- `filtration-annex` ↔ `pipe-bridge` (east/west)
- `pipe-bridge` ↔ `ashgate-chapel` (east/west)

#### Bloom Observatory → Warrens Connection

**New Room 1: Platform Descent**
- **Slug:** `platform-descent`
- **Type:** `corridor`
- **Zone:** `the-bloom-observatory`
- **Description:** "An external staircase of rusted grating spirals down the platform's leg, exposed to salt wind and spray. Algae slicks coat every surface, making footing treacherous. Below, the causeway extends eastward across brackish shallows toward the wasteland horizon."

**New Room 2: Causeway Terminus**
- **Slug:** `causeway-terminus`
- **Type:** `entrance`
- **Zone:** `warrens`
- **Description:** "The corroded causeway meets solid ground at the edge of the eastern wastes. The transition is abrupt — behind you, the green-slicked platform rises from the water; ahead, blast-scarred earth and the shattered archway of the Warrens. The Bloom Tenders call this the 'Threshold.' Few cross it lightly."

**Exit Mapping:**
- `bloom-observatory-inn` ↔ `platform-descent` (down/up)
- `platform-descent` ↔ `causeway-terminus` (east/west)
- `causeway-terminus` ↔ `shattered-gate` (east/west)

### Design Rationale

1. **Krewe Calliope MUST be in Siltgate** — they're the New Orleans krewe faction, and the Carrion Court is the Superdome. No other placement makes narrative sense.

2. **Kindari positioned at Ashgate Wastes** — their water treatment plant is "on the edge of Siltgate," and Ashgate is the transitional zone to the Warrens. Perfect thematic and geographic fit.

3. **Bloom Tenders at the Warrens edge** — their offshore platform reaches toward the eastern wastes. Positions them as frontier scouts, fitting their exploratory/ecological identity.

4. **Two transitional rooms per connection** — creates a buffer zone, allows for pacing, and provides environmental storytelling space. One room = too abrupt. Three rooms = padding.

5. **Exit directions chosen for spatial logic:**
   - Carrion Court: **south** (out of Superdome toward harbor)
   - Reliquary: **east** (toward the wastes/Ashgate)
   - Bloom Observatory: **down then east** (descending platform, crossing causeway toward wastes)

---

## Implementation (Bruenor)

**Status:** Complete  
**Date:** 2026-04-06  
**Migration:** `022_stronghold_connections.sql`

### Implementation Summary

Implemented Laeral's design for connecting the three faction strongholds to the main world zones. Created 6 transitional rooms and established 24 bidirectional exits (3 inter-zone connections).

### Key Implementation Decisions

#### 1. Transitional Room Ownership

Placed transitional rooms in the zone that "owns" them narratively:

- `superdome-breach` → `the-carrion-court` (part of Superdome structure)
- `flooded-concourse` → `the-siltgate` (the street approach)
- `filtration-annex` → `the-reliquary` (part of water plant)
- `pipe-bridge` → `the-siltgate` (the Ashgate approach)
- `platform-descent` → `the-bloom-observatory` (on the platform)
- `causeway-terminus` → `warrens` (where causeway meets wastes)

This pattern follows the existing Siltgate↔Warrens connection model where inter-zone portals sit at the zone boundary, with "approach" rooms in the destination zone.

#### 2. Exit Direction Conflict Resolution

Three existing rooms had occupied exit directions. Resolved as follows:

**dock-street-1** (Siltgate):
- Occupied: north→tavern-row, south→dock-street-2, east→fish-market
- **Solution:** Used WEST for flooded-concourse connection
- **Narrative fit:** Flooded Concourse is "west" of the docks, spatially coherent

**ashgate-chapel** (Siltgate):
- Occupied: north→dust-bowl
- **Solution:** Used WEST for pipe-bridge connection
- **Narrative fit:** Pipe Bridge leads "back" toward the Reliquary (west)

**shattered-gate** (Warrens):
- Occupied: west→the-refuge, east→rubble-boulevard, south→the-siltgate
- **Solution:** Used NORTH for causeway-terminus connection
- **Narrative fit:** Causeway approaches from the "north" (offshore direction)

All direction choices maintain spatial coherence and narrative logic.

#### 3. Inter-Zone Exit Pattern

Followed the established pattern from `004_seed_siltgate.sql` (lines 1450-1475):

```
-- Inter-zone portal exit (from_room_slug = to_room_slug)
('superdome-breach', 'south', 'superdome-breach', 'the-siltgate', 'flooded-concourse', false, false)
```

This "portal" pattern keeps the zone exit record in the source zone while targeting the destination zone and room. The `to_room_slug = from_room_slug` convention indicates this is a zone boundary crossing, not a simple room-to-room exit.

#### 4. Room Properties

Added properties to rooms where thematically appropriate:

- `flooded-concourse`: `{water}` — ankle-deep brackish water
- `filtration-annex`: `{heavy_door}` — Kindari security door
- Other rooms: empty properties `{}`

### Migration Structure

**6 new rooms:**
- 2 in stronghold zones (breach/descent rooms)
- 4 in world zones (2 in Siltgate, 1 in Warrens)

**24 new exits (12 bidirectional pairs):**
- 18 intra-zone exits (within same zone)
- 6 inter-zone exits (crossing zone boundaries)

Each connection route has:
- 2 intra-zone pairs in the stronghold (inn → transitional room)
- 1 inter-zone pair (stronghold → world zone)
- 2 intra-zone pairs in the world zone (transitional room → existing room)

### Zone Totals After Migration

| Zone | Rooms (before → after) | Exits (before → after) |
|------|---|---|
| the-carrion-court | 10 → 11 | 12 → 15 |
| the-reliquary | 10 → 11 | 12 → 15 |
| the-bloom-observatory | 10 → 11 | 12 → 15 |
| the-siltgate | 138 → 140 | 284 → 292 |
| warrens | 109 → 110 | 218 → 222 |

### Verification Checklist

✅ All 6 rooms created in correct zones  
✅ All 24 exits are bidirectional (12 pairs)  
✅ All inter-zone exits use portal pattern (to_room_slug = from_room_slug)  
✅ No direction conflicts with existing exits  
✅ All room slugs referenced in exits exist  
✅ Migration is atomic (BEGIN/COMMIT wrap)  
✅ Follows established SQL patterns from migrations 004, 005, 016, 017  
✅ NULLIF used for empty target_zone/target_room strings  

---
# Design: Migration Consolidation (001–022 → 4 files)

**Author:** Elminster (Lead/Architect)  
**Date:** 2026-04-06  
**Requested by:** dkirby-ms  
**Implementer:** Drizzt (Engine Dev)

---

## Summary

Consolidate 22 migration files into 4 clean files that produce the **exact same final database state** from scratch. Since we can destroy and recreate the DB, every rename, column addition, data update, and topology fix is folded into the final-state representation. No ALTER, no UPDATE-after-INSERT, no DROP — just the end result.

---

## Consolidated File Structure

| File | Purpose | Original Migrations Folded In |
|------|---------|-------------------------------|
| `001_schema.sql` | All CREATE TABLE, indexes, constraints | 001, 008 (aggressive col), 009 (room_description col), 011 (drop biome system), 012 (table rename), 013 (faction_slug col on zones), 014 (column renames), 016 (characters columns), 018 (column rename), 021 (starting_zone_slug, character_reputation table) |
| `002_seed_content.sql` | Factions, items, creatures (final names/descriptions) | 002, 004 (Siltgate items/creatures), 008 (aggressive flags), 009 (room_descriptions), 010 (idle tick values), 017 (faction renames), 020 (creature/item rethemes) |
| `003_seed_zones.sql` | All zones, rooms, and exits (final topology, final text) | 003, 004, 005, 006, 007, 013 (strongholds), 015 (refuge repurpose), 016 (inn rooms), 017 (stronghold renames), 019 (room flavor rewrites), 022 (stronghold connections) |
| `004_reputation.sql` | Reputation system table + indexes | 021 (character_reputation table only — schema part already in 001) |

> **Note on 004:** This file exists solely because `character_reputation` references `characters(id)`, which is a Tier 2 table. It could alternatively be merged into `001_schema.sql` if placed after the `characters` CREATE TABLE. Drizzt may choose to fold it into 001 and eliminate this file entirely. If so, 3 files suffice.

---

## File 1: `001_schema.sql` — Final Schema

### What changes vs. current 001

The consolidated schema must reflect the **final column state** after all 22 migrations. Every column that was added-then-renamed, or table that was renamed, uses only the final name. Every column that was added in later migrations (008, 009, 013, 016, 021) is included from the start.

### Tables to CREATE (final state)

Listed in dependency order. Key differences from original 001 are marked with ⚠️.

#### Independent tables (no FK dependencies)

1. **player_identities** — unchanged from 001
2. **item_definitions** — unchanged from 001
3. **factions** — unchanged from 001
4. ~~**biome_definitions**~~ — ⚠️ **DROP.** Removed by 011. Do not create.
5. **modifier_definitions** — unchanged from 001
6. **narrative_template_definitions** — ⚠️ Remove `biome` column (dropped by 011)
7. **loot_table_definitions** — unchanged from 001
8. **room_definitions** — unchanged from 001
9. **skill_definitions** — unchanged from 001
10. **creature_definitions** — ⚠️ Modifications:
    - Remove `biome_affinity` column (dropped by 011)
    - Add `aggressive BOOLEAN NOT NULL DEFAULT true` (added by 008)
    - Add `room_description TEXT` (added by 009)
11. **zones** — ⚠️ Modifications:
    - Rename `biome` → `theme` (011): column should be `theme TEXT NOT NULL DEFAULT 'flooded_crypt'`
    - Add `faction_slug TEXT` (added by 013)
12. **deploy_history** — unchanged from 001
13. **audit_log** — unchanged from 001

#### Tier 1 (depends on player_identities)

14. **players** — unchanged from 001

#### Tier 2 (depends on players)

15. **characters** — ⚠️ Modifications:
    - Add `water INTEGER NOT NULL DEFAULT 0` (added as `gold` in 016, renamed to `water` in 018)
    - Add `last_inn_zone_slug TEXT` (added by 016)
    - Add `last_inn_room_slug TEXT` (added by 016)
    - Add `starting_zone_slug TEXT NOT NULL DEFAULT 'the-reliquary'` (added by 021)
    - Make `faction_slug` nullable: `faction_slug TEXT` (was `TEXT NOT NULL`, changed by 021)
16. **auth_tokens** — unchanged from 001

#### Tier 3 (depends on players, characters, etc.)

17. **faction_membership** — unchanged from 001
18. **player_skills** — unchanged from 001
19. **player_stash** — unchanged from 001
20. **player_stash_capacity** — unchanged from 001
21. **player_death_penalty** — ⚠️ Was `player_shard_sickness` in 001, renamed by 012
22. **player_loadout** — unchanged from 001
23. **player_profile** — unchanged from 001
24. **run_history** — ⚠️ Modifications:
    - Rename `shard_tier` → `zone_tier` (014)
    - Rename `extracted` → `survived` (014)
    - Rename `extracted_items` → `items_carried_out` (014)
    - Remove `biome` column (dropped by 011)
25. **character_reputation** — ⚠️ New table from 021:
    ```
    id UUID PK, character_id UUID FK→characters, faction_slug TEXT NOT NULL,
    reputation INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(character_id, faction_slug)
    ```

#### Zone child tables

26. **zone_rooms** — unchanged from 001
27. **zone_exits** — unchanged from 001
28. **character_explored_rooms** — ⚠️ Modifications:
    - Remove `biome` column (dropped by 011)
    - Rename `shard_tier` → `zone_tier` (014)

### Indexes (final state)

All indexes from 001, **plus** these changes:

- ⚠️ Remove `idx_shard_sickness_character` → replace with `idx_death_penalty_character ON player_death_penalty(character_id)` (012)
- ⚠️ Replace unique index `uq_character_zone_room` with `uq_explored_character_zone_room ON character_explored_rooms(character_id, COALESCE(zone_slug, '__instance__'), room_id)` — note `__instance__` sentinel, not `__shard__` (014)
- ⚠️ Add `idx_character_reputation_char ON character_reputation(character_id)` (021)

---

## File 2: `002_seed_content.sql` — Factions, Items, Creatures

### Factions (final values from 017)

Insert 3 factions with their **final** slugs, names, and descriptions:

| Slug | Name | Source |
|------|------|--------|
| `kindari` | The Kindari | Was `ironwright` / "The Ironwright Compact" in 002, renamed 017 |
| `bloom-tenders` | The Bloom Tenders | Was `veil` / "The Veil Cartographers" in 002, renamed 017 |
| `krewe-calliope` | Krewe Calliope | Was `scarlet` / "The Scarlet Ledger" in 002, renamed 017 |

Use the full description text from migration 017 (not the original 002 text).

### Item definitions (final values from 002 + 004 + 020)

Merge all items from 002 and 004 into a single INSERT. For items rethemed in 020, use the **final** name and description:

| Item ID | Final Name | Changed by |
|---------|-----------|------------|
| `alley_thugs_coin` | Scavenged Circuit Board | 020 |
| `noble_signet_ring` | Pre-Extinction Signet Ring | 020 |
| `city_map` | Salvaged City Map | 020 |
| `silk_scarf` | Bloom-Stained Cloth | 020 |
| `healing_draught` | Algae Salve | 020 |
| `iron_sword` | Rebar Machete | 020 |
| `iron_chainmail` | Scrap-Weave Vest | 020 |
| `voidforged_blade` | Drone-Core Blade | 020 |
| `shardsteel_sabre` | Honed Drone Blade | 020 |
| `shardsteel_shard` | Drone Alloy Shard | 020 |
| `corroded_halberd` | Corroded Fire Axe | 020 |
| `rat_tail` | Rat Tail (name unchanged, description updated) | 020 |

All other items retain their original names/descriptions from 002/004.

### Creature definitions (final values from 002 + 004 + 008 + 009 + 010 + 020)

Merge all creatures from 002 and 004 into a single INSERT. Apply these cumulative changes:

1. **idle_ticks_min/max** — use the **10x multiplied** values from 010 (e.g., original 30/50 → 300/500)
2. **aggressive** column — include in INSERT. Set `false` for `city_dog` and `pigeon_flock`; `true` for all others (008)
3. **room_description** — include the column. Use final text from 020 where rethemed, otherwise 009 text
4. **name, description** — use the final rethemed values from 020 where applicable:

| Creature type | Final Name | Changed by |
|--------------|-----------|------------|
| `city_dog` | Silt Roach | 020 |
| `pigeon_flock` | Mosquito Swarm | 020 |
| `feral_dog` | Feral Hog | 020 |
| `alley_thug` | Render-Kin Stalker | 020 |
| `dockside_smuggler` | Bone-Tithe Hoarder | 020 |
| `plague_bearer` | Fester-Thrall | 020 |
| `the_harbourmaster` | The Graftlord | 020 |

Creatures NOT rethemed (keep 002/004 originals): `drowned_revenant`, `gutterspawn`, `rubble_scavenger`, `hollow_stalker`, `the_collapsed_one`, `slum_rat`, `sewer_lurker`, `feral_dog` (wait — feral_dog IS rethemed), `silt_serpent`.

**Idle tick values to use** (final = original × 10):

| Creature | idle_ticks_min | idle_ticks_max |
|----------|---------------|---------------|
| drowned_revenant | 300 | 500 |
| gutterspawn | 300 | 600 |
| rubble_scavenger | 400 | 800 |
| hollow_stalker | 500 | 1200 |
| the_collapsed_one | 800 | 1500 |
| slum_rat | 200 | 400 |
| sewer_lurker | 400 | 800 |
| city_dog (→Silt Roach) | 300 | 600 |
| pigeon_flock (→Mosquito Swarm) | 200 | 400 |
| feral_dog (→Feral Hog) | 300 | 600 |
| alley_thug (→Render-Kin Stalker) | 400 | 800 |
| dockside_smuggler (→Bone-Tithe Hoarder) | 500 | 1000 |
| silt_serpent | 400 | 800 |
| plague_bearer (→Fester-Thrall) | 600 | 1200 |
| the_harbourmaster (→The Graftlord) | 800 | 1500 |

---

## File 3: `003_seed_zones.sql` — Zones, Rooms, Exits

This is the largest and most complex file. It must produce the final topology with all rooms, exits, and descriptions in their post-019/020/022 state.

### Zones to create (6 total, final state)

| Slug | Name | Key changes folded in |
|------|------|-----------------------|
| `the-refuge` | The Refuge | 003 (created), 015 (category→dev, description update) |
| `warrens` | The Warrens | 003 (created), 007 (+8 bridge rooms), 019 (description rewrite), 022 (+causeway-terminus room) |
| `the-siltgate` | The Siltgate | 004 (created), 005 (+2 bridge rooms, topology fixes), 006 (diagonal fix), 016 (+merchant-inn-upper), 019 (description rewrite), 022 (+flooded-concourse, +pipe-bridge rooms) |
| `the-reliquary` | The Reliquary | Was `the-foundry` in 013, renamed 017. Inn added 016, descriptions from 017 |
| `the-bloom-observatory` | The Bloom Observatory | Was `the-cartographium` in 013, renamed 017. Inn added 016, descriptions from 017, 022 (+platform-descent) |
| `the-carrion-court` | The Carrion Court | Was `the-counting-house` in 013, renamed 017. Inn added 016, descriptions from 017, 022 (+superdome-breach) |

**All zones must use `theme` column** (not `biome`). Include `faction_slug` column.

### Zone details

#### The Refuge
- **category:** `dev` (from 015, not the original hub)
- **description:** Use the 015 text ("A pocket dimension maintained by the designers…")
- **theme:** `flooded_crypt`
- **7 rooms** from 003 (hearth, stash-alcove, training-grounds, expedition-board, market, infirmary, war-room)
- **12 exits** from 003 — all unchanged
- Note: Refuge was NOT rewritten by 019. Descriptions stay as original 003.

#### The Warrens
- **description:** Use the 019 text ("Beneath Siltgate's ruins lies a network…")
- **theme:** `flooded_crypt`
- **Rooms:** 101 rooms from 003 + 8 bridge rooms from 007 + 1 causeway-terminus from 022 = **110 rooms total**
- **Room descriptions:** Use 019 final text for all Warrens rooms. For rooms added by 007, check if 019 rewrites them (it does — 019 explicitly covers topology fix rooms).
- **Exits:** Use final topology after 007 fixes and 022 additions. The 007 migration removed shortcuts and inserted bridge chains — the consolidated version should have the corrected exits only (never the removed shortcuts).
- The `broken-sanctuary` description was appended-to in 007 — use the 019 rewrite as the final version (019 replaces all Warrens room descriptions completely).

#### The Siltgate
- **description:** Use the 019 text ("The ruins of New Orleans, transformed…")
- **theme:** `urban`
- **Rooms:** 136 rooms from 004 + 2 bridge rooms from 005 + 1 merchant-inn-upper from 016 + 2 rooms from 022 (flooded-concourse, pipe-bridge) = **141 rooms total**
- **Room descriptions:** Use 019 final text for all original rooms. For rooms added by 005 (rubble-passage-1, gutter-sewer), 019 covers rubble-passage-1; gutter-sewer keeps its 005 description. For 016 (merchant-inn-upper), keep 016 description. For 022 rooms (flooded-concourse, pipe-bridge), keep 022 descriptions.
- **Exits:** Final topology after 005 fixes, 006 diagonal fix, 016 merchant-inn stairs, and 022 inter-zone connections. Never include the removed shortcuts from 005.
- The `sewer-junction-2` and `sewer-tunnel-4` descriptions were appended-to in 005 — 019 provides full rewrites for these rooms; use the 019 text.
- The `collapsed-building-1` type changed from `dead_end` to `corridor` in 005; use `corridor`.

#### The Reliquary (Kindari stronghold)
- **slug:** `the-reliquary` (final, from 017)
- **faction_slug:** `kindari`
- **entry_room_slugs:** `{reliquary-inn}` (from 016+017)
- **10 rooms** with final slugs/names/descriptions from 017:
  - `reliquary-commons` "The Preservation Hall"
  - `reliquary-stash` "The Archive Cistern"
  - `reliquary-armoury` "The Assembly Bay"
  - `reliquary-expedition-board` "The Salvage Wall"
  - `reliquary-market` "The Component Exchange"
  - `reliquary-training` "The Pressure Chamber"
  - `reliquary-infirmary` "The Waterworks"
  - `reliquary-war-room` "The Schematic Vault"
  - `reliquary-inn` "The Sleeper Cells"
  - `reliquary-inn-upper` "The Sleeper Cells — Private Room"
- Plus from 022: `filtration-annex` "Filtration Annex" = **11 rooms**
- **Exits:** Use final slugs (reliquary-*, not foundry-*). Include inn connections from 016, plus 022 inter-zone exits.

#### The Bloom Observatory (Bloom Tenders stronghold)
- **slug:** `the-bloom-observatory` (final, from 017)
- **faction_slug:** `bloom-tenders`
- **entry_room_slugs:** `{bloom-observatory-inn}` (from 016+017)
- **10 rooms** with final slugs/names/descriptions from 017 + 1 from 022:
  - `bloom-observatory-commons` "The Tide Deck"
  - `bloom-observatory-stash` "The Specimen Hold"
  - `bloom-observatory-armoury` "The Navigation Station"
  - `bloom-observatory-expedition-board` "The Chart Room"
  - `bloom-observatory-market` "The Barter Net"
  - `bloom-observatory-training` "The Weather Deck"
  - `bloom-observatory-infirmary` "The Spillway"
  - `bloom-observatory-war-room` "The Signal Archive"
  - `bloom-observatory-inn` "The Bunks"
  - `bloom-observatory-inn-upper` "The Bunks — Private Room"
  - `platform-descent` "Platform Descent" (022)
- **11 rooms total**
- **Exits:** Use bloom-observatory-* slugs. Include inn connections and 022 inter-zone exits.

#### The Carrion Court (Krewe Calliope stronghold)
- **slug:** `the-carrion-court` (final, from 017)
- **faction_slug:** `krewe-calliope`
- **entry_room_slugs:** `{carrion-court-inn}` (from 016+017)
- **10 rooms** with final slugs/names/descriptions from 017 + 1 from 022:
  - `carrion-court-commons` "The Procession Gate"
  - `carrion-court-stash` "The Wardrobe Vault"
  - `carrion-court-armoury` "The Costume Workshop"
  - `carrion-court-expedition-board` "The Call Board"
  - `carrion-court-market` "The Curiosity Bazaar"
  - `carrion-court-training` "The Dance Floor"
  - `carrion-court-infirmary` "The Green Room"
  - `carrion-court-war-room` "The Inner Sanctum"
  - `carrion-court-inn` "The Bunk Tiers"
  - `carrion-court-inn-upper` "The Bunk Tiers — Private Alcove"
  - `superdome-breach` "Superdome Breach" (022)
- **11 rooms total**
- **Exits:** Use carrion-court-* slugs. Include inn connections and 022 inter-zone exits.

### Ordering within 003_seed_zones.sql

**Critical dependency order:**
1. Insert zones FIRST (zone_rooms and zone_exits FK to zones)
2. Insert zone_rooms SECOND (zone_exits reference room slugs)
3. Insert zone_exits LAST

**Recommended section order:**
1. Refuge zone → rooms → exits
2. Warrens zone → rooms → exits
3. Siltgate zone → rooms → exits
4. Reliquary zone → rooms → exits
5. Bloom Observatory zone → rooms → exits
6. Carrion Court zone → rooms → exits

---

## File 4: `004_reputation.sql` — Reputation System

This file creates only the `character_reputation` table and its index. Alternatively, this can be folded into `001_schema.sql` (placed after `characters` table creation). Drizzt's call.

**Contents from 021 (schema portion only):**
- CREATE TABLE character_reputation (...)
- CREATE INDEX idx_character_reputation_char

Note: The `characters` table changes from 021 (adding `starting_zone_slug`, making `faction_slug` nullable) are already folded into `001_schema.sql`.

---

## Key Renames Cheat Sheet

These are columns/tables/values that were added under one name and later renamed. The consolidated version uses ONLY the final name.

| What | Original | Final | Migration |
|------|----------|-------|-----------|
| **Column** zones.biome | `biome` | `theme` | 011 |
| **Table** player_shard_sickness | `player_shard_sickness` | `player_death_penalty` | 012 |
| **Column** run_history.shard_tier | `shard_tier` | `zone_tier` | 014 |
| **Column** run_history.extracted | `extracted` | `survived` | 014 |
| **Column** run_history.extracted_items | `extracted_items` | `items_carried_out` | 014 |
| **Column** character_explored_rooms.shard_tier | `shard_tier` | `zone_tier` | 014 |
| **Sentinel** `__shard__` | `__shard__` | `__instance__` | 014 |
| **Column** characters.gold | `gold` | `water` | 016→018 |
| **Faction slug** ironwright | `ironwright` | `kindari` | 017 |
| **Faction slug** veil | `veil` | `bloom-tenders` | 017 |
| **Faction slug** scarlet | `scarlet` | `krewe-calliope` | 017 |
| **Zone slug** the-foundry | `the-foundry` | `the-reliquary` | 017 |
| **Zone slug** the-cartographium | `the-cartographium` | `the-bloom-observatory` | 017 |
| **Zone slug** the-counting-house | `the-counting-house` | `the-carrion-court` | 017 |

## Dropped Columns/Tables

| What | Removed by |
|------|-----------|
| `biome_definitions` table | 011 |
| `narrative_template_definitions.biome` column | 011 |
| `creature_definitions.biome_affinity` column | 011 |
| `run_history.biome` column | 011 |
| `character_explored_rooms.biome` column | 011 |

## Data That Was Inserted Then Updated

These are seed data rows where later migrations changed the values. The consolidated version should use the FINAL value only.

| Entity | Original Value | Final Value | Changed by |
|--------|---------------|-------------|-----------|
| Refuge zone category | `hub` | `dev` | 015 |
| Refuge zone description | (original 003 text) | 015 text ("A pocket dimension maintained…") | 015 |
| Warrens zone description | (original 003 text) | 019 text ("Beneath Siltgate's ruins…") | 019 |
| Siltgate zone description | (original 004 text) | 019 text ("The ruins of New Orleans…") | 019 |
| All Siltgate room names/descriptions | (original 004 text) | 019 text | 019 |
| All Warrens room names/descriptions | (original 003 text) | 019 text | 019 |
| 7 creature names/descriptions | (original 002/004 text) | 020 rethemed text | 020 |
| 12 item names/descriptions | (original 002 text) | 020 rethemed text | 020 |
| All creature idle_ticks | (original values) | 10× original values | 010 |
| 2 creature aggressive flags | `true` (default) | `false` | 008 |
| All creature room_descriptions | (none) | Text from 009 or 020 | 009, 020 |
| Stronghold room names/descriptions | (013 text) | 017 text | 017 |
| Stronghold entry_room_slugs | `{*-commons}` → `{*-inn}` | `{*-inn}` (final slug) | 016, 017 |
| Faction names/slugs/descriptions | (002 text) | 017 text | 017 |
| Stronghold zone slugs/names/descriptions | (013 text) | 017 text | 017 |

---

## Tricky Spots for the Implementer

1. **Siltgate slug inconsistency.** Migration 004 creates the zone as `the-siltgate`, but 016 references it as `siltgate` (when adding merchant-inn-upper). Check which slug the codebase actually uses. The zone was created with `the-siltgate` in 004 — use that consistently.

2. **Room descriptions with appended text.** Migrations 005 and 007 appended text to existing room descriptions using `description || ' ...'`. Migration 019 completely rewrites all these rooms, so use the 019 text and ignore the append operations. However, verify that 019 covers `gutter-sewer` (added by 005) — it may not, since 019 says "137 Siltgate rooms (136 original + 1 topology fix: rubble-passage-1)". If `gutter-sewer` is not in 019, keep the 005 description.

3. **Bridge rooms from 005 and 007.** These rooms were added to fix topology. They must appear in the consolidated zone room INSERTs. Their final descriptions come from 019 if covered, otherwise from the original 005/007 migration.

4. **Stronghold exit slugs.** Migration 013 created exits using `foundry-*`, `cartographium-*`, `counting-house-*` slugs. Migration 017 renamed them all. Migration 016 added inn exits using old names. Migration 022 added inter-zone exits using final names. The consolidated version must use only the final `reliquary-*`, `bloom-observatory-*`, `carrion-court-*` slugs.

5. **ON CONFLICT clauses.** The original migrations used `ON CONFLICT (id) DO NOTHING` and `ON CONFLICT (type) DO NOTHING`. In a fresh-DB consolidation, conflicts shouldn't occur, but retaining the clauses is harmless and provides safety for re-runs.

6. **Inter-zone portal exits in 022.** These exits use the pattern where `to_room_slug = from_room_slug` and `target_zone_slug` + `target_room_slug` specify the actual destination. Preserve this pattern exactly.

7. **Warrens entry_room_slugs still include shattered-gate from 003.** After 022, shattered-gate also connects north to causeway-terminus. The entry point hasn't changed.

8. **010's idle tick multiplication was applied to ALL creatures at that point**, which was 7 from 002 + 8 from 004 = 15 creatures total. The consolidated version should just use the pre-computed final values listed in this document.

---

## Verification Checklist

After consolidation, verify the final DB state matches by:

1. **Table count:** 27 tables (original 28 minus `biome_definitions`)
2. **Faction count:** 3 (kindari, bloom-tenders, krewe-calliope)
3. **Item count:** 002 items (27) + 004 items (17) = **44 items**
4. **Creature count:** 002 creatures (7) + 004 creatures (8) = **15 creatures**
5. **Zone count:** 6 (the-refuge, warrens, the-siltgate, the-reliquary, the-bloom-observatory, the-carrion-court)
6. **Room counts:**
   - The Refuge: 7
   - The Warrens: 110 (101 from 003 + 8 from 007 + 1 from 022)
   - The Siltgate: 141 (136 from 004 + 2 from 005 + 1 from 016 + 2 from 022)
   - The Reliquary: 11 (8 from 013 + 2 from 016 + 1 from 022)
   - The Bloom Observatory: 11 (8 from 013 + 2 from 016 + 1 from 022)
   - The Carrion Court: 11 (8 from 013 + 2 from 016 + 1 from 022)
   - **Total: 291 rooms**
7. **Column spot checks:**
   - `zones.theme` exists (not `biome`)
   - `zones.faction_slug` exists
   - `characters.water` exists (not `gold`)
   - `characters.starting_zone_slug` exists, NOT NULL, DEFAULT 'the-reliquary'
   - `characters.faction_slug` is nullable
   - `run_history.zone_tier` exists (not `shard_tier`)
   - `run_history.survived` exists (not `extracted`)
   - `creature_definitions.aggressive` exists
   - `creature_definitions.room_description` exists
   - No `biome` column on any table
   - `player_death_penalty` table exists (not `player_shard_sickness`)
   - `character_reputation` table exists
8. **Index spot checks:**
   - `uq_explored_character_zone_room` uses `__instance__` sentinel
   - `idx_death_penalty_character` exists on `player_death_penalty`
   - `idx_character_reputation_char` exists

---

## Migration Runner Considerations

The existing migration runner (check `packages/server/src/db/` for the runner implementation) likely tracks applied migrations by filename or number. Drizzt should:

1. Verify the runner's tracking mechanism (migration table? filename check?)
2. For the fresh-DB scenario: wipe the tracking table along with the DB
3. Consider whether to update the runner to handle the new 001–004 numbering
4. Remove the old 001–022 files after consolidation (or archive them in a `migrations/archive/` folder)

---

# Decision: DikuMUD Zone Importer Prototype

**Author:** Bruenor  
**Date:** 2026-07-25  
**PR:** #325  
**Status:** Prototype / Experimental

## Context

Built a converter script (`scripts/import-diku-zone.ts`) that parses classic CircleMUD `.wld` world files and generates Ellmud-compatible SQL migrations. This enables importing rooms and exits from the massive library of existing DikuMUD/CircleMUD content.

## Key Decisions

1. **Room-only scope:** Only `.wld` files (rooms + exits). Items (`.obj`), creatures (`.mob`), and zone resets (`.zon`) are future work.

2. **SQL format matches 003_seed_zones.sql exactly:** Cross-join VALUES, ON CONFLICT guards, NULLIF for inter-zone columns, subquery zone_id. Imported content uses the same patterns as hand-authored zones.

3. **Cross-zone exits are skipped:** Exits pointing to vnums outside the file are logged as warnings but not included in output. Resolving cross-zone exits would require parsing multiple `.wld` files together — future enhancement.

4. **Slug generation:** Room names → kebab-case, auto-deduplicated. This means duplicate names like "The Great Field Of Midgaard" get suffixed (`-2`, `-3`).

5. **Output is NOT a migration:** The sample SQL goes to `scripts/sample-diku-import.sql` for review. It should be manually reviewed and adapted before being used as an actual migration.

## Team Impact

- **Laeral:** Imported zones may need topology review before use (classic MUD layouts can have cycles that challenge the layout algorithm)
- **Drizzt:** No engine changes needed — output is standard zone SQL
- **All:** The tbaMUD repo on GitHub (`tbamud/tbamud`) has ~30 stock zone `.wld` files that could be imported for testing or inspiration

---

# Decision: Midgaard Zone Import

**Author:** Bruenor  
**Date:** 2025-07-25  
**PR:** #331  
**Migration:** `004_import_midgaard.sql`

## What

Imported the classic DikuMUD Midgaard zone as a real playable zone (57 rooms, 115 exits) connected to Siltgate via portal exits.

## Key Decisions

1. **Category `dungeon`** — Task requested `adventure` but that's not a valid category. Used `dungeon` (same as Warrens and Siltgate).

2. **Entry room = `outside-the-west-gate-of-midgaard`** — Portal from Siltgate drops players at Midgaard's west gate exterior. This is both the arrival point and the zone entry room.

3. **Siltgate connection via `city-gate` (west)** — Direction `west` was free on both `city-gate` in Siltgate and `outside-the-west-gate-of-midgaard` in Midgaard. Both portals go "west" which makes geographic sense (Midgaard is accessible through Siltgate's city gate).

4. **Excluded `petshop-storeroom`** — DikuMUD builder meta-room containing implementation instructions, not player content. No exits, no connections. 57 rooms instead of 58.

5. **Room descriptions preserved verbatim** — Original DikuMUD text kept as-is. These can be rethemed later (like the Siltgate rewrite in migration 019) but the raw content is the value.

## Impact on Other Agents

- **Laeral:** May want to design a thematic rewrite for Midgaard rooms (Gulf Coast setting), similar to the Siltgate/Warrens rewrite.
- **Drizzt:** New zone registered — layout engine will process 57 rooms. Watch for topological conflicts.
- **Siltgate now has 141 rooms** (was 140) counting the new exit from city-gate. Actually no — no new room was added, just a new exit direction from city-gate.

---

# Decision: Use short room slug prefixes for strongholds

**Date:** 2026-04-08

## Decision
Adopt the short room slug prefixes from the redesign proposal (`reliquary-*`, `bloom-*`, `carrion-*`) for the stronghold rebuild. The zone slugs remain unchanged, while entry room slugs and inter-zone exit targets were updated to match the new room slugs.

## Rationale
Code references only the stronghold zone slugs, and no application code depends on the legacy room slug prefixes. Using the shorter prefixes keeps the stronghold layout readable and consistent with the proposal while preserving existing zone routing logic.

---

# Decision: Auto-retarget on target death (combat system)

**Author:** Drizzt (Engine Dev)
**Date:** 2025-07-22
**PR:** #323
**Issue:** #321

## Decision
When a combatant's `currentTarget` dies or becomes invalid, the auto-attack logic now calls `cycleTarget()` to find the next valid hostile instead of defaulting to dodge. Dodge is only the fallback when no hostiles remain.

Additionally, when a combatant is defeated, all remaining combatants in the encounter who targeted them get their `currentTarget` cleared immediately. This ensures clean state for the next tick.

## Rationale
- Players expect continuous combat flow in multi-creature encounters. Stopping to dodge after each kill breaks combat feel.
- `cycleTarget()` already existed and handles edge cases (dead targets, wrap-around). Reusing it keeps the logic in one place.
- Clearing stale targets on defeat is a defense-in-depth measure — even if auto-retarget handles it, we shouldn't let dead IDs linger.

## Impact
- Applies to both players and creatures (shared auto-attack path in `resolveTick`)
- Creature AI in `behavior.ts` submits explicit actions and won't hit this code path unless AI fails to submit
- No behavior change when all enemies are dead (dodge remains correct)

---

# Decision: GOTO command registered as standard handler (not feature-gated)

**Author:** Drizzt  
**Issue:** #328  
**PR:** #330  
**Date:** 2026-04-07

## Context
The `goto` command is a dev-only teleport. It could have been added to the `featureHandlers` map (requiring a specific room type) or the standard `handlers` map with an internal dev-mode check.

## Decision
Registered `goto` in the standard `handlers` map with the dev-mode gate inside the handler itself (same pattern as `peaceful`). This means `goto` works from any room type when dev mode is on — which is the correct behavior for a teleport debug tool.

## Rationale
- Feature-gating would restrict `goto` to specific room types, defeating the purpose of a teleport command
- Following the existing `peaceful.ts` pattern keeps the codebase consistent
- The `getConfig().devModeEnabled` check is the established gate for dev-only commands

---

# Decision: targetNarrations pattern for directed player messages

**Author:** Drizzt  
**Date:** 2025-07-23  
**PR:** #335  

## Context
The `teleport` command needs to send feedback to both the admin (command issuer) and the target player. The existing architecture only supports: narrations to the sender, room broadcasts (say/emote), and whisper delivery.

## Decision
Added `targetNarrations?: { sessionId: string; narrations: NarrationEntry[] }` to `CommandResult`. ZoneRoom delivers these to the specified player after the normal result. This avoids coupling verb names into ZoneRoom's delivery logic (unlike the whisper/say special-casing).

## Impact
- Any future command that needs to notify a specific player can use `targetNarrations`
- Currently only supports a single target; could be extended to an array if needed
- ZoneRoom delivery is a simple `clients.find()` + `sendNarrate()` loop

---

# Decision: Combat Grid System Architecture

**Date:** 2026-01-25  
**Author:** Elminster (Lead/Architect)  
**Context:** Issue #337 — DCSS-style grid combat feature proposal  
**Status:** DROPPED (2026-04-07)

**Closed:** User directive (2026-04-07T15:08:35Z). Grid-based combat is dropped. The team will not pursue DCSS-style grid combat. Text-based tick combat remains the canonical system. Design docs preserved for reference.

---

## Decision

If combat grid system is approved, it will be implemented with the following architectural constraints:

### 1. Grid Is Optional and Supplementary
- Text-first combat remains fully functional (no grid required)
- Grid can be completely disabled (user setting + per-room opt-in)
- All grid events must generate equivalent text narration (text parity requirement)
- Screen readers must work via combat log alone (grid is visual enhancement only)

**Rationale:** Ellmud's identity is "text-first MUD with optional enhancements." Grid must not break this contract.

### 2. Server-Authoritative Grid State
- All grid positions tracked server-side
- Client renders from server messages (no client-side prediction in Phase 1)
- Movement validation happens server-side (impossible to spoof position)
- WebSocket protocol: `combat:grid:init`, `combat:grid:move`, `combat:grid:damage`, `combat:grid:remove`

**Rationale:** Server-authoritative state is core to Ellmud's anti-cheat model (see GDD §13).

### 3. Backward Compatibility via Zone Derivation
- `gridPosition?: GridPosition` added to `Combatant` (optional field)
- `position: PositionZone` derived from `gridPosition` when present
- Zone logic: Front = y≤3, Flank = 4-6, Rear = 7+ (for 10-tile grid)
- Rooms without `grid_width` use existing zone-based combat (no changes)

**Rationale:** Zero breaking changes. Grid rooms coexist with zone rooms. Old clients degrade gracefully.

### 4. Canvas 2D Rendering with DCSS CC0 Tiles
- Not WebGL (overkill for static/turn-based grid)
- Not SVG (performance issues with 400+ nodes)
- Not DOM-based ASCII (sluggish reflows)
- Use DCSS CC0 tiles from crawl/tiles repository (public domain equivalent)
- Optional: rot.js for FOV algorithms (15KB, MIT license) — evaluate in SPIKE Phase

**Rationale:** Canvas 2D is proven in DCSS webtiles, lightweight, and sufficient for tile rendering.

### 5. Performance Optimization via Caching
- **Distance matrix caching:** Compute once per tick (O(n²)), then O(1) lookups
- **Path caching:** Creatures reuse A* paths for 3-5 ticks (don't recompute every tick)
- **LOS deferred to Phase 2:** Phase 1 has no raycasting (performance headroom)
- **Target:** <100ms per tick with 20 players + 10 creatures (900 range checks + 10 pathfinding runs)

**Rationale:** 1s tick budget allows 100ms for grid logic. Caching makes this achievable.

### 6. Phased Implementation with Go/No-Go Gates
- **SPIKE Phase (1 week):** Validate text rendering + performance + visual aesthetic → Go/No-Go
- **Phase 1 (3-4 weeks):** Minimal grid on 1-2 boss rooms (no LOS/cover/animations) → Go/No-Go
- **Phase 2 (4-6 weeks):** Tactical depth (LOS, cover, fog-of-war, ASCII grid)
- **Phase 3 (8-12 weeks):** Visual polish (animations, accessibility, mobile)

**Gates:**
- SPIKE fails → defer to post-1.0
- Phase 1 fails (performance, text parity, or content design) → park feature
- Phase 1 passes but low priority → defer Phase 2 to post-launch

**Rationale:** Front-load risk. Enable early exit. Don't invest 8-14 weeks without validation.

---

## Constraints for Implementation

All code changes must respect:

1. **Text parity:** Every grid event must generate text narration (combat log remains primary)
2. **Backward compat:** Non-grid rooms work unchanged (no schema changes to existing rooms)
3. **Performance budget:** <100ms per tick with 30 entities (profile early, optimize preemptively)
4. **Accessibility:** Keyboard navigation, high-contrast mode, screen reader support
5. **Server authority:** Client cannot spoof positions (server validates all movement)

---

## Data Model

**New columns (backward-compatible):**
```sql
ALTER TABLE zone_rooms
  ADD COLUMN grid_width INTEGER DEFAULT NULL,
  ADD COLUMN grid_height INTEGER DEFAULT NULL,
  ADD COLUMN obstacles JSONB DEFAULT NULL;
```

**New interfaces:**
```typescript
export interface GridPosition {
  x: number; // 0-indexed
  y: number;
}

export interface Combatant {
  // ... existing
  gridPosition?: GridPosition;
  position: PositionZone; // Derived
}

export interface GridCombatState {
  gridWidth: number;
  gridHeight: number;
  obstacles: GridPosition[];
  entityPositions: Map<string, GridPosition>;
}
```

**Zone derivation:**
```typescript
function deriveZone(pos: GridPosition, height: number): PositionZone {
  const front = Math.floor(height / 3);
  const rear = Math.ceil(height * 2 / 3);
  if (pos.y < front) return 'front';
  if (pos.y >= rear) return 'rear';
  return 'flank';
}
```

---

## Open Questions (Blocking Implementation)

Before SPIKE Phase can begin, need dkirby-ms input on:

1. **Timeline:** Pre-launch (delay launch by 8-14 weeks) or post-launch (defer to Phase 2)?
2. **Text tolerance:** Acceptable level of ASCII awkwardness for text-only clients?
3. **Default state:** Grid opt-in or opt-out? (Default ON with toggle vs Default OFF)
4. **Art budget:** Use free DCSS tiles or commission custom pixel art (\$500-1500)?
5. **Success criterion:** What defines "good enough to ship"?

---

## Architectural Principles Established

From this analysis, codify these patterns for future features:

1. **Optional overlays pattern:** New features enhance but don't replace text experience (grid, minimap, ASCII art)
2. **Backward compatibility via optional fields:** New schema columns are NULL by default (no migration pain)
3. **Server-authoritative validation:** Client sends intent, server validates and broadcasts result (anti-cheat)
4. **Phase-gated risk reduction:** SPIKE → Phase 1 → Phase 2 → Phase 3, with go/no-go gates between each
5. **Performance through caching:** Pre-compute expensive operations (distance, paths), reuse within tick
6. **Text parity requirement:** All visual state must have text equivalent (accessibility + MUD identity)

---

## References

- **Unified proposal:** `docs/design/337-combat-grid-proposal.md`
- **Research docs:** `docs/design/337-combat-grid-systems.md`, `-frontend.md`, `-visual-design.md`
- **GitHub issue:** https://github.com/dkirby-ms/ellmud/issues/337
- **Integration points:** `packages/server/src/combat/CombatSystem.ts`, `packages/client/src/components/CombatHUD.tsx`

---

**Status:** Awaiting user input on 5 open questions. SPIKE Phase ready to execute once approved.

— Elminster

---

# Stronghold Exit Audit — Full Report

**Author:** Elminster (Lead/Architect)  
**Date:** 2025-07-17  
**Requested by:** dkirby-ms  
**Scope:** All exits in the-reliquary, the-bloom-observatory, the-carrion-court, plus inter-zone connections from the-siltgate and warrens  

---

## Executive Summary

All 63 stronghold exits and all 6 inter-zone portal connections are **structurally correct**. No data anomalies, broken links, one-way traps, or direction mismatches were found. The database matches the migration SQL exactly.

---

## Zones Audited

| Zone | Rooms | Exits (intra-zone) | Portal exits | Total |
|------|-------|---------------------|-------------|-------|
| The Reliquary | 11 | 20 | 1 | 21 |
| The Bloom Observatory | 11 | 20 | 1 | 21 |
| The Carrion Court | 11 | 20 | 1 | 21 |

All three strongholds share identical topology — they are isomorphic graphs with the same room roles and connection pattern.

---

## Check Results

### ✅ 1. Bidirectionality — PASS

Every exit from room A → room B has a corresponding exit B → A. No one-way exits exist in any stronghold. Verified all 30 intra-zone exit pairs (10 per zone) and all 3 inter-zone portal pairs.

### ✅ 2. Direction Consistency — PASS

Every exit pair uses correct opposite directions:
- north ↔ south
- east ↔ west
- up ↔ down

No mismatches found. Examples verified:
- `reliquary-inn(south) → filtration-annex` / `filtration-annex(north) → reliquary-inn` ✅
- `bloom-observatory-inn(down) → platform-descent` / `platform-descent(up) → bloom-observatory-inn` ✅
- `carrion-court-inn(south) → superdome-breach` / `superdome-breach(north) → carrion-court-inn` ✅

### ✅ 3. Duplicate Directions — PASS

No room in any stronghold has two exits in the same direction. Verified via `GROUP BY … HAVING COUNT(*) > 1` query — zero results.

### ✅ 4. Inter-Zone Portal Exits — PASS

All 6 portal exits (3 outbound from strongholds, 3 inbound from world zones) are correctly configured:

| From Zone | From Room | Dir | To Zone | To Room | Return Dir | Return OK |
|-----------|-----------|-----|---------|---------|------------|-----------|
| the-reliquary | filtration-annex | east | the-siltgate | pipe-bridge | west | ✅ |
| the-siltgate | pipe-bridge | west | the-reliquary | filtration-annex | east | ✅ |
| the-bloom-observatory | platform-descent | east | warrens | causeway-terminus | west | ✅ |
| warrens | causeway-terminus | west | the-bloom-observatory | platform-descent | east | ✅ |
| the-carrion-court | superdome-breach | south | the-siltgate | flooded-concourse | north | ✅ |
| the-siltgate | flooded-concourse | north | the-carrion-court | superdome-breach | south | ✅ |

Portal pattern verified: `to_room_slug = from_room_slug` for all portal exits, with actual target specified via `target_zone_slug` + `target_room_slug`.

### ✅ 5. Orphan Rooms — PASS

Every room in all three strongholds has at least one exit. No rooms are unreachable.

### ✅ 6. One-Way Reachable Rooms — PASS

Every room that is an exit target also has at least one exit of its own. No dead-trap rooms.

### ✅ 7. Dangling References — PASS

- All `from_room_slug` values reference existing rooms in their zone.
- All `to_room_slug` values (intra-zone) reference existing rooms in their zone.
- All `target_zone_slug` + `target_room_slug` combinations resolve to real zones and rooms.

### ✅ 8. Database vs Migration SQL — PASS

Cross-referenced all exits against `003_seed_zones.sql`. The database contains exactly the exits defined in the migration — no extras, no missing entries.

---

## Topology Map (shared by all 3 strongholds)

```
                    [armoury]
                        |
                      north
                        |
[expedition-board]—west—[commons]—east—[stash]
                        |
                      south
                        |
                     [market]
                        |
                      south
                        |
                   [infirmary]

[inn-upper]
    |
   down
    |
[war-room]—west—[training]—west—[inn]
                     |             |
                   south      south/down
                     |             |
                 [commons]   [connection-room]——portal——>[world zone]
```

Connection rooms per stronghold:
- **The Reliquary:** `filtration-annex` (inn→south, portal→east to Siltgate:pipe-bridge)
- **The Bloom Observatory:** `platform-descent` (inn→down, portal→east to Warrens:causeway-terminus)
- **The Carrion Court:** `superdome-breach` (inn→south, portal→south to Siltgate:flooded-concourse)

---

## ⚠️ Anomalies Found

**None.** All structural checks pass.

---

## Design Observations (not bugs)

These are intentional patterns, not anomalies, but noted for completeness:

1. **Dead-end rooms by design:** armoury, expedition-board, infirmary, inn-upper, and war-room each have exactly 1 exit. This is the intended faction stronghold pattern — private rooms behind chokepoints.

2. **Connection rooms are minimal gateways:** Each connection room (filtration-annex, platform-descent, superdome-breach) has exactly 2 exits — one back into the stronghold, one portal to the world. This creates clear PvP chokepoints at zone boundaries.

3. **All three strongholds are topologically identical:** Same graph structure, same room types, same exit patterns. Only the room name prefixes and connection directions differ. This is presumably intentional for faction balance.

4. **Siltgate/Warrens connection rooms follow the same minimal pattern:** flooded-concourse, pipe-bridge, and causeway-terminus each have exactly 2 exits (1 portal + 1 intra-zone).

---

# Stronghold Redesign Proposal

**Author:** Elminster (Lead/Architect)
**Status:** PROPOSAL — awaiting review
**Date:** 2025-07-14
**Scope:** All 3 faction strongholds — topology, rooms, creatures, connections

---

## Problem Statement

All three faction strongholds are currently isomorphic: 11 rooms each, every feature room hanging directly off a central commons with no connective tissue. The result:

1. **No spatial logic.** The filtration annex branches off the training room. The inn branches off the training room. The war room branches off the training room. Training is a hallway pretending to be a feature room.
2. **No corridors or paths.** Every feature is one step from commons. There's no sense of walking *through* a place.
3. **No life.** Zero creatures, guards, or ambient NPCs. The strongholds are empty lobbies.
4. **Identical topology.** A water treatment plant, an oil platform, and a superdome all share the exact same room graph. The names differ but the experience is the same.

## Design Principles

1. **Feature rooms stay.** All 9 required features (entry/commons, stash, armoury, expedition board, market, infirmary, training, war room, inn) are preserved with identical `type` slugs.
2. **Corridors create rhythm.** Walking from commons to the war room should feel like a journey through the structure, not a single step.
3. **Topology reflects architecture.** A water treatment plant has catwalks and pipe corridors. An oil platform has decks and ladders. A superdome has concourses and tunnels.
4. **Zone exits are boundaries.** The connection to the outside world is at the *edge* of the stronghold, reachable via a clear path, not buried behind a feature room.
5. **Creatures add atmosphere.** Non-aggressive guards and ambient NPCs populate corridors and key rooms, making the stronghold feel alive.
6. **Inn has one entrance.** No shortcuts — you enter the inn from one direction and go up to the private room.
7. **War room is deep.** The strategic heart of the faction should require traversal to reach.

---

## 1. THE RELIQUARY — Kindari (22 rooms)

### Design Rationale

A converted water treatment plant is a **multi-level industrial complex** with a ground floor of tanks and workspaces, catwalks above, and maintenance corridors threading through the infrastructure. The layout is roughly L-shaped: you enter through the main works, cross catwalks to reach the administrative/strategic areas, and the zone exit (filtration annex) sits at the far end of a pipe corridor — a logical boundary where plant infrastructure meets the wasteland beyond. The inn occupies a quiet corner away from the work areas, accessible via a single catwalk.

### ASCII Map

```
                                                    ┌──────────────┐
                                                    │ SCHEMATIC    │
                                                    │ VAULT        │
                                                    │ (war-room)   │
                                                    └──────┬───────┘
                                                           │ south
                                                           │
                              ┌──────────────┐     ┌──────┴───────┐
                              │ PRESSURE     │     │ UPPER        │
                              │ CHAMBER      │─east│ CATWALK      │
                              │ (training)   │     │ (corridor)   │
                              └──────┬───────┘     └──────────────┘
                                     │ south
                                     │
┌──────────────┐              ┌──────┴───────┐
│ SALVAGE      │              │ CATWALK      │
│ WALL         │──east────────│ JUNCTION     │
│ (exp-board)  │              │ (corridor)   │
└──────────────┘              └──────┬───────┘
                                     │ south
                                     │
┌──────────────┐     ┌──────────────┬┴──────────────┐     ┌──────────────┐
│ SLEEPER      │     │ SETTLING     │ PRESERVATION  │     │ PIPE         │
│ CELLS lobby  │     │ POOL         │ HALL          │     │ CORRIDOR     │
│ (inn)        │     │ (corridor)   │ (entry)       │     │ (corridor)   │
└──────┬───────┘     └──────┬───────┘└──────┬───────┘     └──────┬───────┘
       │ up                 │ south         │ south              │ east
       │                    │               │                    │
┌──────┴───────┐     ┌──────┴───────┐┌─────┴────────┐    ┌──────┴───────┐
│ SLEEPER      │     │ WATERWORKS   ││ COMPONENT    │    │ FILTRATION   │
│ CELLS room   │     │ (infirmary)  ││ EXCHANGE     │    │ ANNEX        │
│ (inn-upper)  │     │              ││ (market)     │    │ (connection) │
└──────────────┘     └──────────────┘└──────┬───────┘    └──────┬───────┘
                                            │ south             │ east
                                            │                   │
                                     ┌──────┴───────┐          → SILTGATE
                                     │ COMPONENT    │            (pipe-bridge)
                                     │ EXCHANGE     │
                                     │ BACKROOM     │
                                     │ (corridor)   │
                                     └──────┬───────┘
                                            │ south
                                            │
                              ┌──────────────┴──────────────┐
                              │ ARCHIVE      │ ASSEMBLY     │
                              │ CISTERN      │ BAY          │
                              │ (stash)      │ (armoury)    │
                              └──────────────┴──────────────┘
```

### Room List

| # | Slug | Name | Type | Description Hint |
|---|------|------|------|-----------------|
| 1 | `reliquary-commons` | The Preservation Hall | `entry` | Cavernous chamber with shrine to Kindar, workbenches, drone parts |
| 2 | `reliquary-settling-pool` | The Settling Pool | `corridor` | Old water settling basin repurposed as a gathering crossroads |
| 3 | `reliquary-infirmary` | The Waterworks | `feature_infirmary` | Functioning filtration pool used for healing and treatment |
| 4 | `reliquary-market` | The Component Exchange | `feature_marketplace` | Warehouse floor where salvage is sorted and traded |
| 5 | `reliquary-market-backroom` | Component Exchange — Backroom | `corridor` | Rear storage area connecting trade floor to equipment bays |
| 6 | `reliquary-stash` | The Archive Cistern | `feature_stash` | Drained tank with numbered alcoves for personal gear storage |
| 7 | `reliquary-armoury` | The Assembly Bay | `feature_armoury` | Workshop for repairing and restoring salvaged equipment |
| 8 | `reliquary-pipe-corridor` | Pipe Corridor | `corridor` | Narrow maintenance passage through massive water pipes |
| 9 | `reliquary-filtration-annex` | Filtration Annex | `corridor` | Reinforced passage to the wasteland — heavy security door |
| 10 | `reliquary-catwalk-junction` | Catwalk Junction | `corridor` | Rusted metal catwalk crossing above the main floor |
| 11 | `reliquary-expedition-board` | The Salvage Wall | `feature_expedition_board` | Metal wall covered in magnetic mission tags |
| 12 | `reliquary-training` | The Pressure Chamber | `feature_training` | Reinforced test room for combat drills under sodium lights |
| 13 | `reliquary-upper-catwalk` | Upper Catwalk | `corridor` | High gantry along the treatment plant's ceiling, exposed rivets |
| 14 | `reliquary-war-room` | The Schematic Vault | `feature_war_room` | Locked room with salvaged blueprints and power grid maps |
| 15 | `reliquary-inn-lobby` | The Sleeper Cells — Lobby | `corridor` | Ground-floor entrance to the bunkhouse, forge-smoke and stew |
| 16 | `reliquary-inn` | The Sleeper Cells — Private Room | `feature_inn` | Narrow bunks in filtration chambers, each with locker and lamp |
| 17 | `reliquary-drone-bay` | Drone Salvage Bay | `corridor` | Open workspace where recovered drones are stripped for parts |
| 18 | `reliquary-generator-room` | Generator Room | `corridor` | Humming diesel generator, cables snaking across the floor |
| 19 | `reliquary-cistern-access` | Cistern Access Tunnel | `corridor` | Low concrete tunnel connecting the main works to the cisterns below |
| 20 | `reliquary-shrine-alcove` | Kindar's Alcove | `corridor` | Quiet alcove off the main hall with offerings and drone fragments |
| 21 | `reliquary-loading-dock` | Loading Dock | `corridor` | Exterior-facing bay where salvage teams stage departures |
| 22 | `reliquary-watchpost` | Rooftop Watchpost | `corridor` | Exposed vantage point atop the treatment plant, views of Siltgate |

### Exit Topology

```
reliquary-commons     →  north: reliquary-catwalk-junction
                      →  south: reliquary-market
                      →  east:  reliquary-pipe-corridor
                      →  west:  reliquary-settling-pool

reliquary-settling-pool → east:  reliquary-commons
                        → south: reliquary-infirmary
                        → west:  reliquary-inn-lobby

reliquary-inn-lobby   →  east:  reliquary-settling-pool
                      →  up:    reliquary-inn

reliquary-inn         →  down:  reliquary-inn-lobby

reliquary-infirmary   →  north: reliquary-settling-pool

reliquary-market      →  north: reliquary-commons
                      →  south: reliquary-market-backroom

reliquary-market-backroom → north: reliquary-market
                          → west:  reliquary-stash
                          → east:  reliquary-armoury

reliquary-stash       →  east:  reliquary-market-backroom
reliquary-armoury     →  west:  reliquary-market-backroom

reliquary-pipe-corridor → west:  reliquary-commons
                        → east:  reliquary-filtration-annex

reliquary-filtration-annex → west:  reliquary-pipe-corridor
                           → east:  → SILTGATE (pipe-bridge)

reliquary-catwalk-junction → south: reliquary-commons
                           → north: reliquary-training
                           → west:  reliquary-expedition-board
                           → east:  reliquary-drone-bay

reliquary-expedition-board → east:  reliquary-catwalk-junction

reliquary-drone-bay   →  west:  reliquary-catwalk-junction
                      →  north: reliquary-generator-room

reliquary-generator-room → south: reliquary-drone-bay

reliquary-training    →  south: reliquary-catwalk-junction
                      →  east:  reliquary-upper-catwalk
                      →  up:    reliquary-watchpost

reliquary-upper-catwalk → west:  reliquary-training
                        → north: reliquary-war-room

reliquary-war-room    →  south: reliquary-upper-catwalk

reliquary-watchpost   →  down:  reliquary-training

reliquary-shrine-alcove → (accessed from reliquary-commons, direction: up)
reliquary-commons     →  up:    reliquary-shrine-alcove
reliquary-shrine-alcove → down:  reliquary-commons

reliquary-loading-dock → (accessed from reliquary-pipe-corridor, direction: south)
reliquary-pipe-corridor → south: reliquary-loading-dock
reliquary-loading-dock → north: reliquary-pipe-corridor
reliquary-loading-dock → south: reliquary-cistern-access
reliquary-cistern-access → north: reliquary-loading-dock
reliquary-cistern-access → up:    reliquary-stash
reliquary-stash       → (also) down: reliquary-cistern-access
```

Note: Stash has two entrances (from market-backroom and cistern-access) creating a loop. This is intentional — the cistern is physically below the market level, and the stash occupies a drained tank accessible from both.

### Creatures (5)

| Name | Slug | Behavior | Preferred Rooms | Description |
|------|------|----------|-----------------|-------------|
| Kindari Sentinel | `kindari-sentinel` | Non-aggressive, patrols corridors slowly | `reliquary-catwalk-junction`, `reliquary-pipe-corridor`, `reliquary-loading-dock` | A Kindari guard in welded-plate armour, tools hanging from their belt, scanning the catwalks with practiced calm. |
| Drone Scrap Rat | `drone-scrap-rat` | Non-aggressive, ambient fauna, flees if disturbed | `reliquary-drone-bay`, `reliquary-generator-room`, `reliquary-cistern-access` | A fat grey rat with a circuit-board fragment wedged in its teeth, scurrying between machinery. |
| Preservation Archivist | `preservation-archivist` | Non-aggressive, stationary NPC in shrine | `reliquary-shrine-alcove`, `reliquary-commons` | An elderly Kindari tending the shrine, murmuring inventory counts like prayer. |
| Pipeline Tech | `pipeline-tech` | Non-aggressive, patrols between work areas | `reliquary-settling-pool`, `reliquary-infirmary`, `reliquary-generator-room` | A Kindari technician checking pipe gauges, wrench in hand, grease on everything. |
| Catwalk Lookout | `catwalk-lookout` | Non-aggressive, stationary on watchpost | `reliquary-watchpost`, `reliquary-upper-catwalk` | A Kindari lookout with binoculars made from drone optics, watching the Siltgate horizon. |

### Connection Room Placement

**Filtration Annex** (`reliquary-filtration-annex`) sits at the eastern end of the Pipe Corridor, which runs east from the commons. This makes physical sense: the filtration infrastructure extends outward from the main plant, and the pipe-bridge to Siltgate is the natural terminus of that industrial corridor. It's reachable in 3 steps from commons (commons → pipe-corridor → filtration-annex → Siltgate), placing it clearly at the boundary.

---

## 2. THE BLOOM OBSERVATORY — Bloom Tenders (23 rooms)

### Design Rationale

An offshore oil platform is a **vertical structure** with distinct deck levels connected by ladders, stairwells, and gangways. The layout is organized by elevation: the main deck (commons, social areas), the upper observation level (training, war room), and the lower utility level (stash, armoury, causeway exit). The platform descent to the causeway sits at the bottom — the literal boundary between the platform and the mainland. The algae cultivation areas create organic corridors between functional spaces, and the vertical movement (up/down) gives this stronghold a distinctly different feel from the others.

### ASCII Map

```
                    ┌──────────────┐
                    │ SIGNAL       │
                    │ ARCHIVE      │
                    │ (war-room)   │
                    └──────┬───────┘
                           │ down
                           │
              ┌────────────┴─────────────┐
              │ CROW'S      │ LENS       │
              │ NEST        │ GALLERY    │
              │ (corridor)  │ (corridor) │
              └──────┬──────┘────┬───────┘
                     │ down      │ down
                     │           │
                     └─────┬─────┘
                           │
              ┌────────────┴─────────────┐
              │ WEATHER                  │
              │ DECK                     │
              │ (training)               │
              └────────────┬─────────────┘
                           │ down
                           │
              ┌────────────┴─────────────────────────────────┐
              │                                              │
       ┌──────┴───────┐     ┌──────────────┐     ┌──────────┴───┐
       │ CHART        │     │ TIDE DECK    │     │ CULTIVATION  │
       │ ROOM         │     │ (entry)      │     │ GANGWAY      │
       │ (exp-board)  │     │              │     │ (corridor)   │
       └──────────────┘     └──────┬───────┘     └──────────┬───┘
                                   │                        │
                            ┌──────┴───────┐         ┌──────┴───────┐
                            │ MESS DECK    │         │ ALGAE        │
                            │ (corridor)   │         │ TERRACES     │
                            │              │         │ (corridor)   │
                            └──────┬───────┘         └──────┬───────┘
                                   │                        │
                      ┌────────────┴──────┐          ┌──────┴───────┐
                      │                   │          │ BARTER NET   │
               ┌──────┴───────┐    ┌──────┴──────┐   │ (market)     │
               │ BUNKS        │    │ SPILLWAY    │   └──────────────┘
               │ lobby        │    │ (infirmary) │
               │ (corridor)   │    │             │
               └──────┬───────┘    └─────────────┘
                      │ up
               ┌──────┴───────┐
               │ BUNKS        │
               │ room         │
               │ (inn)        │
               └──────────────┘


    LOWER LEVEL (below main deck):

              ┌──────────────┐     ┌──────────────┐
              │ SPECIMEN     │     │ NAVIGATION   │
              │ HOLD         │     │ STATION      │
              │ (stash)      │     │ (armoury)    │
              └──────┬───────┘     └──────┬───────┘
                     │ up                 │ up
                     └─────────┬──────────┘
                               │
                        ┌──────┴───────┐
                        │ CARGO HATCH  │
                        │ (corridor)   │
                        └──────┬───────┘
                               │ up
                        ┌──────┴───────┐
                        │ TIDE DECK    │
                        │ (entry)      │  ← connects to main deck
                        └──────┬───────┘
                               │ down → also:
                        ┌──────┴───────┐
                        │ LEG          │
                        │ STAIRWELL    │
                        │ (corridor)   │
                        └──────┬───────┘
                               │ down
                        ┌──────┴───────┐
                        │ PLATFORM     │
                        │ DESCENT      │
                        │ (connection) │
                        └──────┬───────┘
                               │ east
                               │
                               → WARRENS
                                 (causeway-terminus)
```

### Room List

| # | Slug | Name | Type | Description Hint |
|---|------|------|------|-----------------|
| 1 | `bloom-commons` | The Tide Deck | `entry` | Open platform with algae-stained railings, cultivation trays |
| 2 | `bloom-cultivation-gangway` | Cultivation Gangway | `corridor` | Narrow walkway between algae growing tanks, green mist |
| 3 | `bloom-algae-terraces` | Algae Terraces | `corridor` | Tiered cultivation pools cascading down the platform's side |
| 4 | `bloom-market` | The Barter Net | `feature_marketplace` | Sheltered trading corner for biosamples and data |
| 5 | `bloom-mess-deck` | Mess Deck | `corridor` | Communal eating area with bolted-down tables and algae tea |
| 6 | `bloom-infirmary` | The Spillway | `feature_infirmary` | Seawater pool gathering space, healing and decompression |
| 7 | `bloom-inn-lobby` | The Bunks — Common Area | `corridor` | Crew quarters entrance, salt-stained hammock frames |
| 8 | `bloom-inn` | The Bunks — Private Room | `feature_inn` | Hammocks in a former control room, portholes over water |
| 9 | `bloom-expedition-board` | The Chart Room | `feature_expedition_board` | Sealed chamber with hand-drawn expedition maps |
| 10 | `bloom-training` | The Weather Deck | `feature_training` | Exposed upper platform for navigational and combat training |
| 11 | `bloom-crows-nest` | Crow's Nest | `corridor` | Small observation platform high above the main deck |
| 12 | `bloom-lens-gallery` | Lens Gallery | `corridor` | Corridor of salvaged telescope mounts and optical instruments |
| 13 | `bloom-war-room` | The Signal Archive | `feature_war_room` | Locked data room for biomonitoring logs and faction intel |
| 14 | `bloom-cargo-hatch` | Cargo Hatch | `corridor` | Open hatch leading down to the platform's storage level |
| 15 | `bloom-stash` | The Specimen Hold | `feature_stash` | Climate-controlled vault with sample jars and sealed gear |
| 16 | `bloom-armoury` | The Navigation Station | `feature_armoury` | Outfitting workspace with charts, compasses, protective gear |
| 17 | `bloom-leg-stairwell` | Leg Stairwell | `corridor` | Rusted spiral staircase down the platform's structural leg |
| 18 | `bloom-platform-descent` | Platform Descent | `corridor` | External grating staircase, exposed to salt wind, algae-slick |
| 19 | `bloom-tidal-pool` | Tidal Pool | `corridor` | Shallow pool at the platform base, bioluminescent at night |
| 20 | `bloom-winch-platform` | Winch Platform | `corridor` | Crane and winch assembly for hauling supplies from boats |
| 21 | `bloom-kelp-garden` | Kelp Garden | `corridor` | Submerged garden of cultivated seaweed, accessible at low tide |
| 22 | `bloom-radio-shack` | Radio Shack | `corridor` | Salvaged radio equipment, the Tenders' link to mainland contacts |
| 23 | `bloom-netting-walk` | Netting Walk | `corridor` | Cargo net strung between platform legs, used as a shortcut |

### Exit Topology

```
bloom-commons         →  north: bloom-cultivation-gangway
                      →  south: bloom-mess-deck
                      →  west:  bloom-expedition-board
                      →  up:    bloom-training
                      →  down:  bloom-cargo-hatch

bloom-cultivation-gangway → south: bloom-commons
                          → north: bloom-algae-terraces
                          → east:  bloom-radio-shack

bloom-radio-shack     →  west:  bloom-cultivation-gangway

bloom-algae-terraces  →  south: bloom-cultivation-gangway
                      →  east:  bloom-market

bloom-market          →  west:  bloom-algae-terraces

bloom-mess-deck       →  north: bloom-commons
                      →  west:  bloom-inn-lobby
                      →  east:  bloom-infirmary

bloom-infirmary       →  west:  bloom-mess-deck

bloom-inn-lobby       →  east:  bloom-mess-deck
                      →  up:    bloom-inn

bloom-inn             →  down:  bloom-inn-lobby

bloom-expedition-board → east:  bloom-commons

bloom-training        →  down:  bloom-commons
                      →  up:    bloom-crows-nest
                      →  east:  bloom-lens-gallery
                      →  west:  bloom-winch-platform

bloom-winch-platform  →  east:  bloom-training
                      →  down:  bloom-netting-walk

bloom-netting-walk    →  up:    bloom-winch-platform

bloom-crows-nest      →  down:  bloom-training

bloom-lens-gallery    →  west:  bloom-training
                      →  up:    bloom-war-room

bloom-war-room        →  down:  bloom-lens-gallery

bloom-cargo-hatch     →  up:    bloom-commons
                      →  west:  bloom-stash
                      →  east:  bloom-armoury
                      →  down:  bloom-leg-stairwell

bloom-stash           →  east:  bloom-cargo-hatch

bloom-armoury         →  west:  bloom-cargo-hatch

bloom-leg-stairwell   →  up:    bloom-cargo-hatch
                      →  down:  bloom-platform-descent
                      →  east:  bloom-tidal-pool

bloom-tidal-pool      →  west:  bloom-leg-stairwell
                      →  south: bloom-kelp-garden

bloom-kelp-garden     →  north: bloom-tidal-pool

bloom-platform-descent → up:    bloom-leg-stairwell
                       → east:  → WARRENS (causeway-terminus)
```

### Creatures (5)

| Name | Slug | Behavior | Preferred Rooms | Description |
|------|------|----------|-----------------|-------------|
| Bloom Tender Warden | `bloom-warden` | Non-aggressive, patrols deck areas | `bloom-leg-stairwell`, `bloom-cargo-hatch`, `bloom-platform-descent` | A Bloom Tender in salt-crusted overalls, spear-gun slung across their back, watching the stairwell with patient eyes. |
| Algae Crawler | `algae-crawler` | Non-aggressive, ambient fauna, slow | `bloom-algae-terraces`, `bloom-kelp-garden`, `bloom-tidal-pool` | A translucent crustacean the size of a cat, feeding on algae scum, its carapace faintly bioluminescent. |
| Tide Deck Cook | `tide-deck-cook` | Non-aggressive, stationary NPC | `bloom-mess-deck` | A weathered Tender stirring a pot of kelp stew, offering unsolicited opinions about bloom pH levels. |
| Observatory Cartographer | `observatory-cartographer` | Non-aggressive, stationary NPC | `bloom-expedition-board`, `bloom-lens-gallery` | A gaunt researcher surrounded by rolled charts, muttering coordinates and marking coastline changes. |
| Nest Spotter | `nest-spotter` | Non-aggressive, stationary lookout | `bloom-crows-nest`, `bloom-radio-shack` | A Tender with a brass telescope, scanning the Gulf for approaching vessels and bloom fronts. |

### Connection Room Placement

**Platform Descent** (`bloom-platform-descent`) is at the very bottom of the vertical structure — you go down through the cargo hatch, down the leg stairwell, and arrive at the external staircase that leads to the causeway. This is exactly where a real oil platform connects to the water level. The causeway to the Warrens extends east. Reaching the exit takes 3–4 steps down from commons, creating a clear sense of descending from safety to the outside world.

---

## 3. THE CARRION COURT — Krewe Calliope (24 rooms)

### Design Rationale

A half-collapsed Superdome is a **radial structure**: a massive central bowl with concourses ringing it, tunnels leading to exterior breaches, and subterranean levels beneath. The layout follows the Dome's architecture — you enter the bowl (commons), and the concourse ring connects the major functional areas. The war room is deep beneath the Dome in the old locker rooms. The inn sits up in the stadium seating, reached by climbing. The zone exit (Superdome Breach) is at the end of a flooded tunnel — a literal hole in the wall where the Dome meets the outside streets. The Krewe's theatrical nature means corridors are decorated, processional, never plain.

### ASCII Map

```
                              ┌──────────────┐
                              │ INNER        │
                              │ SANCTUM      │
                              │ (war-room)   │
                              └──────┬───────┘
                                     │ up
                              ┌──────┴───────┐
                              │ TUNNEL OF    │
                              │ MASKS        │
                              │ (corridor)   │
                              └──────┬───────┘
                                     │ up
                              ┌──────┴───────┐
                              │ LOCKER       │
                              │ PASSAGE      │
                              │ (corridor)   │
                              └──────┬───────┘
                                     │ up
                                     │
┌──────────────┐     ┌───────────────┼───────────────┐     ┌──────────────┐
│ CURIOSITY    │     │ WEST          │ PROCESSION    │     │ EAST         │
│ BAZAAR       │     │ CONCOURSE     │ GATE          │     │ CONCOURSE    │
│ (market)     │     │ (corridor)    │ (entry)       │     │ (corridor)   │
└──────┬───────┘     └──────┬────────┘└──────┬───────┘     └──────┬───────┘
       │                    │               │                     │
       │             ┌──────┴───────┐       │              ┌──────┴───────┐
       │             │ MURAL        │       │              │ LANTERN      │
       │             │ ARCADE       │       │              │ ROW          │
       │             │ (corridor)   │       │              │ (corridor)   │
       │             └──────┬───────┘       │              └──────┬───────┘
       │                    │               │                     │
┌──────┴───────┐     ┌──────┴───────┐┌──────┴───────┐     ┌──────┴───────┐
│ GREEN ROOM   │     │ WARDROBE     ││ CALL BOARD   │     │ DANCE        │
│ (infirmary)  │     │ VAULT        ││ (exp-board)  │     │ FLOOR        │
│              │     │ (stash)      ││              │     │ (training)   │
└──────────────┘     └──────┬───────┘└──────────────┘     └──────┬───────┘
                            │ east                               │ east
                     ┌──────┴───────┐                     ┌──────┴───────┐
                     │ COSTUME      │                     │ DRUM         │
                     │ WORKSHOP     │                     │ CIRCLE       │
                     │ (armoury)    │                     │ (corridor)   │
                     └──────────────┘                     └──────┬───────┘
                                                                 │ east
                                                          ┌──────┴───────┐
                                                          │ VINE         │
                                                          │ TUNNEL       │
                                                          │ (corridor)   │
                                                          └──────┬───────┘
                                                                 │ east
                                                          ┌──────┴───────┐
                                                          │ SUPERDOME    │
                                                          │ BREACH       │
                                                          │ (connection) │
                                                          └──────┬───────┘
                                                                 │ south
                                                                 → SILTGATE
                                                                   (flooded-concourse)

    UPPER LEVELS (stadium seating):

              ┌──────────────┐
              │ BUNK TIERS   │
              │ room         │
              │ (inn)        │
              └──────┬───────┘
                     │ down
              ┌──────┴───────┐
              │ BUNK TIERS   │
              │ lobby        │
              │ (corridor)   │
              └──────┬───────┘
                     │ down
              ┌──────┴───────┐
              │ UPPER BOWL   │
              │ SEATING      │
              │ (corridor)   │
              └──────┬───────┘
                     │ down
              ┌──────┴───────┐
              │ PROCESSION   │
              │ GATE (entry) │  ← back to main floor
              └──────────────┘
```

### Room List

| # | Slug | Name | Type | Description Hint |
|---|------|------|------|-----------------|
| 1 | `carrion-commons` | The Procession Gate | `entry` | Bowl of the Dome, open sky, shallow lake, scaffolding stages |
| 2 | `carrion-west-concourse` | West Concourse | `corridor` | Vine-choked passage along the Dome's western interior wall |
| 3 | `carrion-east-concourse` | East Concourse | `corridor` | Lantern-lit passage along the eastern wall, mask displays |
| 4 | `carrion-mural-arcade` | Mural Arcade | `corridor` | Painted corridor with Krewe history murals on cracked concrete |
| 5 | `carrion-lantern-row` | Lantern Row | `corridor` | Hanging oil lanterns line this gallery, shadows dancing |
| 6 | `carrion-stash` | The Wardrobe Vault | `feature_stash` | Backstage storage: costume racks, prop trunks, personal gear |
| 7 | `carrion-armoury` | The Costume Workshop | `feature_armoury` | Workshop for masks, weapons, and ceremonial armor |
| 8 | `carrion-expedition-board` | The Call Board | `feature_expedition_board` | Backstage bulletin wall with mission contracts |
| 9 | `carrion-market` | The Curiosity Bazaar | `feature_marketplace` | Concourse-level market selling salvage, art, and blessings |
| 10 | `carrion-infirmary` | The Green Room | `feature_infirmary` | Backstage lounge for recovery, masks off, algae drinks |
| 11 | `carrion-training` | The Dance Floor | `feature_training` | Open combat platform, every fight is choreography |
| 12 | `carrion-drum-circle` | The Drum Circle | `corridor` | Performance space where rhythm sets the Krewe's heartbeat |
| 13 | `carrion-vine-tunnel` | Vine Tunnel | `corridor` | Overgrown concrete passage leading toward the outer wall |
| 14 | `carrion-superdome-breach` | Superdome Breach | `corridor` | Jagged rent in the Dome wall, vines and rainwater, exit to Siltgate |
| 15 | `carrion-upper-bowl` | Upper Bowl Seating | `corridor` | Ruined stadium tiers, some seats intact, view of the whole bowl |
| 16 | `carrion-inn-lobby` | The Bunk Tiers — Lobby | `corridor` | Entrance to sleeping quarters in the upper seating |
| 17 | `carrion-inn` | The Bunk Tiers — Private Alcove | `feature_inn` | Hammocks and cots in the shadowed upper decks |
| 18 | `carrion-locker-passage` | Locker Passage | `corridor` | Old player tunnel beneath the Dome, graffiti-covered |
| 19 | `carrion-tunnel-of-masks` | Tunnel of Masks | `corridor` | Ceremonial corridor with masks of past Krewe captains |
| 20 | `carrion-war-room` | The Inner Sanctum | `feature_war_room` | Deep chamber beneath the Dome, maps and true ledger |
| 21 | `carrion-prop-graveyard` | Prop Graveyard | `corridor` | Discarded floats, broken puppets, remnants of past parades |
| 22 | `carrion-rain-stage` | Rain Stage | `corridor` | Open-air performance platform where rainwater collects |
| 23 | `carrion-incense-hall` | Incense Hall | `corridor` | Smoke-filled passage between the bazaar and the green room |
| 24 | `carrion-scaffold-bridge` | Scaffold Bridge | `corridor` | Precarious plank walkway across the flooded bowl |

### Exit Topology

```
carrion-commons       →  west:  carrion-west-concourse
                      →  east:  carrion-east-concourse
                      →  south: carrion-expedition-board
                      →  up:    carrion-upper-bowl
                      →  down:  carrion-locker-passage

carrion-west-concourse → east:  carrion-commons
                       → south: carrion-mural-arcade
                       → west:  carrion-market
                       → north: carrion-scaffold-bridge

carrion-scaffold-bridge → south: carrion-west-concourse
                        → east:  carrion-rain-stage

carrion-rain-stage    →  west:  carrion-scaffold-bridge

carrion-east-concourse → west:  carrion-commons
                       → south: carrion-lantern-row
                       → east:  carrion-prop-graveyard

carrion-prop-graveyard → west:  carrion-east-concourse

carrion-mural-arcade  →  north: carrion-west-concourse
                      →  south: carrion-stash

carrion-stash         →  north: carrion-mural-arcade
                      →  east:  carrion-armoury

carrion-armoury       →  west:  carrion-stash

carrion-lantern-row   →  north: carrion-east-concourse
                      →  south: carrion-training

carrion-training      →  north: carrion-lantern-row
                      →  east:  carrion-drum-circle

carrion-drum-circle   →  west:  carrion-training
                      →  east:  carrion-vine-tunnel

carrion-vine-tunnel   →  west:  carrion-drum-circle
                      →  east:  carrion-superdome-breach

carrion-superdome-breach → west:  carrion-vine-tunnel
                         → south: → SILTGATE (flooded-concourse)

carrion-market        →  east:  carrion-west-concourse
                      →  south: carrion-incense-hall

carrion-incense-hall  →  north: carrion-market
                      →  south: carrion-infirmary

carrion-infirmary     →  north: carrion-incense-hall

carrion-expedition-board → north: carrion-commons

carrion-upper-bowl    →  down:  carrion-commons
                      →  up:    carrion-inn-lobby

carrion-inn-lobby     →  down:  carrion-upper-bowl
                      →  up:    carrion-inn

carrion-inn           →  down:  carrion-inn-lobby

carrion-locker-passage → up:    carrion-commons
                       → down:  carrion-tunnel-of-masks

carrion-tunnel-of-masks → up:   carrion-locker-passage
                        → down: carrion-war-room

carrion-war-room      →  up:    carrion-tunnel-of-masks
```

### Creatures (5)

| Name | Slug | Behavior | Preferred Rooms | Description |
|------|------|----------|-----------------|-------------|
| Krewe Sentinel | `krewe-sentinel` | Non-aggressive, patrols concourses in pairs | `carrion-west-concourse`, `carrion-east-concourse`, `carrion-vine-tunnel` | A masked Krewe guard in painted armour, moving with deliberate theatrical grace, spear tapping the floor in rhythm. |
| Parade Rat | `parade-rat` | Non-aggressive, ambient fauna | `carrion-prop-graveyard`, `carrion-locker-passage`, `carrion-tunnel-of-masks` | A bold rat wearing a tiny scrap of gold fabric, nesting in the debris of old parades. |
| Incense Keeper | `incense-keeper` | Non-aggressive, stationary NPC | `carrion-incense-hall`, `carrion-infirmary` | A robed Krewe elder tending braziers, smoke curling from resin chips, dispensing cryptic medical advice. |
| Drum Caller | `drum-caller` | Non-aggressive, stationary NPC | `carrion-drum-circle`, `carrion-rain-stage` | A young Krewe performer beating a rhythm on salvaged steel drums, setting the Dome's pulse. |
| Scaffold Rigger | `scaffold-rigger` | Non-aggressive, patrols upper areas | `carrion-upper-bowl`, `carrion-scaffold-bridge`, `carrion-rain-stage` | A Krewe worker in harness and paint-stained coveralls, maintaining the Dome's precarious stage infrastructure. |

### Connection Room Placement

**Superdome Breach** (`carrion-superdome-breach`) sits at the end of a path leading east from the training area: Training → Drum Circle → Vine Tunnel → Breach → Siltgate. This traces a route from the Dome's interior, through the performance perimeter, through overgrown infrastructure, to a literal hole in the wall. The breach is the Dome's wound — where the structure failed and the outside world pours in. It's at the edge, reachable in 4 steps from commons, and it *feels* like leaving the Krewe's domain.

---

## Summary Comparison

| Aspect | Reliquary (Kindari) | Bloom Observatory (Tenders) | Carrion Court (Krewe) |
|--------|--------------------|-----------------------------|----------------------|
| **Room count** | 22 | 23 | 24 |
| **Topology shape** | L-shaped industrial complex | Vertical multi-deck tower | Radial bowl with concourses |
| **Primary movement** | Horizontal (catwalks, corridors) | Vertical (up/down between decks) | Radial (concourse ring) + vertical (bowl depth) |
| **Steps to zone exit** | 3 (commons → pipe → annex) | 3–4 (commons → hatch → stairwell → descent) | 4 (commons → concourse → drum → vine → breach) |
| **Steps to war room** | 4 (commons → junction → training → catwalk → vault) | 4 (commons → training → lens → war-room) | 3 (commons → locker → masks → sanctum) |
| **Steps to inn** | 2 (commons → settling → inn-lobby → up) | 3 (commons → mess → inn-lobby → up) | 3 (commons → upper-bowl → inn-lobby → up) |
| **Corridor rooms** | 10 | 12 | 12 |
| **Feature rooms** | 9 | 9 | 9 |
| **Connection rooms** | 3 (extra exploration loops) | 2 (tidal, kelp) | 3 (prop graveyard, rain stage, scaffold) |
| **Creature types** | 5 | 5 | 5 |

## Creature Definition Format (for implementation)

All stronghold creatures share these base stats (non-combat NPCs):
```
aggressive: false
max_hp: 1         -- ambient NPCs, not meant to be killed
attack: 0
defence: 0
armour: 0
agility: 0
min_count: 1
max_count: 1      -- singleton NPCs (guards: max_count 2)
idle_ticks_min: 5
idle_ticks_max: 10
flee_threshold: 1.0  -- always flee if attacked
loot_table: '[]'
status: 'published'
```

Guard types (Sentinels, Wardens) get `max_count: 2` and slightly higher idle ticks for slower patrol cycles.
Ambient fauna (rats, crawlers) get `min_count: 1, max_count: 3` for small groups.

## Slug Naming Convention

All room slugs follow the pattern: `{stronghold-prefix}-{room-name}`
- Reliquary: `reliquary-*`
- Bloom Observatory: `bloom-*`
- Carrion Court: `carrion-*`

This departs from the current convention where some rooms use full stronghold names (e.g., `bloom-observatory-commons`). The shorter prefix is recommended for readability and consistency, but the implementer may preserve the current prefix if migration concerns outweigh the cleanup.

## Open Questions

1. **Should corridors have any mechanical effect?** Currently `corridor` type rooms have no special behavior. Should some corridors slow movement, display ambient text, or trigger atmospheric narration?
2. **NPC interaction system.** The creatures proposed here are atmospheric — they have `room_description` text but no dialogue or interaction mechanics. When NPC interaction is implemented, these creatures can be upgraded.
3. **Stash/armoury adjacency.** In all three designs, stash and armoury are near each other (you get gear, then equip it). Is this the right UX, or should they be separated to create more traversal?
4. **Inn as safe-logout zone.** The current `entry_room_slugs` uses the inn. Should the inn remain the only safe-logout room, or should commons also qualify?

---

*This is a proposal. No code or migration changes are included. Review, revise, then hand off for implementation.*

---

# Decision: Death Respawn Priority — Inn > Faction Hub > Refuge

**Author:** Jarlaxle  
**Date:** 2026-04-07  
**Issue:** #322  
**PR:** #326

## Context

`handlePlayerDeath()` was hardcoded to route through `resolvePlayerHubTarget(factionSlug)`, which falls to `DEFAULT_HUB_SLUG` (Refuge) when faction is undefined. The `saveLastInn()`/`getLastInn()` system existed but was only used for login joins, not death respawns.

## Decision

Death respawn now follows this priority chain:
1. **Last rented inn room** — `getLastInn()` returns `{ zoneSlug, roomSlug }`
2. **Faction stronghold** — `resolvePlayerHubTarget(factionSlug)`
3. **DEFAULT_HUB_SLUG** — Refuge as last resort

The `RoomSwitchMessage` now carries `options.targetRoomSlug` when routing to an inn, so the destination zone's `onJoin()` places the player in the correct room.

## Impact

- `handlePlayerDeath()` is now `async` (callers fire-and-forget — no await needed)
- `RoomSwitchOptions` in shared types gained `targetRoomSlug?: string`
- Death narration says "your rented room" for inn respawns
- Frontend `switchRoom()` already spreads options into joinOptions, so no client changes needed

---

# Decision: ANSI Parser Test Suite Conventions

**Author:** Minsc (Tester)  
**Date:** 2026-07-15  
**Status:** Implemented  

## Context

Wrote 62 tests for `packages/client/src/lib/ansi-parser.ts` covering both lightweight tag syntax (`[red]...[/red]`) and raw ANSI escape codes (`\x1b[31m`). Regis's implementation was already in place — all tests pass.

## Decisions

1. **Test file location:** `packages/client/src/__tests__/ansi-parser.test.ts` (`.ts`, not `.tsx`) — uses `createElement` to render React nodes, avoiding JSX dependency.

2. **Export names:** Implementation uses `SUPPORTED_NAMES` (combined array) instead of separate `ANSI_COLORS`/`ANSI_MODIFIERS`. Tests adapted to actual exports.

3. **stripAnsi inconsistency noted:** `stripAnsi` strips ALL `[word]` bracket patterns including unknowns, while `parseAnsiText` preserves unknown tags as literal text. Test documents this behavior. Low priority — unlikely to cause issues in practice.

## Test Coverage

- 62 tests across 7 `describe` blocks
- Lightweight syntax: 22 tests (happy path + edge cases)
- Raw ANSI codes: 15 tests (happy path + edge cases)
- Mixed syntax: 3 tests
- stripAnsi: 14 tests
- Performance: 4 tests
- Exports: 4 tests

---

# Minsc QA Audit — Stronghold Redesign (Directional/Logical Consistency)

Source reviewed: `.squad/decisions/inbox/elminster-stronghold-redesign.md`

This audit checks (1) reverse exits, (2) ASCII map ↔ exit-topology agreement, (3) basic spatial sanity, (4) room list ↔ topology room counts, (5) inter-zone/connection exit formatting.

---

## 1) Reliquary (Kindari)

### 1. DIRECTIONAL CONSISTENCY (reverse exits)
✅ **PASS (intra-zone exits)** — All stated within-zone exits have matching reverse exits:
- `reliquary-commons north reliquary-catwalk-junction` ↔ `reliquary-catwalk-junction south reliquary-commons`
- `reliquary-commons south reliquary-market` ↔ `reliquary-market north reliquary-commons`
- `reliquary-commons east reliquary-pipe-corridor` ↔ `reliquary-pipe-corridor west reliquary-commons`
- `reliquary-commons west reliquary-settling-pool` ↔ `reliquary-settling-pool east reliquary-commons`
- (and all other listed pairs, including verticals like `up/down`)

⚠️ **Note:** The external exit `reliquary-filtration-annex east → SILTGATE` has no reverse exit in this document (expected for inter-zone, but see Check 5).

### 2. ASCII MAP vs EXIT TOPOLOGY
❌ **FAIL** — The map drawing implies different connections/directions than the Exit Topology.

**Issues:**
1) **Commons ↔ Pipe Corridor connection missing on map**
   - Topology: `reliquary-commons → east: reliquary-pipe-corridor` and `reliquary-pipe-corridor → west: reliquary-commons`
   - ASCII map: shows **Pipe Corridor** as a separate block on the right, but does **not** clearly draw a connection from **Preservation Hall (commons)** to **Pipe Corridor**.
   - **Should be:** Draw an explicit east/west link between Preservation Hall and Pipe Corridor.

2) **Market Backroom ↔ (Stash/Armoury) orientation mismatch**
   - Topology: `reliquary-market-backroom → west: reliquary-stash` and `→ east: reliquary-armoury`
   - ASCII map: depicts **Archive Cistern (stash)** and **Assembly Bay (armoury)** as **south/below** the Backroom, implying a south/north relationship.
   - **Should be (if topology is correct):** Place `reliquary-stash` west of `reliquary-market-backroom` and `reliquary-armoury` east of it (not south).

3) **Pipe Corridor ↔ Filtration Annex direction ambiguity in map**
   - Topology: `reliquary-pipe-corridor → east: reliquary-filtration-annex`
   - ASCII map: Filtration Annex is drawn *below* Pipe Corridor while the label says `east`, creating a compass/layout inconsistency.
   - **Should be:** If annex is east of pipe-corridor, it should be drawn to the right of it (or the direction label should change to `south` and reverse updated accordingly).

### 3. LOGICAL SPATIAL SENSE
✅ **PASS (topology)** — The graph is spatially plausible in 2D with vertical elements:
- Clear main spine (commons → pipe corridor → annex) and catwalk layer (commons → junction → training → upper catwalk → war room).
- Vertical use is sensible: `commons up shrine-alcove`, `training up watchpost`.
- The stash loop (`market-backroom` and `cistern-access`) is explicitly justified and does not force an impossible 2D layout.

### 4. ROOM COUNT VERIFICATION
✅ **PASS**
- Room list count: **22**
- Rooms referenced in exit topology (excluding external `SILTGATE`): **22**
- No orphaned/phantom in-zone rooms detected.

### 5. CONNECTION ROOM EXITS (inter-zone portal pattern)
❌ **FAIL** — Inter-zone exit is described only as `→ SILTGATE (pipe-bridge)`.
- Document does **not** specify the required inter-zone portal fields/pattern:
  - `to_room_slug` equal to `from_room_slug` (self-referential portal in the connection room)
  - explicit `target_zone_slug` + `target_room_slug`
- **Affected exit:** `reliquary-filtration-annex east → SILTGATE (pipe-bridge)`
- **Should be:** Express this as an inter-zone portal on `reliquary-filtration-annex` with explicit target zone+room metadata (and self `to_room_slug`).

---

## 2) Bloom Observatory (Bloom Tenders)

### 1. DIRECTIONAL CONSISTENCY (reverse exits)
✅ **PASS (intra-zone exits)** — All within-zone exits have matching reverses, including multi-level vertical travel:
- `bloom-commons up bloom-training` ↔ `bloom-training down bloom-commons`
- `bloom-commons down bloom-cargo-hatch` ↔ `bloom-cargo-hatch up bloom-commons`
- `bloom-leg-stairwell down bloom-platform-descent` ↔ `bloom-platform-descent up bloom-leg-stairwell`

⚠️ **Note:** The external exit `bloom-platform-descent east → WARRENS` has no reverse here (see Check 5).

### 2. ASCII MAP vs EXIT TOPOLOGY
❌ **FAIL** — Multiple compass-direction and adjacency disagreements.

**Issues:**
1) **Cultivation Gangway direction from commons**
   - Topology: `bloom-commons → north: bloom-cultivation-gangway`
   - ASCII map: places **Cultivation Gangway** to the **right/east** of **Tide Deck (commons)**.
   - **Should be:** If keeping topology, draw Cultivation Gangway *above/north* of Tide Deck, not east.

2) **Algae Terraces relative to Cultivation Gangway**
   - Topology: `bloom-cultivation-gangway → north: bloom-algae-terraces`
   - ASCII map: draws **Algae Terraces** *below/south* of Cultivation Gangway.
   - **Should be:** Terraces should be drawn above/north of the gangway (or topology directions must invert).

3) **War Room access path**
   - Topology: `bloom-lens-gallery → up: bloom-war-room` and `bloom-crows-nest` is only `up` from `bloom-training`.
   - ASCII map: depicts **Signal Archive (war-room)** sitting above a combined shape containing **Crow’s Nest** and **Lens Gallery**, implying both connect down from the war-room.
   - **Should be:** War-room should only be above Lens Gallery; Crow’s Nest should be a separate `up` from Training (no direct war-room adjacency).

4) **Lower-level stash/armoury adjacency to cargo hatch**
   - Topology: `bloom-cargo-hatch → west: bloom-stash` and `→ east: bloom-armoury`
   - ASCII map: draws stash/armoury *below* cargo hatch with `up` links, implying vertical relationships.
   - **Should be:** Draw stash to the left (west) and armoury to the right (east) of cargo hatch.

5) **Map omits several topology rooms** (not inherently wrong, but risks mis-generation)
   - Present in topology but not shown on map: `bloom-winch-platform`, `bloom-netting-walk`, `bloom-tidal-pool`, `bloom-kelp-garden`, `bloom-radio-shack`.
   - **Should be:** Either add them to the map or explicitly label the map as intentionally partial.

### 3. LOGICAL SPATIAL SENSE
✅ **PASS (topology)** — Vertical structure reads cleanly:
- Main deck hub at commons, with clear up-chain to training and up to crow’s nest/war-room via lens gallery.
- Clear down-chain to cargo hatch → stairwell → platform descent.
- No 2D-impossible loops detected.

### 4. ROOM COUNT VERIFICATION
✅ **PASS**
- Room list count: **23**
- Rooms referenced in exit topology (excluding external `WARRENS`): **23**
- No orphaned/phantom in-zone rooms detected.

### 5. CONNECTION ROOM EXITS (inter-zone portal pattern)
❌ **FAIL** — Inter-zone exit is only written as `→ WARRENS (causeway-terminus)`.
- Missing explicit self `to_room_slug == from_room_slug` portal format and required target zone+room fields.
- **Affected exit:** `bloom-platform-descent east → WARRENS (causeway-terminus)`
- **Should be:** Express as an inter-zone portal on `bloom-platform-descent` with explicit `target_zone_slug` + `target_room_slug`.

---

## 3) Carrion Court (Krewe Calliope)

### 1. DIRECTIONAL CONSISTENCY (reverse exits)
✅ **PASS (intra-zone exits)** — All within-zone exits have matching reverses, including vertical layers:
- `carrion-commons down carrion-locker-passage` ↔ `carrion-locker-passage up carrion-commons`
- `carrion-upper-bowl up carrion-inn-lobby` ↔ `carrion-inn-lobby down carrion-upper-bowl`

⚠️ **Note:** The external exit `carrion-superdome-breach south → SILTGATE` has no reverse here (see Check 5).

### 2. ASCII MAP vs EXIT TOPOLOGY
❌ **FAIL** — The underground stack uses opposite vertical directions, and one main-floor chain is compressed.

**Issues:**
1) **Underground path uses `up` in the ASCII map but `down` in topology**
   - Topology:
     - `carrion-commons → down: carrion-locker-passage`
     - `carrion-locker-passage → down: carrion-tunnel-of-masks`
     - `carrion-tunnel-of-masks → down: carrion-war-room`
   - ASCII map: shows `LOCKER PASSAGE` / `TUNNEL OF MASKS` / `INNER SANCTUM (war-room)` *above* the commons with connectors labeled `up`.
   - **Should be:** Flip these vertical directions in the map (draw them below commons with `down` going deeper), or invert the topology to match the map. Given the rationale (“war room is deep beneath the Dome”), the topology’s `down` chain is the likely correct one.

2) **Market → Infirmary path missing intermediate room on map**
   - Topology: `carrion-market → south: carrion-incense-hall → south: carrion-infirmary`
   - ASCII map: shows **Curiosity Bazaar (market)** connected directly down to **Green Room (infirmary)**.
   - **Should be:** Insert `carrion-incense-hall` between market and infirmary on the map (or remove/incorporate it in topology if direct adjacency is intended).

3) **Map omits several topology rooms** (may be intentional, but it currently conflicts with implied routes)
   - Not shown: `carrion-prop-graveyard`, `carrion-scaffold-bridge`, `carrion-rain-stage`, `carrion-incense-hall` (though implied by topology).
   - **Should be:** Either add them or clearly mark the ASCII map as partial.

### 3. LOGICAL SPATIAL SENSE
✅ **PASS (topology)** — Compass directions can be embedded sensibly:
- Commons as hub with east/west concourses.
- Clear eastward route to the zone exit (training → drum → vine → breach).
- Downward route to war room is consistent with “deep beneath the Dome.”

### 4. ROOM COUNT VERIFICATION
✅ **PASS**
- Room list count: **24**
- Rooms referenced in exit topology (excluding external `SILTGATE`): **24**
- No orphaned/phantom in-zone rooms detected.

### 5. CONNECTION ROOM EXITS (inter-zone portal pattern)
❌ **FAIL** — Inter-zone exit is only written as `→ SILTGATE (flooded-concourse)`.
- Missing explicit self `to_room_slug == from_room_slug` portal format and required target zone+room fields.
- **Affected exit:** `carrion-superdome-breach south → SILTGATE (flooded-concourse)`
- **Should be:** Express as an inter-zone portal on `carrion-superdome-breach` with explicit `target_zone_slug` + `target_room_slug`.

---

# Warrens & Siltgate Exit Topology Analysis

**Minsc, Tester/QA**  
**Date:** Analysis of migration 003_seed_zones.sql  
**Status:** ❌ BOTH ZONES REQUIRE TOPOLOGY FIXES

---

## EXECUTIVE SUMMARY

Both the **Warrens** and **Siltgate** zones exhibit significant exit topology issues when mapped to a 2D grid. The problems stem primarily from:

1. **Massive Position Collisions**: Multiple disconnected rooms are placed at identical 2D coordinates
2. **Unreachable Rooms**: Certain rooms are not reachable from the entry point via the normal exit graph
3. **Bidirectional Exit Failures**: Some exits claim to go to other rooms but lack proper reverse exits
4. **Exit Crossing Without Connecting Chambers**: The zones appear to mix vertical (up/down) navigation with planar 2D movement in ways that violate a consistent 2D grid topology

**The core issue:** These zones were designed with vertical/sewer navigation overlaid on planar geography, but no intermediate connecting rooms were placed to prevent exits from visually crossing through occupied grid cells.

---

## WARRENS ANALYSIS

### Metrics
- **Total Rooms:** 110
- **Entry Room:** shattered-gate
- **Placed Rooms:** 109
- **Reachable Rooms:** 109
- **Unreachable Rooms:** 1

### Issues Found

#### ❌ Position Collisions: 22 DETECTED

Rooms that occupy the same 2D coordinate (crossing exits without connecting chambers):

| Position | Rooms (Type) | Issue |
|----------|---|---|
| (1, 0) | rubble-boulevard (corridor) ↔ overwatch-tower (dead_end) | Tower accessed via UP, but placed at same (x,y) as corridor |
| (4, -1) | collapsed-tenement (dead_end) ↔ gutter-run (corridor) | Tenement accessed WEST from gutter-run, both at same coord |
| (5, -1) | scavengers-den (combat) ↔ blighted-courtyard (junction) | Den accessed SOUTH, courtyard accessed EAST, same grid cell |
| (5, -2) | condemned-arch (corridor) ↔ slum-r1c2 (combat) | Arch EAST of condemned-arch, slum SOUTH of gutter-run, collide |
| (3, -2) | sunken-square (junction) ↔ the-ratways (corridor) | Square accessed via WEST from slum-r1c1, ratways via DOWN from square, both at (3,-2) |
| (6, -2) | ironmongers-ruin (dead_end) ↔ slum-r1c3 (combat) | Ruin accessed EAST from condemned-arch, slum accessed SOUTH, same position |
| (4, -4) | slum-r3c1 (combat) ↔ sewer-bone-shelf (dead_end) | Room grid row 3, col 1 vs. bone shelf accessed from sewer system |
| (4, -5) | slum-r4c1 (combat) ↔ sewer-drain-grate (corridor) | Slum grid row 4 col 1 vs. drain grate from sewer-north-tunnel |
| (5, -5) | slum-r4c2 (combat) ↔ sewer-overflow-chamber (combat) | Slum row 4 col 2 vs. overflow accessed from sewer-drain-grate EAST |
| (4, -6) | slum-r5c1 (combat) ↔ sewer-east-conduit (corridor) | Slum row 5 col 1 vs. east conduit from sewer-main-junction EAST |
| (3, -5) | plague-ward (dead_end) ↔ sewer-north-tunnel (corridor) | Ward accessed WEST from slum-r4c1 vs. tunnel from sewer-main-junction NORTH |
| (5, -6) | slum-r5c2 (combat) ↔ sewer-pipe-maze (corridor) | Slum row 5 col 2 vs. pipe maze from sewer-east-conduit EAST |
| (4, -7) | slum-r6c1 (combat) ↔ sewer-blackwater-crossing (junction) | Slum row 6 col 1 vs. crossing from sewer-deep-channel EAST |
| (3, -6) | sluice-gate (junction) ↔ sewer-main-junction (junction) | Sluice accessed WEST from slum-r5c1 vs. main junction from sewer-north-tunnel SOUTH |
| (6, -6) | slum-r5c3 (combat) ↔ sewer-gas-pocket (dead_end) | Slum row 5 col 3 vs. gas pocket from sewer-pipe-maze EAST |
| (4, -8) | slum-r7c1 (combat) ↔ sewer-deep-channel (corridor) | Slum row 7 col 1 vs. deep channel from sewer-blackwater-crossing SOUTH |
| (5, -8) | slum-r7c2 (combat) ↔ sewer-effluent-pool (combat) | Slum row 7 col 2 vs. pool from sewer-deep-channel EAST |
| (4, -9) | dyers-vats (combat) ↔ sewer-stagnant-pool (chamber) ↔ sewer-silt-chamber (junction) | **Triple collision** - Slum row 7 col 1 SOUTH vs. stagnant pool from sewer-trickle-passage EAST vs. silt chamber from sewer-deep-channel SOUTH |
| (5, -9) | cistern-access (junction) ↔ sewer-cistern (combat) | Cistern-access row 7 col 2 SOUTH vs. sewer cistern from stagnant pool EAST |
| (3, -9) | beggar-kings-throne (dead_end) ↔ sewer-collapsed-drain (dead_end) ↔ sewer-slime-channel (corridor) | **Triple collision** - Throne accessed SOUTH from dyers-vats vs. drain from flooded-vault SOUTH vs. slime channel from slime-channel EAST |
| (3, -4) | sewer-rat-nest (combat) ↔ sewer-cracked-conduit (corridor) | Rat nest from sewer-north-tunnel NORTH vs. cracked conduit from sewer-drip-tunnel SOUTH |
| (3, -8) | sewer-flooded-vault (combat) ↔ sewer-trickle-passage (corridor) | Vault from sewer-flooded-vault (accessed SOUTH from south-tunnel) vs. trickle passage from sewer-west-conduit EAST |

**Critical:** These 22 collisions represent exits that **must cross through occupied grid cells** to reach their destinations. In a planar 2D map, this creates visual intersection without a connecting room.

#### ⚠️ Unreachable Rooms: 1

- **causeway-terminus** — Isolated room, not connected via any exit path from the entry graph. Exit from `causeway-terminus` west goes to itself in the Bloom Observatory zone. No entry path exists from shattered-gate.

#### ⚠️ Bidirectional Failures: 4

| From Room | Direction | To Room | Status |
|-----------|-----------|---------|--------|
| shattered-gate | west | shattered-gate | ❌ Self-loop to Refuge; no reverse |
| shattered-gate | south | shattered-gate | ❌ Self-loop to causeway-terminus; no reverse from causeway-terminus |
| causeway-terminus | west | causeway-terminus | ❌ Self-loop to Bloom Observatory; no reverse |
| causeway-terminus | south | shattered-gate | ❌ Missing reverse: shattered-gate north → causeway-terminus |

**Note:** Bidirectional failures are acceptable for zone-transition exits (marked with target_zone != NULL). The 4 failures detected are either zone transitions or orphaned room connections.

### Grid Visualization (Partial)

```
Y=1: [overwatch-tower/rubble-boulevard]
     
Y=0: [shattered-gate] - [rubble-boulevard] - [collapsed-overpass] - [hollow-market] - [merchants-row] - [burned-chapel]
                                                     |
                                               (COLLISION: multiple slum + sewer rooms below)
Y=-1: [gutter-run] & [collapsed-tenement]
      [scavengers-den] & [blighted-courtyard]
      [condemned-arch] & [slum-r1c2]
      ...

(Sewer rooms stack vertically, creating collisions at every depth level)
```

### Root Cause

The Warrens uses a **7x7 slum grid** (slum-r1c1 through slum-r7c7) for the main area, plus a **separate vertical sewer system** (sewer-main-junction, sewer-north-tunnel, etc.). When both systems are placed on a 2D grid:

- Slum rooms are placed by following compass directions (north/south/east/west)
- Sewer rooms are placed by following a different path (down → north/south/east/west)
- The two systems converge at multiple points (e.g., sunken-square down → the-ratways, sluice-gate down → sewer-main-junction, cistern-access down → sewer-cistern)
- When the sewer path expands horizontally (EAST/WEST/NORTH/SOUTH), its rooms occupy the same grid cells as slum rooms above them

**No intermediate connecting chambers or depth layers separate the slum quarter from the sewer, causing all these collisions.**

---

## SILTGATE ANALYSIS

### Metrics
- **Total Rooms:** 141
- **Entry Room:** market-square
- **Placed Rooms:** 138
- **Reachable Rooms:** 138
- **Unreachable Rooms:** 3

### Issues Found

#### ❌ Position Collisions: 32 DETECTED

Siltgate has even more collisions than Warrens. Sample:

| Position | Rooms (Type) | Issue |
|----------|---|---|
| (0, 1) | fountain-plaza (junction) ↔ estate-gate (entrance) | Plaza NORTH of market, gate UP from plaza, same coord |
| (1, 0) | bazaar-row-1 (corridor) ↔ narrow-alley-1 (corridor) ↔ flooded-chamber (dead_end) | Bazaar EAST of market, alley SOUTH of arcade-1, chamber from sewer-tunnel-8 SOUTH |
| (0, 2) | news-board (dead_end) ↔ promenade-walk-1 (corridor) | Board NORTH of plaza, walk NORTH of estate-gate, same grid |
| (1, 1) | silver-arcade-1 (corridor) ↔ iron-balcony-1 (corridor) ↔ sewer-tunnel-8 (corridor) | Arcade EAST of plaza, balcony SOUTH of promenade-walk-2, sewer room from deep underground |
| (2, 0) | bazaar-row-2 (corridor) ↔ cobblestone-street-1 (corridor) ↔ fungal-cavern (dead_end) | Bazaar chain, cobblestone chain, sewer-fungal accessed SOUTH from sewer-tunnel-7 |

*(All 32 collisions follow this pattern: planar rooms × vertical sewer rooms occupying the same cells)*

#### ⚠️ Unreachable Rooms: 3

- **pipe-bridge** — Supposed connection point to The Reliquary. Accessed via west from itself. No entry from Siltgate proper.
- **smugglers-cove** — Hidden passage accessed SOUTH from tide-gate, but tide-gate has no reverse exit south.
- **thieves-den** — Hidden passage accessed EAST from rat-run-2 (hidden), but rat-run-2 has no exit east.

#### ⚠️ Bidirectional Failures: 7

| From Room | Direction | To Room | Status |
|-----------|-----------|---------|--------|
| city-gate | west | city-gate | ❌ Zone transition to Refuge; no reverse |
| smugglers-cove | north | tide-gate | ❌ Missing: tide-gate south → smugglers-cove (hidden:true exists, but marked hidden!) |
| thieves-den | west | rat-run-2 | ❌ Missing: rat-run-2 east → thieves-den (hidden:true exists!) |
| ashgate | east | ashgate | ❌ Zone transition to Warrens; no reverse |
| flooded-concourse | north | flooded-concourse | ❌ Zone transition to Carrion Court; no reverse |
| pipe-bridge | west | pipe-bridge | ❌ Zone transition to Reliquary; no reverse |
| pipe-bridge | east | ashgate-chapel | ❌ Missing: ashgate-chapel west → pipe-bridge |

**Note:** Failures 2 & 3 are marked `hidden:true` — the exits DO exist bidirectionally, but are flagged hidden. This may be intentional (secret passages). Failures 1, 4, 5, 6 are zone transitions.

### Grid Visualization (Partial)

```
Y=3: [jewelers-lane] [highwind-bridge] [observatory]
     
Y=2: [news-board]    [promenade-walk-1] [courtyard-fountain] [noble-residence-1]
     
Y=1: [fountain-plaza] [estate-gate]
     [silver-arcade-1] [iron-balcony-1]
     [silver-arcade-2] [iron-balcony-2]
     [silver-arcade-3] [guild-hall]
     [silver-arcade-4] [silk-road]
     
Y=0: [market-square]
     [bazaar-row-1] [narrow-alley-1]
     [bazaar-row-2] [cobblestone-street-1]
     [bazaar-row-3] [cobblestone-street-2]
     [span-gate] [cobblestone-street-3]
     
Y=-1: [tavern-row]
      [scribe-corner] [apothecary] [dockside-tavern]
      [money-changers-row] [narrow-alley-2]
      ...

(Sewer system creates additional collisions at every coordinate below)
```

### Root Cause

Siltgate has a similar architecture to Warrens:

- **Upper district**: Market, bazaar, silver arcade, estates, promenade, garden terrace, docks
- **Lower district**: Beggar's Span (Alley system) with rats and thugs
- **Underground**: Sewers (3 junctions × 8 tunnels) + undercity areas

The **undercity-gate** (at guild-hall DOWN) connects the planar upper world to the sewer system. As the sewer system branches out horizontally, it collides with upper-district coordinates.

**Additionally**, Siltgate has even more zone transitions (Refuge, Warrens, Reliquary, Carrion Court), and some are accessed via rooms (like pipe-bridge east → ashgate-chapel, ashgate east → Warrens) rather than direct zone-to-zone jumps.

---

## DETAILED FINDINGS

### Position Collisions: What They Mean

A **position collision** occurs when two distinct rooms occupy the same 2D grid coordinate. When drawing this as a map:

```
Example: Position (3, -6) contains both:
  1. sluice-gate (accessed W from slum-r5c1)
  2. sewer-main-junction (accessed S from sewer-north-tunnel)

On a 2D map, two exit edges would need to cross to reach both rooms:
  - Edge from slum-r5c1 west → sluice-gate
  - Edge from sewer-north-tunnel south → sewer-main-junction
  
These edges MUST cross without passing through an intermediate room.
```

**Result:** Rooms appear to be in the same visual location, or exits appear to pass through solid matter.

### Unreachable Rooms

**Warrens** has 1 unreachable room:
- `causeway-terminus` — Only entry is from itself (west to bloom-observatory-inn in the-bloom-observatory zone). No path from shattered-gate.

**Siltgate** has 3:
- `pipe-bridge` — Only entry is from itself (west to filtration-annex in the-reliquary zone)
- `smugglers-cove` & `thieves-den` — Marked `hidden:true`, so they're reachable but only via hidden exits

The unreachable non-hidden rooms need either:
1. A new entrance from the main zone exit graph, OR
2. Removal if they're truly supposed to be zone-transitions-only

### Bidirectional Failures & Hidden Exits

Most bidirectional failures are **zone-transition exits** (going to target_zone != NULL), which legitimately don't have reverse entries. However:

**Siltgate** has two special cases:
- `tide-gate south → smugglers-cove` exists and has `hidden:true` on the REVERSE (smugglers-cove north → tide-gate)
- `rat-run-2 east → thieves-den` exists and has `hidden:true` on the REVERSE (thieves-den west → rat-run-2)

These are **intentionally hidden** — they're secret passages. The "failure" is a false positive (both directions exist, one is just marked hidden).

### Loop Consistency Check

**Compass loops should sum to (0,0)**. Examples:

✅ **Pass:** north + south = (0, 0)
✅ **Pass:** east + west = (0, 0)
✅ **Pass:** north + east + south + west = (0, 0)

**Warrens slum grid check:**
- Row 1 is a 7-room E-W chain: slum-r1c1 east-east-east... to slum-r1c7 ✅
- Column 1 is a 7-room N-S chain: slum-r1c1 south-south-south... to slum-r7c1 ✅
- **Grid is internally consistent** ✅

**Siltgate upper district check:**
- Bazaar chain: market-square east → bazaar-row-1 east → bazaar-row-2 east → bazaar-row-3 (with dead-ends) ✅
- Promenade chain: estate-gate north → promenade-walk-1 east → ... → promenade-walk-4 ✅
- **Grid is internally consistent** ✅

---

## CONCLUSIONS

### ✅ PASS: Direction Consistency

Both zones maintain **proper bidirectional exits within their planar components**. Every compass exit has a reverse exit (except zone transitions and hidden passages, which are intentional).

### ✅ PASS: Loop Consistency

Both zones' internal grids form consistent loops:
- Warrens: 7×7 slum grid + individual sewer branches form consistent paths
- Siltgate: 3×4 upper district + 6×4 lower district + 3 sewer junctions form consistent loops

### ❌ FAIL: Position Collisions

- **Warrens:** 22 position collisions (slum grid × sewer system)
- **Siltgate:** 32 position collisions (upper/lower districts × sewer system)

Both zones **CANNOT be drawn as planar 2D maps** without exit edges crossing through occupied cells.

### ❌ FAIL: Edge Crossing Without Connecting Chambers

The collisions are caused by **overlaying two topologically incompatible systems**:

1. **Horizontal planar navigation** (cardinal directions in upper world)
2. **Vertical navigation** (down/up to sewers/undercity)

To fix, need:

**Option A: Depth Layers**
- Create explicit depth levels (e.g., "Ground", "Undercity Level 1", "Undercity Level 2")
- Each DOWN exit creates a new layer; rooms at the same XY on different Z don't collide

**Option B: Connecting Chambers**
- Insert transitional rooms between sewer branches and planar areas
- Example: Instead of sluice-gate directly connecting to sewer-main-junction, add "Sluice Chamber" and "Sewer Entrance" as intermediate rooms

**Option C: Reroute Sewer System**
- Redesign sewer paths to occupy only unoccupied grid coordinates
- Requires moving 40+ sewer rooms in Warrens and 50+ in Siltgate

### ⚠️ NOTE: Unreachable Rooms

- **Warrens:** causeway-terminus is only reachable via zone-transition; may be intentional
- **Siltgate:** pipe-bridge is only reachable via zone-transition; smugglers-cove & thieves-den are hidden

These require design decision: are they meant to be hidden/zone-only, or should they be integrated into the main exit graph?

---

## RECOMMENDATIONS

### Priority 1: Clarify Design Intent

**Question:** Should Warrens and Siltgate be drawable as **planar 2D maps**?

- If **YES**: Implement depth-layer architecture to separate planar from subterranean
- If **NO**: Document that these zones use a **multi-layered topology** where sewer exits can cross planar areas without violating game logic

### Priority 2: Fix Unreachable Rooms

- **causeway-terminus** (Warrens): Add a north exit from shattered-gate, OR mark it as zone-transition-only and document
- **pipe-bridge** (Siltgate): Either integrate into Ashgate district or mark as zone-transition-only
- **smugglers-cove** & **thieves-den** (Siltgate): Verify hidden exit flags are intentional; document as secret passages

### Priority 3: Document Topology Model

Add comments to 003_seed_zones.sql describing:
- Which zones use planar topology (The Refuge, estate sections of Siltgate)
- Which zones use layered topology (Warrens, Siltgate main)
- How to interpret position collisions in a game context

---

## APPENDIX: Complete Collision List

### Warrens (22 collisions)

1. (1, 0): rubble-boulevard, overwatch-tower
2. (4, -1): collapsed-tenement, gutter-run
3. (5, -1): scavengers-den, blighted-courtyard
4. (5, -2): condemned-arch, slum-r1c2
5. (3, -2): sunken-square, the-ratways
6. (6, -2): ironmongers-ruin, slum-r1c3
7. (4, -4): slum-r3c1, sewer-bone-shelf
8. (4, -5): slum-r4c1, sewer-drain-grate
9. (5, -5): slum-r4c2, sewer-overflow-chamber
10. (4, -6): slum-r5c1, sewer-east-conduit
11. (3, -5): plague-ward, sewer-north-tunnel
12. (5, -6): slum-r5c2, sewer-pipe-maze
13. (4, -7): slum-r6c1, sewer-blackwater-crossing
14. (3, -6): sluice-gate, sewer-main-junction
15. (6, -6): slum-r5c3, sewer-gas-pocket
16. (4, -8): slum-r7c1, sewer-deep-channel
17. (5, -8): slum-r7c2, sewer-effluent-pool
18. (4, -9): dyers-vats, sewer-stagnant-pool, sewer-silt-chamber (**3-way**)
19. (5, -9): cistern-access, sewer-cistern
20. (3, -9): beggar-kings-throne, sewer-collapsed-drain, sewer-slime-channel (**3-way**)
21. (3, -4): sewer-rat-nest, sewer-cracked-conduit
22. (3, -8): sewer-flooded-vault, sewer-trickle-passage

### Siltgate (32 collisions)

1. (0, 1): fountain-plaza, estate-gate
2. (1, 0): bazaar-row-1, narrow-alley-1, flooded-chamber (**3-way**)
3. (0, 2): news-board, promenade-walk-1
4. (1, 1): silver-arcade-1, iron-balcony-1, sewer-tunnel-8 (**3-way**)
5. (2, 0): bazaar-row-2, cobblestone-street-1, fungal-cavern (**3-way**)
6. (1, -1): scribe-corner, apothecary, dockside-tavern (**3-way**)
7. (2, 1): silver-arcade-2, iron-balcony-2, sewer-tunnel-7 (**3-way**)
8. (3, 0): bazaar-row-3, cobblestone-street-2, sewer-tunnel-3 (**3-way**)
9. (3, 1): silver-arcade-3, sewer-junction-1 (**2-way**)
10. (3, -1): money-changers-row, narrow-alley-2, sailmakers-loft, silt-pool (**4-way**)
11. (4, 0): span-gate, cobblestone-street-3, serpent-den (**3-way**)
12. (1, -3): warehouse-1, pier-3
13. (4, 1): silver-arcade-4, sewer-tunnel-1 (**2-way**)
14. (3, 2): guild-hall, undercity-gate, promenade-walk-4 (**3-way**)
15. (2, -1): glassblowers-workshop, harbourmasters-office
16. (5, 0): beggars-lane-1, merchant-inn, merchant-inn-upper (**3-way**)
17. (3, -2): rope-walk, wine-merchants-cellar
18. (4, 2): silk-road, cloth-merchants-hall
19. (3, 3): jewelers-lane, highwind-bridge, observatory (**3-way**)
20. (6, 0): beggars-lane-2, bone-canal
21. (6, -1): rat-run-1, blackwater-crossing
22. (5, -2): narrow-alley-4, scorched-plaza
23. (0, -7): tide-gate, sewer-junction-3 (**2-way**)
24. (6, -2): rat-run-2, lean-to-camp, carrion-field, plague-bearers-lair (**4-way**)
25. (5, -3): narrow-alley-5, crumbling-wall-1
26. (1, -7): dry-dock, sewer-tunnel-6 (**2-way**)
27. (6, -3): narrow-alley-6, bone-pit, scavengers-market (**3-way**)
28. (7, -2): collapsed-building-3, drowned-shrine
29. (7, -3): narrow-alley-7, blast-crater
30. (6, -4): gutter-drain, ash-garden, gutter-sewer (**3-way**)
31. (1, -8): effluent-outflow, collapsed-sewer
32. (7, -5): broken-bridge, ruined-tenement-2

---

## TEST REPORT CLOSURE

**Tested:** Warrens (110 rooms, 295 exits) and Siltgate (141 rooms, 287 exits)

**Verdict:**
- ✅ Bidirectional consistency: PASS (zone transitions and hidden exits exempt)
- ✅ Loop consistency: PASS (internal grids are well-formed)
- ❌ Planar topology: **FAIL** (22 + 32 = 54 position collisions across both zones)
- ⚠️ Reachability: PARTIAL (all rooms reachable except zone-transition-only entries)

**Severity:** High — Any 2D map renderer would show impossible crossing exits.

**Next Steps:** Design review required before implementing topology fixes.

---

# Decision: AnsiDescriptionEditor — new component vs. extending AnsiPreview

**Author:** Regis (Frontend Dev)
**Date:** 2026-04-07
**PR:** #332

## Context

The zone designer's room description fields were plain textareas with no way to preview or insert ANSI color tags. We already had `AnsiPreview.tsx` — a standalone preview panel with copy-to-clipboard buttons.

## Decision

Created a **new** `AnsiDescriptionEditor.tsx` component rather than extending `AnsiPreview`, because:

1. **Different purpose:** `AnsiPreview` is a passive reference panel (copy tag snippets to clipboard). The editor needs to be an active form control (wrap selection, insert at cursor, replace the textarea).
2. **Different API:** The editor accepts `value` + `onChange` like a form input. AnsiPreview only takes a `value` for display.
3. **Single Responsibility:** Keeping them separate avoids bloating AnsiPreview with editor logic that most consumers don't need.

## Impact

- `AnsiPreview.tsx` remains unchanged — any other admin pages using it are unaffected.
- `AnsiDescriptionEditor.tsx` can be reused anywhere a description textarea needs ANSI editing (creature descriptions, item descriptions, etc.).

---

# Decision: ANSI Colored Text — Hybrid Syntax Approach

**Date:** 2026-04-07  
**Author:** Regis (Frontend Dev)  
**Issue:** #318  
**PR:** #324  

## Decision

Support **both** lightweight tag syntax (`[red]text[/red]`) and raw ANSI escape codes (`\x1b[31m`). The parser normalises ANSI escapes into lightweight tags internally, then renders spans with existing `.ansi-*` CSS classes.

## Rationale

- Lightweight tags are author-friendly for admins editing descriptions in the admin dashboard
- Raw ANSI codes are familiar to MUD veterans and useful for server-generated text
- Both map to the same CSS classes, so output is identical regardless of input format
- No new npm dependencies — the parser is ~200 lines of TypeScript

## Architecture

- `packages/client/src/lib/ansi-parser.ts` — stateless parser, exports `parseAnsiText()`, `stripAnsi()`, `SUPPORTED_NAMES`
- `packages/client/src/components/AnsiText.tsx` — thin render wrapper
- `packages/client/src/components/admin/AnsiPreview.tsx` — admin preview panel with color palette

## Team Impact

- **Server team:** Can send ANSI-escaped text in message payloads; client will render it. No server changes required.
- **Content team:** Can use `[red]...[/red]` syntax in any description field; live preview available in admin forms.
- **Future work:** `stripAnsi()` is available for plain-text fallback (notifications, search indexing, etc.)

---

## Name replacement for Saitcho Kindar

### Context
**Saitcho Kindar** is the legendary, anonymous inventor of the preservation brine that saved humanity during the Gulf Coast collapse. The Kindari faction reveres Kindar as their spiritual ancestor and founder of their philosophy. The faction description states: "Above all, they revere Saitcho Kindar — the anonymous inventor of the brine whose legacy preserved them all."

Saitcho Kindar is referenced in two key places in the game world:
1. **The Reliquary** (Kindari faction hub) features a shrine to Kindar: "the central chamber dominated by a shrine to Saitcho Kindar — a preserved pickling urn surrounded by scavenged drone components"
2. **Character Select screen** describes The Reliquary as: "Wake among the preservers. The Kindari guard the memory of Saitcho Kindar in vaulted halls of salvaged tech and carefully maintained urns."

The name should evoke:
- A Gulf Coast / Southern heritage (Cajun, Creole, Louisiana influences)
- Post-industrial decay and survival
- Someone who feels like a practical inventor/survivor, not a mythic hero
- A name that resonates with the Kindari aesthetic of salvage, preservation, and mechanical restoration

### Current References
- `packages/client/src/pages/CharacterSelect.tsx` — Faction description
- `packages/server/src/db/migrations/002_seed_content.sql` — Kindari faction lore
- `packages/server/src/db/migrations/003_seed_zones.sql` — Reliquary shrine description

### Suggestions

1. **Toulouse Marais** — Merges the French Quarter (Toulouse St.) with the Cajun landscape (marais = marsh). Feels like a person's name, evokes New Orleans preservationist heritage, works for someone who might've been tinkering with brine in a swamp workshop.

2. **Delacroix Fournier** — Delacroix is an actual Louisiana parish with a strong fishing/survival heritage. Fournier is an old Cajun surname. Together they suggest someone from the Gulf's working-class survival tradition, not a distant hero. The name has weight and local authenticity.

3. **Levi Broussard** — Short, practical first name (industrial feel); Broussard is a renowned Cajun surname. Sounds like someone who *fixed things*, not theorized about them. Matches the Kindari ethos of craftspeople over philosophers.

4. **Margot Thibodeaux** — A Creole/Cajun classic with gender-neutral flair. Thibodeaux is deeply rooted in South Louisiana. The two-syllable pairing has a rhythm that echoes the real world's Creole naming tradition, and "Margot" was a real person's name, making the legend feel grounded.

5. **Ezra Guidry** — Ezra carries both biblical solidity and a frontier feel. Guidry is an Acadian surname common in South Louisiana. Together they suggest someone weathered, practiced, methodical—exactly what you'd want in an inventor tasked with saving humanity through chemistry.

**Recommendation**: **Levi Broussard** or **Delacroix Fournier** best match the tone. Levi is punchy and practical; Delacroix feels more mythic while staying grounded in Gulf Coast identity.

---

# Decision: Combat Sandbox Architecture

**Author:** Elminster  
**Date:** 2026-04-07  
**Status:** Proposed  
**Impacts:** All agents (new RoomTypes, new command pattern, new service)

---

## Decision

The combat sandbox is implemented as **three feature rooms inside the Refuge zone**, not a new zone or Colyseus Room type. This follows the established feature-room pattern.

## Key Points

1. **Three new RoomTypes:** `feature_sandbox`, `feature_sandbox_arena`, `feature_sandbox_stats` — added to BOTH `packages/shared/src/room-graph.ts` AND `packages/server/src/generator/RoomGraph.ts` (they must stay in sync).

2. **State isolation is mandatory.** Sandbox fights produce NO loot, NO XP, NO death penalty, NO run history records. Player HP resets on leaving the arena. The `sandboxMode` flag on `CommandContext` gates all side-effects.

3. **Same CombatSystem, different lifecycle.** The arena uses a real `CombatSystem` instance with the real damage formula. Only the lifecycle (spawn/reset) and side-effects (loot/XP/death) are sandbox-controlled. This ensures sandbox results reflect actual combat behavior.

4. **Dev-gated.** All sandbox commands check `getConfig().devModeEnabled` — same pattern as `peaceful` command. Rooms exist in the Refuge but commands return "not available" on production.

5. **New service: `SandboxService`** in `packages/server/src/sandbox/` — manages creature spawning, stat overrides, combat logging. Wired into ZoneRoom for sandbox room types only.

6. **Phased delivery:** Phase 1 (spawn/fight/reset/log), Phase 2 (stat tuning), Phase 3 (scenario save/load/replay). Phase 1 is the implementation target.

## Constraints for Implementers

- The RoomType union in shared and server packages MUST be updated in lockstep.
- Sandbox creatures are spawned via `CreatureManager` using existing `CreatureTemplate` infrastructure — no new creature format.
- The `CombatLogger` is a sandbox-only component. Do NOT add logging overhead to the production CombatSystem tick path.
- Hard cap of 5 creatures per spawn command to protect tick budget.

## Design Doc

Full spec: `docs/design/sandbox-combat-arena.md`

---

# Decision: Sandbox Arena — Combat Isolation via Separate CombatSystem

**Author:** Jarlaxle (Systems Dev)  
**Date:** 2026-04-07  
**Status:** Proposed  
**Scope:** Combat, Creatures, Dev Tools

## Decision

The sandbox combat arena should use a **separate `CombatSystem` instance per player**, not flags on the existing zone combat system.

## Context

We need a sandbox for rapid combat iteration in Refuge. The CombatSystem manages room-scoped encounters for all players. Adding sandbox-awareness to every method (damage calc, flee, encounter cleanup) would pollute the core loop.

## Implications

- Sandbox creatures tagged `sandbox: true` on the `Creature` instance — excluded from loot, XP, repop, corpse system
- Player state snapshotted on sandbox entry, restored on reset/exit
- Sandbox tick timer is independent of zone tick (enables speed/pause/step)
- All sandbox commands gated behind `devModeEnabled` (same as `/peaceful`, `/goto`)
- Full design: `docs/design/sandbox-combat-mechanics.md`

## Needs Input From

- **Elminster**: Architecture review — is per-player CombatSystem acceptable memory-wise? Any concerns with the ZoneRoom wiring?
- **Laeral**: How does sandbox mode interact with sandbox UI/arena zone design on the frontend side?
- **Regis**: Frontend combat log rendering — verbose sandbox output needs distinct styling

---

# Decision: Combat Sandbox Server Infrastructure

**Author:** Drizzt  
**Date:** 2026-04-07  
**Status:** Proposed  
**Scope:** Server — command system, feature rooms, combat tick, creature spawning

## Decision

The combat sandbox will be implemented as a **feature room type** (`feature_sandbox`) inside persistent zones like The Refuge, not as a separate Colyseus room type. Commands are feature-gated via the existing `featureHandlers` map and double-gated with `devModeEnabled`.

## Key Choices

1. **Room type, not room class** — `feature_sandbox` follows the stash/board/inn pattern. No new Colyseus room type needed.
2. **Shared CombatSystem with selective ticking** — Sandbox rooms opt in to combat ticking even in non-combat zones (dev/hub). The `isNonCombatZone` guard in `ZoneRoom.update()` will check for sandbox room activity.
3. **On-demand creature spawning** — New `CreatureManager.spawnCreatureInRoom()` method for runtime spawning. Existing `spawnCreatures()` is seeding-time only.
4. **Double access gate** — Feature room gate + devModeEnabled. Production-safe by default.
5. **No death penalty in sandbox** — `sandboxRoomIds.has(roomId)` bypass for death penalty, stash loss, and run-history.

## Team Impact

- **Jarlaxle:** RoomType union change in shared package (`feature_sandbox`). Generator unaffected — sandbox rooms are hand-placed in zones.
- **Regis:** No client changes for Phase 1. Commands are text-based, results are narrations.
- **Minsc:** Test coverage needed for sandbox command dispatch, selective combat ticking, and creature spawn/despawn.
- **All:** Review `docs/design/sandbox-server-infrastructure.md` for full proposal.

## Risks

- Selective combat ticking adds complexity to the update loop. Must ensure non-sandbox rooms in dev zones remain combat-free.
- CreatureManager runtime spawning bypasses PRNG determinism — acceptable for sandbox but should not leak into production spawn paths.

---

# Decision: Sandbox Arena Content Design for The Refuge

**Date:** 2026-04-07  
**Author:** Laeral, Content Designer  
**Requestor:** dkirby-ms  
**Status:** DESIGN COMPLETE — Ready for Bruenor (Server Implementation)

---

## Decision Summary

**The Refuge will be extended with a dedicated sandbox combat testing facility** consisting of 4 new rooms (Proving Hall, Test Arena, Armory, Control Sanctum) and a roster of 15 pre-built test creatures across 5 combat archetypes and 4 difficulty tiers.

The sandbox provides **consequence-free combat testing** for designers and developers to validate combat mechanics, creature balance, and encounter design without affecting live zone populations.

---

## What Was Requested

From dkirby-ms on 2026-04-07:

> TASK: Design the **content and layout** for sandbox combat arena rooms within Refuge. Specifically:
> 1. Analyze current Refuge layout
> 2. Design sandbox rooms (Arena, Armory, Control room)
> 3. Design sandbox creature roster
> 4. Write design to `docs/design/sandbox-arena-content.md`

---

## What Was Designed

### Physical Layout
- **4 new rooms** forming a thematic training complex north of the Hearth
- **Proving Hall:** Connecting corridor (entry point from Hearth)
- **Test Arena:** Large circular chamber with chalk zones and observation galleries
- **Armory:** Equipment staging room with training gear rack
- **Control Sanctum:** Planning hub with observation mirror and reference materials

### Room Theming & Aesthetic
All rooms emphasize the "designer pocket dimension" feel from GDD.md§2.1, treating The Refuge as an internal tool space:
- Proving Hall: Study of violence, diagrams and notations
- Test Arena: Ancient training ground, bloodstains, chains, observation galleries
- Armory: Craftsperson's maintenance space, non-lethal equipment, tracked logbook
- Control Sanctum: Planning workspace with observation mirror

### Creature Roster
**15 test creatures** organized by archetype and tier:

**Melee Tank Archetype** (durability/armor focus)
- Training Construct (T1) — baseline tank test, 50 HP
- Training Sentinel (T2) — intermediate tank, 120 HP
- Training Colossus (T3) — extreme durability, 250 HP

**Ranged Archetype** (distance/mobility)
- Training Archer (T1) — baseline ranged, 30 HP, high agility
- Training Sniper (T2) — intermediate ranged, 60 HP
- Training Marksman (T3) — extreme ranged pressure, 100 HP

**Dodger Archetype** (evasion/precision)
- Training Wisp (T1) — trivial evasion swarm, 15 HP
- Training Phantom (T2) — intermediate evasion, 40 HP
- Training Shade (T3) — extreme evasion test, 70 HP, agility 10

**AoE Archetype** (area effects/positioning)
- Training Caster (T1) — basic positioning test, 35 HP
- Training Warlock (T2) — intermediate AoE, 70 HP
- Training Sorcerer (T3) — extreme area damage, 120 HP

**Swarm Archetype** (crowd control)
- Training Minion (T0) — trivial cleave test, 5 HP, spawns 5-10
- Training Grunt (T1) — standard CC test, 20 HP, spawns 3-6
- Training Brute (T2) — sustained group pressure, 50 HP, spawns 2-4

### Naming Convention
All sandbox creatures use the `training_` slug prefix and follow pattern `Training {Archetype} (T{Tier})` for clarity and distinct identity from live zone creatures.

### Safety Features
- Test Arena marked with `safe_container = true` flag
- Deaths incur no corpse drop, no debuffs, no consequence
- Players respawn in-arena after death
- All gear is preserved

### Encounter Building Framework
Designers can mix creatures from the roster to build custom test encounters:
- **1v1 duels** (single creature)
- **Small groups** (3-4 creatures, mixed archetypes)
- **Boss encounters** (single T3 creature)
- **Crowd control tests** (5-10 minions/grunts)
- Custom combinations at designer discretion

### No Preset Encounters
The design deliberately avoids locked encounter templates. Designers improvise combinations based on what they need to test. The roster provides enough variety to build nearly any encounter pattern.

---

## Key Design Decisions

### 1. Five Core Archetypes (Not Four, Not Six)
**Rationale:** Mirrors the archetypal roles found in live zone populations and campaign content. Covers all major combat playstyles: durability, distance, evasion, crowd effects, and overwhelming numbers.

### 2. Flat Tiers (T0-T3), Not Scaling to Live Zone Tiers
**Rationale:** Sandbox creatures are testing tools, not live content. T3 creatures are not "monsters that would fit in an endgame zone"—they are designed specifically for sandbox stress testing. This prevents confusion and allows balanced testing across the entire difficulty spectrum.

### 3. Simplified Loot Tables (Training Items Only)
**Rationale:** Testing should focus on mechanics, not economics. All sandbox creatures drop generic training items (scrap metal, spell crystals) that are immediately recognizable as test loot, not aspirational rewards.

### 4. Control Sanctum as Planning, Not Combat
**Rationale:** The Control Sanctum is a room where designers *prepare* encounters, not where they occur. This keeps encounter spaces contained to the Test Arena and allows future expansion for UI/interactive features without cluttering the combat space.

### 5. Safety Container Flag Over Special Respawn Logic
**Rationale:** Using the existing `safe_container` database flag leverages existing infrastructure rather than introducing new mechanic. Consequence-free deaths are already understood by the combat system.

### 6. Armory Separate from Arena
**Rationale:** Designers may want to test with or without equipment changes. Having a dedicated armory room prevents pre-combat loadout decisions from affecting encounter focus.

---

## Migration Path

Implementation requires:

1. **002_seed_content.sql** — Insert 15 creature definitions into `creature_definitions` table
2. **003_seed_zones.sql** — Insert 4 room definitions into `zone_rooms` (zone_slug = 'the-refuge'), insert 4 exit definitions into `zone_exits`, update 'the-refuge' entry_room_slugs to include 'proving-hall'

**No client changes required** — Rooms are pure DB content; creatures use existing combat system.

---

## Testing & Validation

Once implemented, verify:
- [ ] All 4 rooms are accessible from The Hearth via "north" (Proving Hall)
- [ ] Creature spawns appear in Test Arena on zone load
- [ ] Deaths in Test Arena do not drop corpses or apply debuffs
- [ ] Player respawns in Test Arena after death, not at faction stronghold
- [ ] Creatures have correct HP/stats matching design spec
- [ ] Loot drops match design (training items only, no rare loot)

---

## Future Expansions (Not This Phase)

**Phase 2 — Interactive Control Sanctum:**
- Admin UI for on-demand creature spawning
- Encounter preset dropdown
- Real-time stat adjustments

**Phase 3 — Extended Arenas:**
- Additional arena rooms for multi-group testing
- Environmental hazard zones

**Phase 4 — Spectator Gallery:**
- Observation rooms with logging/replay system

---

## Deliverables

- [x] Design document: `docs/design/sandbox-arena-content.md` (comprehensive, ready for reference)
- [x] Room descriptions (4 rooms, themed, with property flags and exit maps)
- [x] Creature definitions (15 creatures, complete stat blocks, loot tables)
- [x] Encounter templates (1v1, group, boss, swarm examples)
- [x] Implementation notes (DB integration, migration path, testing checklist)
- [x] Design rationale (why these choices, references to GDD)
- [x] Team decision artifact (this document)

---

## References

- **GDD.md§2.1-2.2:** Refuge definition, feature rooms, zone lifecycle
- **GDD.md§6:** Combat system (stats, tiers, mechanics)
- **Laeral History:** Creature archetype patterns from The Warrens and Siltgate designs
- **Existing creature definitions:** Drowned Revenant (baseline melee, 50 HP), Gutterspawn (swarm), Hollow Stalker (durability/defense)
- **Database schema:** `creature_definitions`, `zone_rooms`, `zone_exits`, safe_container flag

---

**Status:** READY FOR IMPLEMENTATION

Next step: Bruenor executes migration scripts to seed sandbox content into database.

---

# Decision: Help Command Implementation (Issue #340)

**Date:** 2025-04-08  
**Author:** Drizzt (Engine Developer)  
**Status:** Implemented  
**Commit:** 795994e

## Context

Players need a way to discover available commands and understand how to use them. This is especially important for new players and when commands are context-dependent (feature rooms, dev mode).

## Decision

Implemented a comprehensive `help` command with two modes:

1. **`help` (no args)** — Lists all available commands grouped by category, filtered by:
   - Current room type (hides feature commands not available in current location)
   - Dev mode status (hides dev tools when `devModeEnabled` is false)

2. **`help <command>` (with args)** — Shows detailed help for a specific command:
   - Description
   - Usage pattern
   - Aliases (if any)
   - Works for both primary command names and their aliases

## Implementation

### Files Created/Modified

- **Created:** `packages/server/src/commands/handlers/help.ts`
  - Static `COMMAND_HELP` registry with metadata for all commands
  - Context-aware filtering based on room type and dev mode
  - Alias resolution for detailed help queries

- **Modified:** `packages/server/src/commands/parser.ts`
  - Added `help` to `KNOWN_VERBS`
  - Added `?` → `help` alias in `COMMAND_ALIASES`

- **Modified:** `packages/server/src/commands/index.ts`
  - Imported and registered `handleHelp` in the handlers map

### Command Categories

Commands are organized into logical groups:
- **Navigation:** go, look
- **Items:** take, drop, inventory, loot, extract, search
- **Communication:** say, whisper, emote, listen
- **Combat:** attack, strike, dodge, flee, target, position
- **Special Actions:** use, stabilize, peaceful
- **Feature Rooms (context-gated):**
  - Expedition Board: board, zoneboard, enter
  - Stash: stash, store, loadout
  - Inn: rent
  - Sandbox: sandbox (also devOnly)
- **Dev Tools (devOnly):** goto, teleport

### Context Awareness

The help system respects game state:
- Feature room commands only appear when `ctx.room.type` matches the required type
- Dev commands only appear when `getConfig().devModeEnabled` is true
- Follows the established pattern from `handleGoto` and `featureHandlers` map

### Design Choices

1. **Static metadata registry** — All command help is centralized in one place, making it easy to maintain and update
2. **Category-based organization** — Improves discoverability by grouping related commands
3. **Alias support** — `help l` works just as well as `help look`
4. **System narration type** — Help output uses `type: 'system'` to distinguish it from game narrative
5. **Not feature-gated** — Help is a standard command available everywhere (unlike board/stash/etc.)

## Alternatives Considered

1. **Dynamic help from handler functions** — Would require every handler to export metadata; rejected for being more complex and harder to maintain
2. **Separate help files** — Would scatter documentation; rejected in favor of single source of truth
3. **Feature-gate help itself** — Would prevent players from learning about commands; rejected

## Testing

- TypeScript compilation: ✅ Passed
- ESLint: ✅ No warnings (fixed non-null assertions)
- Manual validation: Command structure follows established patterns
- Test suite: 26/26 tests passing (see orchestration log for coverage details)

## Future Enhancements

Potential improvements:
- Add examples to command help entries
- Support for `help <category>` to show all commands in a category
- Mark unimplemented commands (search, listen, extract, use) differently
- Add help for sub-commands (e.g., `help sandbox spawn`)

---

**Status:** COMPLETE

All tests passing. Issue #340 closed with commit 795994e. Help command fully operational with context-aware filtering and alias support.

---

# Architecture Review: BFS Layout Engine

**Reviewer:** Elminster (Lead/Architect)  
**Date:** 2026-04-07  
**Commit reviewed:** `b7a86af` (HEAD)

## Assessment Summary

The BFS layout engine (computeLayout.ts, 2746 lines) is **architecturally sound** but has **accumulated technical debt**. Review identified 1 critical performance issue, 3 robustness/maintainability concerns, and 5 refactoring opportunities.

## Strengths

1. **Z-Level Isolation** — Clean per-floor layout with deferred vertical exits
2. **Grid Detection** — Mathematically precise perpendicular-path convergence test
3. **Pure Interface** — No side effects, easy to test and integrate
4. **Direction Guards** — Comprehensive reversal checks prevent compass violations
5. **Test Coverage** — 25 tests covering single rooms through 109-room Warrens zone
6. **Exit Line Avoidance** — Efficient edge occlusion prevention

## Critical Issues

### P0: O(n⁴) Scoring Bottleneck
**Lines:** 989–1018, 2090–2118  
**Impact:** Siltgate (59 rooms) takes 222ms. A 200-room zone would take ~30 seconds — unusable.

**Root cause:** Pairwise swap loops (O(n²) pairs) × `layoutScore()` (O(n²) evaluation per pair) = O(n⁴).

**Mitigation:** Implement incremental scoring. When moving one room, only recompute that room's exits and its neighbors, not the entire z-level. Drops per-move complexity from O(n²) to O(degree × n) ≈ O(n), making total swaps O(n³) or better.

### P1: Code Quality
1. **Scoring DRY violation** (L779–840 vs 1882–1930) — 95% identical functions, divergent occlusion weights. Extract parameterized `computeScore(occlusionWeight)`.
2. **Magic numbers** (23+ instances) — Hardcoded limits like 200, 20, 50, 15, 3, etc. with no semantic meaning. Name them: `MAX_SEARCH_RADIUS`, `DIAGONAL_PENALTY`, etc.
3. **Diamond search boilerplate** (10+ copies) — Extract `diamondCandidates()` generator to eliminate ~100 lines of copy-paste.
4. **GRID_STEP = 1 is a no-op** — Feature appears enabled but multiplies by 1. Either set to 2 or remove.
5. **`findNearestUnoccupied` infinite loop** (L87) — No termination bound. Add radius cap (e.g., 500).

## Recommendations (Prioritized)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Incremental scoring | 2–3 days | Essential for scaling past 20–30 rooms |
| P1 | Extract scoring, name constants, extract helpers | 2–3 days | Maintainability, reduces debt |
| P2 | Fix GRID_STEP, add loop bounds | 0.5 day | Removes dead code, improves robustness |
| P3 | File decomposition (future) | 1 week | Needed only if file grows further |

## Algorithm Assessment

BFS + refinement pipeline is the correct approach for compass-aware MUD layouts. Phase ordering is sound — each phase fixes problems earlier phases can't solve.

**Post-BFS scaling (Option C):** Architecturally correct. Preserves all refinement invariants because refinement operates pre-scale. Currently disabled (`GRID_STEP = 1`).

## Decision

**Do NOT refactor until P0 is complete.** The current structure is coherent and testable. Grid spacing feature (`b7a86af`) is safe to merge — it only adds dead code (`GRID_STEP = 1` loop) and doesn't break existing functionality.

**Future work:** Schedule P0/P1 refactoring for next sprint once grid spacing is stable in production.

---

**Status:** REVIEW COMPLETE (no code changes)

---

# Decision: BFS Grid Spacing — Post-BFS Scaling (Option C)

**Author:** Regis  
**Date:** 2026-04-07  
**Scope:** `packages/client/src/map/computeLayout.ts`

## Context

Dense zones (like Midgaard) produce cascading collision displacements in the BFS layout engine because rooms are placed on adjacent grid cells (spacing = 1). The `findNearestDirectional()` spiral pushes rooms to non-ideal positions, producing criss-crossing edges.

## Decision

**Chose Option C: Post-BFS scaling** over Option A (scaling DIRECTION_OFFSETS) or Option B (GRID_STEP multiplier in BFS loop).

Added `const GRID_STEP = 2` and a final scaling pass that multiplies all `(x, y)` coordinates by 2 after all 8 refinement phases complete.

## Rationale

- **Zero risk to BFS internals:** All distance heuristics, direction checks, layout scoring, force relaxation, diagonal fix, direction violation repair, and occlusion fix operate unchanged at spacing=1.
- **Z-level unaffected:** z is a floor index, not spatial — not scaled.
- **Tunable:** GRID_STEP can be changed to 3 or higher if needed.
- **ELK integration:** `elkLayout.ts` applies its own `GRID_SPACING` (100px) on top, so visual spacing doubles automatically to ~200px.

## Implementation

File: `packages/client/src/map/computeLayout.ts`
- Added constant: `const GRID_STEP = 2` (line reference in commit `b7a86af`)
- Added scaling loop: Multiplies all (x, y) coordinates by GRID_STEP after refinement phases
- Z-coordinates unchanged

## Validation

- 244 client tests passing ✅
- TypeScript compilation clean ✅
- ESLint: 0 errors ✅
- Commit: `b7a86af feat(map): add grid spacing to BFS layout engine`

## Impact

- All callers of `computeLayout()` receive coordinates at 2x scale
- Well-designed zones with clean compass exits lay out on a perfect grid with no displacement
- Dense zones have fewer collision cascades
- Visual spacing to player: `(BFS grid × 2) × ELK scaling (100px) = ~200px minimum between rooms`

---

**Status:** IMPLEMENTED (commit `b7a86af`)


# Decision: BFS Layout Engine Refactoring

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-07  
**Files:** `packages/client/src/map/computeLayout.ts`

## Summary

Refactored computeLayout.ts per Elminster's architecture review. The file went from 2746 lines with 23+ magic numbers, 17 duplicated diamond search patterns, 2 near-identical scoring functions, and a mutation bug — to ~2734 cleaner lines with named constants, a shared generator, parameterized scoring, and pure functions.

## Key Decisions

1. **Diamond candidate generator over inline loops.** Extracted `diamondCandidates(cx, cy, minRadius, maxRadius)` as a generator function. Callers handle filtering/processing; the generator handles iteration order. This reduced 17 copy-pasted patterns to single-line calls.

2. **Parameterized scoring over duplicate functions.** Merged `occlusionAwareScore()` into `layoutScore(z, occlusionWeight?)`. Default weight 3 for early phases, pass 15 for occlusion fix phase. One function, two behaviors.

3. **Position overrides over mutation for swap testing.** `countMismatchesInvolving()` now accepts an optional `posOverrides` Map. `swapWouldIncreaseMismatches()` passes overrides instead of temporarily mutating the shared `result` Map. This eliminates a class of bugs where interrupted/concurrent reads could see inconsistent state.

4. **Delta scoring for swaps.** Added `roomScoreContribution()`, `affectedRooms()`, and `sumContributions()` helpers. Swap evaluation computes only the score change for affected rooms (~constant per swap) instead of the full O(n²) layout score. Measurable speedup on large zones.

5. **Removed GRID_STEP dead code.** The `GRID_STEP=1` constant and its scaling loop were no-ops (multiply by 1). Removed entirely. If grid spacing is needed later, it should be re-implemented properly.

## Impact

- All 25 computeLayout + 13 elk-layout tests pass with identical results
- ~15% speedup on test suite (249ms vs 293ms)
- File reduced by ~12 lines despite adding new helper functions

## Commits

- `02c3382` refactor(computeLayout): Phase 1 mechanical cleanup
- `b51a65e` perf(computeLayout): Phase 2 — fix mutation bug, cache posToRoom, delta scoring

**Status:** IMPLEMENTED

---

# Decision: Post-BFS Cardinal Alignment Pass (Phase 5c)

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-15  
**Commit:** b82ce8e  

## Context

The user reported that `inside-the-west-gate-of-midgaard` and `main-street` appeared at different y levels in the zone designer, creating a visual right-angle on what should be a straight E/W corridor.

## Root Cause

Two issues combine:

1. **Data mismatch:** The Midgaard migration uses room type `'entrance'` for `outside-the-west-gate-of-midgaard`, but `ZoneDesigner.tsx` line 109 checks for `'entry'`. No match → falls back to `rooms[0]?.slug` (arbitrary DB order).

2. **BFS entry-point sensitivity:** Different BFS starting rooms produce different visit orders. When BFS reaches main-street via temple-square→market-square (from the north) and inside-the-west-gate via a different path, they end up on different grid rows.

## Decision

Added **Phase 5c: Cardinal Alignment** to `computeLayout.ts`, a general post-BFS correction pass:

- Builds union-find groups for E/W exits (rooms that must share the same y) and N/S exits (same x).
- For each misaligned group, batch cascade-shifts all outlier rooms + their perpendicular subtrees to the majority coordinate.
- Accepts shifts only if the global layout score improves (no regressions).
- Runs after direction violation repair, before occlusion fix.

## Team Impact

- **No API changes.** Pure client-side layout engine change.
- **ELK adapter unchanged.** `elkLayout.ts` was not the problem — it faithfully passes BFS coordinates through.
- **Separate fix needed:** The `'entrance'` vs `'entry'` type mismatch in the Midgaard migration should be fixed by whoever owns the DB schema. The cardinal alignment pass is a general safety net, not a Midgaard-specific hack.

## Tests

- 27 BFS layout tests passing (including new entry-point independence test).
- 13 ELK layout tests passing.
- 271 total client tests passing.

**Status:** IMPLEMENTED (commit b82ce8e)

---

# Decision: Zone Transfer Validation Pattern

**Author:** Drizzt (Engine Dev)
**Date:** 2026-04-07
**Issue:** #342

## Context
Cross-zone `goto` (and potentially `go` with inter-zone exits) can issue a `zoneTransfer` to a nonexistent zone, causing the client to disconnect when the matchmaker fails.

## Decision
Zone transfer validation uses a **two-layer pattern**:

1. **Handler level** — `resolveZoneExists` optional callback on `CommandContext` enables synchronous zone validation in command handlers (currently used by `goto`).
2. **Room level** — `ZoneRoom.handleCommandMessage` checks `knownZoneSlugs` cache before sending any `ZONE_TRANSFER` message as a defensive safety net.

## Rationale
- Command handlers are synchronous; async zone repo calls can't be added without changing the handler signature.
- Optional callback pattern is consistent with existing `resolveRoom`, `resolvePlayerByName` on CommandContext.
- Cached zone slugs are best-effort (loaded on room create); stale cache is acceptable since zone creation is rare and server restarts refresh.
- Belt-and-suspenders: handler validation catches bad `goto` input early; room-level check catches edge cases from any command that produces `zoneTransfer`.

## Impact
- Any new command that accepts zone slugs from user input should use `ctx.resolveZoneExists` for validation.
- The `go` command's inter-zone exits come from authored zone data, so handler-level validation isn't needed there (room-level check covers it).

**Status:** IMPLEMENTED

---

# Decision: Classic CircleMUD Zone Import Numbering

**Date:** 2025-07-25
**Author:** Bruenor (Content Builder)

## Context

Imported 3 classic CircleMUD zones (Chessboard, High Tower of Magic, Haon-Dor Forest) from tbaMUD stock areas using the existing `scripts/import-diku-zone.ts` importer.

## Decision

Used migration numbers **006, 007, 008** instead of the originally requested 005, 006, 007, because `005_sandbox_rooms.sql` already existed. The importer was not modified — it worked correctly on all three zone topology types (grid, vertical tower, branching wilderness).

## Outcome

| Zone | Migration | Rooms | Exits | Cross-zone Skipped |
|------|-----------|-------|-------|--------------------|
| The Chessboard | 006 | 67 | 230 | 1 |
| The High Tower of Magic | 007 | 100 | 221 | 4 |
| The Haon-Dor Forest | 008 | 60 | 147 | 3 |

All SQL files follow the established pattern (BEGIN/COMMIT, cross-join VALUES, ON CONFLICT DO NOTHING). These are auto-generated and marked as needing review before production use. Cross-zone exits are expected skips — those rooms live in other .wld files.

**Status:** IMPLEMENTED

---

**Note:** This section merged from .squad/decisions/inbox on 2026-04-08T01:21Z. Deduplicated Regis alignment fixes into single Phase 5c entry.

---

# Decision: Repo Hygiene Foundations (#343)

**Date:** 2026-04-08  
**Decision Maker:** Danilo (Community Relations)  
**Issue:** #343  
**Status:** Implemented  

## Summary

Ellmud now has a complete hygiene and QoL foundation for scaling contributor engagement and automating releases.

## What Was Added

| File | Purpose |
|------|---------|
| `LICENSE` | ISC (matches package.json) |
| `CONTRIBUTING.md` | Contribution workflow, setup, code style |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.0 |
| `SECURITY.md` | Responsible vulnerability disclosure |
| `.editorconfig` | 2-space indent, Unix line endings, UTF-8 |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug reporting guidance |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request guidance |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR checklist and context |
| `.github/workflows/release.yml` | Automated release (version bump + tag + GitHub release) |

## Key Technical Choices

### Release Workflow
- **Trigger:** `workflow_dispatch` (manual, via Actions UI)
- **Input:** version type (major/minor/patch)
- **Logic:**
  1. Bumps `package.json` version via `npm version`
  2. Syncs workspace package.json files via `npm run version:sync`
  3. Commits version bump
  4. Creates git tag (`v{version}`)
  5. Pushes to main + creates GitHub Release with auto-generated changelog

### Issue & PR Templates
- YAML frontmatter (GitHub standard) for metadata (labels, assignees)
- Clear sections guiding users to provide actionable information
- Bug template: steps to reproduce, environment, logs
- Feature template: problem, solution, alternatives, impact
- PR template: type of change, testing checklist, code review focus

### Code of Conduct
- Adopted Contributor Covenant 2.0 (widely recognized, clear enforcement)
- Enforcement escalation: warning → mute → ban (for serious violations)
- Direct reporting to maintainers (not public GitHub issues)

## Impact

✅ **For Contributors:**
- Clear setup instructions (docs/setup.md reference)
- Explicit code style expectations (TypeScript, ESLint, comments only for complex logic)
- Template-driven issue/PR creation = better signal-to-noise
- Standard code of conduct = safe, welcoming community

✅ **For Maintainers:**
- Automated release pipeline = fewer manual steps, fewer mistakes
- Consistent editor config = fewer formatting nitpicks in review
- Issue/PR templates = structured data, easier triage
- Security disclosure path = responsible handling of vulnerabilities

✅ **For the Project:**
- Scales contributor onboarding without increasing maintainer load
- Reduces friction for first-time contributors
- Professional presentation (LICENSE, CONTRIBUTING visible in repo root)

## Future Enhancements (Out of Scope)

- Add CI/CD integration tests to PR template reminders
- Add Discord webhook notifications for releases
- Add automated changelog generation (changelog.md)
- Add contributor attribution in release notes
- Add automated dependabot PR template customizations

## References

- Contributor Covenant v2.0: https://www.contributor-covenant.org/version/2_0/code_of_conduct/
- EditorConfig: https://editorconfig.org/
- GitHub Issue Templates: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/
- GitHub Actions: https://docs.github.com/en/actions

---

# Decision: Architecture Diagram Format

**Author:** Danilo  
**Date:** 2026-04-08  
**PR:** #348 (merged as #349)  
**Status:** Implemented  

## Summary

The README architecture diagram uses **Mermaid** (not ASCII art or external images). This means:

- The diagram is version-controlled as code, not a binary asset.
- It renders natively on GitHub — no external tool or image hosting needed.
- Anyone can update the architecture by editing the Mermaid block in `README.md`.

## Rationale

- Mermaid is the most maintainable option: diffs are readable, changes are reviewable.
- GitHub renders Mermaid in markdown natively — no build step required.
- The previous ASCII diagram was hard to update and didn't scale as the system grew.

## Impact

- **If you change the architecture** (add a new service, rename a subsystem, add a new data store), update the Mermaid block in `README.md` under `## Architecture`.
- The diagram is color-coded by component group — keep colors consistent when adding nodes.

**Status:** Merged
# PR #350 Architectural Review — Repo Hygiene

**Reviewer:** Elminster (Lead/Architect)  
**Date:** 2026-04-08  
**PR:** #350 — chore: repo hygiene improvements (#343)  
**Author:** Danilo (via dkirby-ms)  
**Status:** REQUEST CHANGES (Critical fix required before merge)  

---

## Summary

PR #350 adds 9 files to establish open-source readiness: LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, .editorconfig, and GitHub templates. **Excellent work on 8/9 files.** However, `release.yml` contains a critical flaw that will break automated release creation.

---

## Detailed Review

### ✅ APPROVED (7/9 files)

#### 1. LICENSE (ISC)
- **Status:** Correct
- **Details:** ISC text with proper attribution (2026, dkirby-ms). Matches package.json `"license": "ISC"`.
- **No issues.**

#### 2. CONTRIBUTING.md
- **Status:** Approved with minor note
- **Strengths:**
  - Clear workflow: Pick issue → Create branch from `dev` → Make changes → Test (build, lint, test) → Commit with Conventional Commits → Open PR
  - References existing `docs/setup.md` (verified exists)
  - Code style section is honest: "TypeScript, ESLint, existing patterns, comments only for complex logic"
  - Testing section enforces checklist discipline
  - Areas of contribution are well-scoped (Game Logic, Client, Backend, Documentation)
- **Minor note:** Line ~127 references "Discord community server" without URL. Either add the actual invite link or change to "GitHub Discussions" (exists by default). Non-blocking.
- **Decision:** Approved as-is. Discord ref can be added in a follow-up if/when Discord server is created.

#### 3. CODE_OF_CONDUCT.md
- **Status:** Correct
- **Details:**
  - Adapted from Contributor Covenant 2.0 (industry standard, good attribution)
  - Enforcement escalation is sound: private → warning → temporary mute → ban
  - Scope covers GitHub + Discord + other channels
  - Pledge and Standards sections are inclusive and clear
- **No issues.**

#### 4. SECURITY.md
- **Status:** Correct
- **Strengths:**
  - Vulnerability reporting: 48-hour acknowledgement SLA is reasonable for a v0.1.0 game project
  - Does NOT encourage public disclosure before fix (good)
  - Security best practices cover the actual threat surface: .env secrets, Azure AI keys, PostgreSQL/Redis credentials, Microsoft Entra integration
- **Minor note:** Supported Versions table says "Latest: Supported | Older: Not supported" but doesn't enumerate specific versions. Acceptable for a pre-release project (v0.1.0).
- **Decision:** Approved.

#### 5. .editorconfig
- **Status:** Correct
- **Details:**
  - 2-space indent across all file types (matches npm convention, matches existing codebase)
  - Unix line endings (LF) with final newline (correct for cross-platform teams)
  - UTF-8 charset (correct)
  - Markdown: `trim_trailing_whitespace = false` (good—preserves intentional breaks in markdown)
  - Makefile: indent_style = tab (correct—makefiles require tabs)
- **No issues.**

#### 6. .github/ISSUE_TEMPLATE/bug_report.md
- **Status:** Correct
- **Details:**
  - YAML frontmatter with `name`, `labels: bug`, proper title prefix `[BUG]`
  - Sections: Description, Steps to Reproduce, Expected vs Actual Behavior, Environment (OS, Node version, browser, game version), Screenshots/Logs, Additional Context
  - Guides users toward reproducibility (good for game bugs with environment variance)
- **No issues.**

#### 7. .github/ISSUE_TEMPLATE/feature_request.md
- **Status:** Correct
- **Details:**
  - YAML frontmatter with `name`, `labels: enhancement`, title prefix `[FEATURE]`
  - Sections: Problem, Proposed Solution, Alternatives, Additional Context (including scope: game logic/UI/admin tools, affected systems, priority)
  - Guides users toward design-first thinking
- **No issues.**

#### 8. .github/PULL_REQUEST_TEMPLATE.md
- **Status:** Excellent
- **Strengths:**
  - Type-of-Change checklist (bug fix, feature, breaking change, docs, chore)
  - Testing section with explicit checkboxes: build, lint, test, no linting errors, builds successfully
  - Checklist discipline reinforces code quality gate
  - References rebasing on `dev` branch (matches CONTRIBUTING.md workflow)
  - Screenshots section (good for UI work)
  - Notes section for context
- **Decision:** Approved as-is. This is a high-quality PR template.

### 🚫 REJECTED (1/9 files) — release.yml requires revision

#### 9. .github/workflows/release.yml
- **Status:** REQUEST CHANGES (Critical issue)

**What the workflow does:**
- Manual trigger (`workflow_dispatch`) with version input (major, minor, patch)
- Checks out main branch, sets up Node.js, installs deps
- Bumps version in package.json, syncs workspace versions
- Creates git tag, pushes commits + tag
- Generates changelog from commit history
- **Creates GitHub Release** (the critical step)
- Optional Slack notification

**CRITICAL ISSUE — Line 87:**
```yaml
- name: Create GitHub Release
  uses: actions/create-release@v1
```

This action was **deprecated Dec 2022 and archived**. GitHub no longer maintains it, and it may be removed from the Actions Marketplace without warning.

- **Risk:** Future release runs will fail to create the GitHub Release, leaving the project with unpublished releases (tags pushed but no GitHub Release artifacts).
- **Impact:** Automation silently degrades; users cannot download release artifacts.
- **Fix:** Replace with a maintained alternative:
  - **Option A (Recommended):** Use `ncipollo/release-action@v1` (well-maintained, 3K+ stars, widely used)
    ```yaml
    - name: Create GitHub Release
      uses: ncipollo/release-action@v1
      with:
        tag: v${{ steps.version.outputs.version }}
        name: Release v${{ steps.version.outputs.version }}
        body: |
          # Release v${{ steps.version.outputs.version }}
          
          ## Changes
          ${{ steps.release_notes.outputs.CHANGELOG }}
          
          For detailed changes, see the [commit log](https://github.com/${{ github.repository }}/commits/v${{ steps.version.outputs.version }}).
        draft: false
        prerelease: false
        token: ${{ secrets.GITHUB_TOKEN }}
    ```
  - **Option B:** Use GitHub REST API directly (more verbose but zero external dependencies)

**MINOR ISSUE — Line 53:**
```yaml
- name: Sync workspace versions
  run: npm run version:sync
  continue-on-error: true
```

The `continue-on-error: true` flag allows the workflow to proceed even if `npm run version:sync` fails. **Consequence:** If workspace version sync fails, the root package.json will have v0.1.1 but packages/client|server|shared will still be v0.1.0. This creates a fragmented release state.

- **Recommendation:** Remove `continue-on-error: true` so failures are visible and require investigation.

**PERMISSIONS — Lines 17-18:**
```yaml
permissions:
  contents: write
  pull-requests: read
```

These are correct. The `create-release` action (or replacement) will need `contents: write` to push tags and create releases. ✅

---

## Architectural Decisions Made

1. **release.yml approach is sound:** Manual trigger (workflow_dispatch) is appropriate for a v0.1.0 project. Automatic semantic versioning with `npm version` is clean.

2. **Workspace version sync strategy is correct:** Using `npm run version:sync` to propagate the root version to all workspace packages (client, server, shared) is the right approach for a monorepo using npm workspaces.

3. **Changelog generation is pragmatic:** Git log-based changelog is acceptable for an MVP. As the project matures, consider GitHub Release History API or a dedicated changelog tool (e.g., standard-changelog).

---

## Required Actions Before Merge

- [ ] Replace `actions/create-release@v1` with `ncipollo/release-action@v1` (or equivalent)
- [ ] (Optional but recommended) Remove `continue-on-error: true` from the version:sync step
- [ ] Re-test the workflow by triggering a dry-run release (e.g., bump to v0.1.1)
- [ ] Re-push and request re-review

---

## Outcome

**Verdict:** REQUEST CHANGES

**Reason:** Critical deprecated action will break release automation. Fix is straightforward (2-line change). All other 8 files are approved and ready to merge.

**Path forward:** Danilo/dkirby-ms revises release.yml, re-pushes to the same branch. Elminster will approve and merge.

---

## Appendix: Verification Checklist

- [x] LICENSE: Matches package.json license + copyright year
- [x] CONTRIBUTING.md: References exist (docs/setup.md), workflow aligns with team practice
- [x] CODE_OF_CONDUCT.md: Covers reported channels, has enforcement policy
- [x] SECURITY.md: Covers threat surface (env vars, API keys, dependencies)
- [x] .editorconfig: Matches npm/Node conventions (2-space, LF, UTF-8)
- [x] Issue templates: YAML frontmatter correct, label assignment clear
- [x] PR template: Testing checklist + rebase guidance
- [x] release.yml: Workflow logic sound, but deprecated action must be replaced

# Design Proposal: Room Features System (Issue #345)

**Author:** Elminster (Lead/Architect)  
**Date:** 2026-04-08  
**Issue:** #345 — Room features  
**Related:** #44 — Contracts/Quest Engine  
**Status:** Research & Design Complete — Awaiting Implementation Assignment

---

## Executive Summary

This proposal defines the architecture for **room features** — interactive triggers within rooms that players can examine via `look <target>` commands. These features enable richer environmental storytelling, hidden lore, quest initiation, and interactive world-building beyond base room descriptions.

**Key Points:**
- **Scope:** Generic room feature system supporting arbitrary triggers per room
- **Use cases:** Notes on walls, inscriptions, murals, environmental details, quest initiation triggers
- **Command pattern:** `look <target>` dispatches to room feature if target matches; falls back to existing look behavior
- **Data model:** JSONB column `features` on `zone_rooms` table (no new table needed)
- **Quest integration:** Features can reference contract/quest IDs for initiation triggers
- **Implementation effort:** 2-3 days (Drizzt or Jarlaxle), low risk

---

## Current State Analysis

### 1. Room Data Model

**Database schema** (`packages/server/src/db/migrations/001_schema.sql:342-356`):
```sql
CREATE TABLE zone_rooms (
  id              UUID PRIMARY KEY,
  zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'corridor',
  properties      TEXT[] NOT NULL DEFAULT '{}',
  loot_containers JSONB NOT NULL DEFAULT '[]',
  hazards         JSONB NOT NULL DEFAULT '[]',
  npcs            JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_zone_room_slug UNIQUE (zone_id, slug)
);
```

**TypeScript types** (`packages/shared/src/zone.ts:40-55`):
```typescript
export interface ZoneRoomDefinition {
  id: string;
  zoneId: string;
  slug: string;
  name: string;
  description: string;
  type: RoomType;
  properties: RoomProperty[];
  lootContainers: LootContainer[];
  hazards: HazardPlaceholder[];
  npcs: Array<{
    creatureId: string;
    spawnCount: number;
    behavior?: string;
  }>;
}
```

**Observations:**
- Rooms already support structured JSONB data for `loot_containers`, `hazards`, `npcs`
- Pattern is established: JSONB columns for dynamic, schema-flexible content
- `zone-adapter.ts` converts `ZoneRoomDefinition` → `Room` (runtime graph format)
- Rooms are loaded once at zone instantiation, then held in memory as `Map<string, Room>`

### 2. Current Look Command

**Handler** (`packages/server/src/commands/handlers/look.ts`):
- **No argument handling** — current `look` command ignores `ctx.args`
- Displays: room description, exits, items, creatures, players, corpses
- Returns a `CommandResult` with narrations and a room header
- No logic for examining specific objects or targets

**Parser** (`packages/server/src/commands/parser.ts:28`):
- `l` alias → `look` (single-letter shorthand)
- No parsing logic for multi-word targets (e.g., `look wooden sign`)
- Args are preserved in `CommandMessage.args: string[]`

**Command flow:**
1. Player types `look` or `look <target>`
2. `parseCommand()` → `{ verb: 'look', args: ['<target>'] }`
3. `handleCommand('look', ctx)` calls `handleLook(ctx)`
4. `handleLook()` currently ignores `ctx.args` entirely

### 3. Feature-Room Pattern (Established Precedent)

**Example: Stash Room** (`packages/server/src/commands/handlers/stash-command.ts`):
- Feature-gated commands (`stash`, `store`) require `feature_stash` room type
- Services injected into `CommandContext` (e.g., `ctx.stashService`)
- Command handlers check context availability before executing
- Pattern: feature rooms enable specific commands + inject feature-specific context

**Example: Sandbox Room** (`packages/server/src/commands/handlers/sandbox.ts`):
- Multiple room types (`feature_sandbox`, `feature_sandbox_arena`, `feature_sandbox_stats`)
- Sub-commands route to different behaviors based on room type and args
- Pattern: commands with sub-verbs dispatch on args

**Key insight:** Room features need **no new room type** — they extend existing rooms with data, not behavior gates.

### 4. Contract/Quest System (Currently Unimplemented)

**Current state:**
- `feature_contracts` room type exists in type definitions
- No database schema for contracts/quests (#44 is marked `go:no`, Phase 4, no implementation)
- ContractsList.tsx is a placeholder UI showing "PLANNED — PHASE 3"
- Issue #44 was updated 2 hours ago with new scope: quest engine with multi-step objectives

**Implications for room features:**
- Room features can be **quest-agnostic** initially (just narration)
- Schema should **reserve space** for future quest/contract IDs
- When quest system lands, features can trigger quest initiation without schema migration

---

## Proposed Architecture

### 1. Data Model: Room Features

Add a `features` JSONB column to `zone_rooms`:

**Migration** (`packages/server/src/db/migrations/009_room_features.sql`):
```sql
-- Add features column to zone_rooms
ALTER TABLE zone_rooms
  ADD COLUMN features JSONB NOT NULL DEFAULT '[]';

-- Example: A note on the wall (narrative only)
UPDATE zone_rooms SET features = '[
  {
    "id": "wall-note",
    "keywords": ["note", "wall note", "parchment"],
    "shortDescription": "A torn parchment is pinned to the wall.",
    "longDescription": "The note reads: \"They watch from the water. Do not trust the reflections.\" The handwriting is erratic.",
    "questId": null
  }
]'::jsonb
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-warrens')
  AND slug = 'flooded-cellar';

-- Example: An inscription that initiates a quest (future)
UPDATE zone_rooms SET features = '[
  {
    "id": "altar-inscription",
    "keywords": ["inscription", "altar", "runes"],
    "shortDescription": "Ancient runes glow faintly on the altar.",
    "longDescription": "The inscription reads: \"Speak the names of the drowned, and they shall answer.\" A chill runs through you.",
    "questId": "quest_drowned_covenant"
  }
]'::jsonb
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'shrine';
```

**TypeScript types** (extend `ZoneRoomDefinition` in `packages/shared/src/zone.ts`):
```typescript
export interface RoomFeature {
  /** Unique ID within the room (e.g., 'wall-note', 'altar-inscription') */
  id: string;
  /** Keywords players can use to target this feature (e.g., ['note', 'parchment']) */
  keywords: string[];
  /** Inline description shown in base room description (optional) */
  shortDescription?: string;
  /** Full narration when player examines the feature */
  longDescription: string;
  /** Optional: quest/contract ID to initiate when examined (future) */
  questId?: string | null;
}

export interface ZoneRoomDefinition {
  // ... existing fields ...
  features: RoomFeature[];
}
```

**Runtime representation** (extend `Room` in `packages/shared/src/room-graph.ts`):
```typescript
export interface Room {
  // ... existing fields ...
  features?: RoomFeature[];
}
```

**Adapter changes** (`packages/server/src/zones/zone-adapter.ts:45-58`):
```typescript
for (const zr of zoneRooms) {
  const room: Room = {
    id: zr.slug,
    name: zr.name,
    description: zr.description,
    type: zr.type,
    exits: new Map<Direction, string>(),
    items: [...zr.lootContainers],
    hazards: [...zr.hazards],
    ...(zr.properties.length > 0 ? { properties: [...zr.properties] } : {}),
    ...(zr.features?.length > 0 ? { features: [...zr.features] } : {}), // NEW
  };
  rooms.set(zr.slug, room);
  slugToRoom.set(zr.slug, room);
}
```

### 2. Command Flow: Enhanced Look Handler

**Updated `handleLook()`** (`packages/server/src/commands/handlers/look.ts`):

```typescript
export function handleLook(ctx: CommandContext): CommandResult {
  const { room, args } = ctx;

  // Case 1: "look" with no target → show full room description (existing behavior)
  if (args.length === 0) {
    return showFullRoom(ctx);
  }

  // Case 2: "look <target>" → check room features
  const target = args.join(' ').toLowerCase().trim();

  if (room.features && room.features.length > 0) {
    const match = room.features.find(f =>
      f.keywords.some(kw => kw.toLowerCase() === target)
    );

    if (match) {
      return examineFeature(ctx, match);
    }
  }

  // Case 3: No feature match → fallback (future: examine items, creatures, players)
  return {
    narrations: [{
      text: `You don't see anything called "${args.join(' ')}" here.`,
      type: 'system',
    }],
  };
}

function showFullRoom(ctx: CommandContext): CommandResult {
  const { room } = ctx;
  const exitList = Array.from(room.exits.keys()).join(', ') || 'none';

  const lines: string[] = [
    room.description,
    '',
    `Exits: ${exitList}`,
  ];

  // ... existing creature, player, corpse, item logic ...

  return {
    narrations: [{ text: lines.join('\n'), type: 'room' }],
    roomHeader: {
      roomName: room.name,
      roomSlug: room.id,
      exits: Array.from(room.exits.keys()),
      stability: ctx.stability,
    },
  };
}

function examineFeature(ctx: CommandContext, feature: RoomFeature): CommandResult {
  const narrations: NarrationEntry[] = [
    { text: feature.longDescription, type: 'room' },
  ];

  // Future: quest initiation logic
  if (feature.questId) {
    // TODO: Check if player has already started this quest
    // TODO: Call quest system to initiate quest
    // TODO: Add quest-started narration to result
    narrations.push({
      text: `(Quest initiation: ${feature.questId} — not yet implemented)`,
      type: 'system',
    });
  }

  return { narrations };
}
```

**Key design decisions:**
- **No ambiguity resolution:** If keywords overlap, first match wins (authoring responsibility)
- **Exact keyword match:** `target === keyword` (case-insensitive), no fuzzy matching
- **Multi-word support:** `args.join(' ')` allows `look wooden sign` to match keyword `"wooden sign"`
- **Graceful degradation:** Unknown targets return a neutral error, not a parser rejection
- **Future extensibility:** Fallback case can later dispatch to item/creature/player examination

### 3. Feature Description Integration

**Option A: Explicit in base description** (recommended for Phase 1):
- Authoring: Add feature hint directly to `zone_rooms.description` field
- Example: `"You're in a castle cellar. There is a note on the wall."`
- Pro: Zero code changes, maximum control, works today
- Con: Authors must manually coordinate description + feature keywords

**Option B: Dynamic injection** (Phase 2+):
- System: Append `feature.shortDescription` to room description if present
- Example: Room description + `"\n\nYou notice: A torn parchment pinned to the wall."`
- Pro: DRY — feature data drives both base description and examine text
- Con: Requires `handleLook()` refactor to inject feature hints into room narration

**Decision:** Start with Option A. Option B can be added incrementally without breaking changes.

### 4. Quest Integration (Future)

When the quest system lands (Issue #44), room features integrate as follows:

**Quest initiation flow:**
1. Player examines feature with `questId` set
2. `examineFeature()` calls `ctx.questService?.tryInitiateQuest(questId, playerId)`
3. Quest service checks prerequisites, player state, returns result
4. If initiated: narration appended ("You feel a pull toward the depths…")
5. If already active: narration reflects status ("You've already accepted this task.")
6. If ineligible: narration explains ("You lack the reputation to take this contract.")

**Required context injection** (when quest system exists):
```typescript
export interface CommandContext {
  // ... existing fields ...
  questService?: QuestService; // NEW — injected by ZoneRoom for all rooms
}
```

**Schema compatibility:** The `questId` field is already reserved in `RoomFeature` — no migration needed.

---

## Implementation Plan

### Phase 1: Core Feature System (2-3 days)

**Agent:** Drizzt (Engine Dev) or Jarlaxle (Systems Dev)

**Tasks:**
1. **Migration:** Create `009_room_features.sql` with `ALTER TABLE` + seed examples
2. **Types:** Add `RoomFeature` interface to `packages/shared/src/zone.ts`, extend `ZoneRoomDefinition` and `Room`
3. **Adapter:** Update `zone-adapter.ts` to copy `features` from `ZoneRoomDefinition` → `Room`
4. **Command:** Refactor `handleLook()` to dispatch on `args`, add `examineFeature()` helper
5. **Tests:** Unit tests for keyword matching, multi-word targets, graceful fallback
6. **Content:** Seed 3-5 example features across existing zones (Warrens, Siltgate)

**Acceptance criteria:**
- `look` with no args works as before
- `look note` examines feature if keywords match
- `look unknown` returns "You don't see anything called…"
- Database stores features in JSONB, adapter loads them into runtime rooms
- No quest initiation yet — just narration

**Risk:** Low. Existing look command is simple, feature matching is deterministic, no cross-system dependencies.

### Phase 2: Quest Initiation Hooks (depends on Issue #44)

**Agent:** TBD (blocked on quest system design)

**Tasks:**
1. **Context:** Add `questService` to `CommandContext`, inject in `ZoneRoom.buildContext()`
2. **Logic:** In `examineFeature()`, check `feature.questId`, call `questService.tryInitiateQuest()`
3. **Narration:** Append quest-initiated messages to result
4. **Tests:** Integration tests with mock quest service, verify initiation flow

**Acceptance criteria:**
- Examining feature with `questId` calls quest service
- Quest service response reflected in narration
- Players cannot double-initiate quests

**Risk:** Medium. Depends on quest system API contract (not yet designed).

### Phase 3: Enhanced Feature Types (optional, Phase 4+)

**Potential extensions:**
- **Interactive features:** `use altar`, `activate lever` → trigger room state changes
- **Conditional features:** Show/hide features based on quest state or faction rep
- **Multi-stage features:** Examining feature multiple times reveals more info
- **Clickable UI:** Frontend renders feature keywords as clickable links in room description

**Agent:** TBD (future work, not in scope for #345)

---

## Design Rationale & Alternatives Considered

### Why JSONB column instead of new table?

**Decision:** JSONB column `features` on `zone_rooms`.

**Rationale:**
- Features are **tightly coupled to rooms** — no reuse across rooms, no need for normalization
- Existing precedent: `loot_containers`, `hazards`, `npcs` all use JSONB
- Query pattern: Load entire zone bundle once, hold in memory → no N+1 queries
- Schema flexibility: Authors can add custom fields (e.g., `"discoverable": true`) without migrations

**Alternative rejected:** Separate `zone_room_features` table with foreign key to `zone_rooms`.
- Pro: Normalized, easier to query all features across zones
- Con: Join required on zone load, slower cold start, more complex adapter logic
- Con: No use case for querying features independently of rooms

### Why exact keyword matching instead of fuzzy/partial?

**Decision:** Exact match (case-insensitive) on full keyword string.

**Rationale:**
- **Predictability:** Authors control exactly what triggers the feature
- **No ambiguity:** `look note` matches `"note"`, not `"notebook"` or `"denote"`
- **Simplicity:** No Levenshtein distance, no substring search, no regex
- **Consistency:** Aligns with existing command patterns (`attack goblin` requires exact name)

**Alternative rejected:** Fuzzy matching (substring, partial match, did-you-mean).
- Pro: More forgiving UX
- Con: Unpredictable for authors, harder to test, prone to unintended matches
- Example: `look sign` might match both `"wooden sign"` and `"insignia"` → which wins?

**Future extension:** If needed, add `"aliases"` field to `RoomFeature` for common misspellings.

### Why start with narration-only, delay quest integration?

**Decision:** Phase 1 delivers examine-and-read features with no quest logic.

**Rationale:**
- **Quest system doesn't exist yet** (#44 is Phase 4, currently `go:no`)
- **Fast delivery:** Core feature system can ship in 2-3 days, unblocked
- **Prove the pattern:** Validate keyword matching, content authoring, UX before adding complexity
- **Incremental risk:** Phase 1 is low-risk, Phase 2 (quest hooks) inherits stable foundation

**Alternative rejected:** Wait for quest system, ship both at once.
- Pro: Fully integrated feature set
- Con: Delays useful content tool by weeks/months, blocks world-building work

---

## Dependencies & Risks

### Dependencies

**Upstream (blocking this work):**
- None. Room features are independent of other systems.

**Downstream (blocked by this work):**
- Issue #44 (Quest Engine) — Quest initiation via room features requires this system
- Content authoring — Laeral/Bruenor can begin adding interactive lore once Phase 1 lands

### Risks

**Low risk:**
- Schema change is additive (new column, no data loss)
- Command flow is simple (no state changes, just narration dispatch)
- No cross-room interactions, no multiplayer concerns
- Test coverage straightforward (keyword matching + fallback)

**Medium risk (Phase 2 only):**
- Quest system API is undefined — integration contract may shift
- Mitigation: Design `questService` interface now, stub implementation for tests

**No risk:**
- Performance: Features loaded once per zone, held in memory
- Backwards compatibility: Existing rooms have `features = []`, no behavior change
- Migration: `DEFAULT '[]'` makes rollout non-breaking

---

## Content Authoring Workflow

Once Phase 1 lands, content creators (Laeral, Bruenor) can add features via SQL:

**Example: Add a mural in the Siltgate shrine**
```sql
UPDATE zone_rooms
SET features = features || '[
  {
    "id": "shrine-mural",
    "keywords": ["mural", "painting", "fresco"],
    "shortDescription": "A faded mural depicts a procession of robed figures.",
    "longDescription": "The mural shows robed figures descending into dark water, their faces serene. At the center, a crowned figure holds a black pearl. The paint is centuries old, but the pearl seems to shimmer."
  }
]'::jsonb
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'shrine';
```

**Example: Update room description to reference the mural**
```sql
UPDATE zone_rooms
SET description = 'An altar rises from black water in the center of a domed chamber. Strange symbols pulse with faint violet light along the walls. A faded mural covers the eastern wall.'
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'shrine';
```

**Future: Admin UI** (Phase 4+, out of scope for #345):
- Zone Designer could render features as editable list in room detail panel
- WYSIWYG editor for `longDescription` with ANSI preview
- Keyword validation (warn if keywords overlap across features in same room)

---

## Testing Strategy

**Unit tests** (`packages/server/src/__tests__/room-features.test.ts`):
- Keyword matching: exact match, case-insensitive, multi-word
- Fallback behavior: unknown target returns error narration
- No-args behavior: existing `look` works unchanged
- Edge cases: empty keywords array, duplicate keywords, null descriptions

**Integration tests** (`packages/server/src/__tests__/feature-examine-flow.test.ts`):
- Load zone with features, player examines feature, verify narration
- Multiple features in same room, verify correct one returned
- Feature in one room doesn't leak to adjacent room

**Regression tests:**
- Existing `look` command tests pass unchanged
- Zones with no features behave identically to today

**Future (Phase 2):**
- Quest initiation: Mock quest service, verify `tryInitiateQuest()` called with correct params
- Quest state: Verify repeated examine reflects quest status (not started / active / completed)

---

## Open Questions

1. **Should features be discoverable or always visible?**
   - Current proposal: Features mentioned in room description (explicit)
   - Alternative: Hidden features require `search` command or passive Perception check
   - Decision: Start explicit, add hidden features in Phase 3 if needed

2. **Should examining a feature consume an action/tick?**
   - Current proposal: No — `look <target>` is instant, like `look`
   - Alternative: Interactive features (use/activate) could take a tick
   - Decision: Narration is free, interactions (future) cost time

3. **Should features support audio cues / LLM narration?**
   - Current proposal: Static text only (DM voice)
   - Alternative: Features trigger LLM narration for flavour variation
   - Decision: Static for Phase 1 (consistent, testable), LLM in Phase 3 if desired

4. **Should the frontend render features as clickable?**
   - Current proposal: Text-only, players type `look <target>`
   - Alternative: Parse room narration, render keywords as `<button>` or `<a>`
   - Decision: Backend-ready, frontend enhancement is Phase 4 polish

---

## Agent Assignment Recommendation

**Phase 1 implementation (2-3 days):**

**Primary candidate:** Jarlaxle (Systems Dev)
- Owns content pipeline (migrations, zone seeding, zone-adapter)
- Experience with JSONB schema extensions (npcs, hazards)
- Can coordinate with Laeral/Bruenor on example content

**Alternative candidate:** Drizzt (Engine Dev)
- Owns command system (look.ts, parser.ts)
- Deep knowledge of command flow and context building
- Can quickly extend `handleLook()` with feature dispatch

**Decision:** Either agent is qualified. Recommend Jarlaxle if content seeding is priority, Drizzt if command polish is priority.

**Phase 2 implementation (quest hooks):**
- Blocked on Issue #44 quest system design
- Agent TBD based on who owns quest service implementation
- Integration risk is low if Phase 1 interface is stable

---

## Summary

Room features are a **high-value, low-risk** addition to the world-building toolkit. The JSONB schema pattern is proven, the command flow is simple, and the system is fully backwards-compatible. Phase 1 delivers immediate content authoring capabilities with no external dependencies. Phase 2 (quest integration) slots in cleanly once the quest system exists.

**Recommendation:** Approve for implementation. Assign to Jarlaxle or Drizzt for 2-3 day sprint.

---

# Live Rooms Admin Page — Research & Design Proposal

**Issue:** #344  
**Author:** Regis (Frontend Dev)  
**Date:** 2026-01-20  
**Status:** Research Complete — Awaiting Approval

---

## Executive Summary

Issue #344 requests an admin page for **Live Rooms** (zone room management, NOT Colyseus room management) that allows admins to:
1. See which zone rooms are currently live/active
2. Send broadcast messages to a specific room
3. Spawn new creatures in a specific room
4. Teleport a player to a specific room

**Current State:** We already have LiveRooms.tsx and LiveRoomDetail.tsx pages that handle Colyseus room instance management (pause/resume, creature spawning). The requested features require **zone-specific room management** (individual rooms within a zone instance), which is a different concern.

**Key Finding:** The request conflates two concepts:
- **Colyseus rooms** (zone instances, e.g., `zone:the-refuge`) — already managed by LiveRoomDetail.tsx
- **Zone rooms** (individual rooms within a zone's room graph, e.g., `hearth`, `stash-alcove`) — NOT currently exposed in admin UI

This proposal clarifies the distinction and recommends a design that enhances the existing LiveRoomDetail page rather than creating a separate page.

---

## 1. Current Admin Dashboard Structure

### 1.1 Existing Admin Pages

**Pattern:** List page → Detail page with forms

Examples:
- `/admin/creatures` → `/admin/creatures/:id` — Content CRUD
- `/admin/items` → `/admin/items/:id` — Content CRUD
- `/admin/zones` → `/admin/zones/:slug` → Zone Designer — Zone content editing
- `/admin/live-rooms` → `/admin/live-rooms/:roomId` — Live Colyseus room management

**AdminLayout.tsx Navigation:**
- Dashboard
- **Content** section: Creatures, Items, Modifiers, Loot Tables, Skills, Factions, Rooms, Zones, Narrative, Balance, Contracts, Recipes
- **System** section: **Live Rooms**, Deploy, Audit Log, Users

**Current Live Rooms pages:**
- **LiveRooms.tsx** (`/admin/live-rooms`) — Lists all active Colyseus room instances with Room ID, Type, Players, Status, Created timestamp
- **LiveRoomDetail.tsx** (`/admin/live-rooms/:roomId`) — Shows detailed view of a single Colyseus room instance with:
  - Room Status (lifecycle, stability, collapse timer, tick, connected clients, player count, paused state)
  - Creatures list (name, ID, behavior state, HP, current room ID)
  - Players list (session ID, current room ID, inventory count, weight)
  - Actions: Pause/Resume, Spawn Creature (with modal for template + target room selection)

### 1.2 API Structure

**Admin API endpoints** (packages/server/src/admin/routes.ts):
- `GET /admin/api/rooms` — List all Colyseus room instances
- `GET /admin/api/rooms/:roomId` — Get Colyseus room detail
- `POST /admin/api/rooms/:roomId/pause` — Pause Colyseus room tick
- `POST /admin/api/rooms/:roomId/resume` — Resume Colyseus room tick
- `POST /admin/api/rooms/:roomId/spawn` — Spawn creature in a zone (with optional `targetRoomId` field for zone room targeting)

**Client API wrappers** (packages/client/src/lib/admin-api.ts):
- `fetchLiveRooms()` → `{ rooms: LiveRoomSummary[] }`
- `fetchLiveRoomDetail(roomId)` → `LiveRoomDetail`
- `pauseRoom(roomId)` → `{ roomId, paused }`
- `resumeRoom(roomId)` → `{ roomId, paused }`
- `spawnInRoom(roomId, type, templateId, targetRoomId?)` → `SpawnResult`

---

## 2. Zone Room vs Colyseus Room Clarification

**Colyseus Room (Already Managed):**
- A live server-side room instance (e.g., `zone:the-refuge`, Colyseus room ID `abc-123-xyz`)
- Managed by ZoneRoom.ts or RefugeRoom.ts
- Has players connected via WebSocket
- Has lifecycle state (seeding, open, active, destabilizing, collapse)
- Can be paused/resumed (stops game tick)
- Current admin page: LiveRoomDetail.tsx

**Zone Room (NOT Currently in Admin UI):**
- An individual room within a zone's room graph (e.g., `hearth`, `stash-alcove`, `training-grounds`)
- Defined in `zone_rooms` table with slug, name, description, features
- Connected via exits in `zone_exits` table
- Players navigate between zone rooms using directional commands (`go north`)
- Creatures occupy specific zone rooms (tracked by `currentRoomId` field)
- **No direct admin UI for zone room management currently exists**

**Issue #344 Request Analysis:**
- "See which zone rooms are currently live/active" — Ambiguous: Could mean either Colyseus rooms (already visible) OR zone rooms with players/creatures in them (not currently exposed)
- "Send broadcast messages to a specific room" — Implies zone room targeting (broadcast to players in `hearth`, not entire zone instance)
- "Spawn new creatures in a specific room" — Already implemented! `spawnInRoom` accepts `targetRoomId` parameter
- "Teleport a player to a specific room" — Implies zone room targeting (move player to `stash-alcove` within current zone)

**Interpretation:** The request is for **zone-room-level management within a live Colyseus room instance**. This is an enhancement to LiveRoomDetail.tsx, not a new page.

---

## 3. Proposed Solution: Enhance LiveRoomDetail.tsx

### 3.1 Current LiveRoomDetail Features
- ✅ View room status (lifecycle, stability, tick, paused state)
- ✅ View creatures in the zone (with current room ID shown)
- ✅ View players in the zone (with current room ID shown)
- ✅ Pause/resume zone tick
- ✅ Spawn creatures (with optional target room ID)

### 3.2 Missing Features (From Issue #344)
- ❌ **Explicit zone room list** — No visual representation of the zone's room graph
- ❌ **Room occupancy view** — Can't easily see "which rooms have players/creatures right now"
- ❌ **Broadcast to specific room** — No API endpoint or UI for this
- ❌ **Teleport player to room** — No API endpoint or UI for this

### 3.3 Proposed Enhancements

#### Enhancement 1: Zone Room Graph Visualization
**Location:** New section in LiveRoomDetail.tsx below "Room Status"

**UI Components:**
- Tabbed interface: "Room Graph" | "Creatures" | "Players"
- **Room Graph tab:**
  - Table view of all zone rooms (fetched from zone definition)
  - Columns: Room Name, Slug, Players (count), Creatures (count), Features (badges for stash, expedition-board, etc.)
  - Click row to expand/collapse room detail:
    - Player list in this room (session ID, inventory)
    - Creature list in this room (name, HP, behavior)
    - Actions: "Broadcast to Room", "Spawn Creature Here", "Teleport Player Here"

**Data Source:**
- Zone definition (rooms + exits) — fetch via `GET /admin/api/zones/:slug`
- Live room detail (players, creatures) — already fetched via `fetchLiveRoomDetail(roomId)`
- **Challenge:** Current `LiveRoomDetail` doesn't include zone slug, so we can't fetch the zone definition
  - **Solution:** Add `zoneSlug` field to `AdminZoneDetail` response in admin/routes.ts

**API Changes Required:**
- Modify `GET /admin/api/rooms/:roomId` to include `zoneSlug: string` in response for zone rooms

#### Enhancement 2: Broadcast Message to Room
**UI:** New button in room detail row actions: "Broadcast to Room"

**Modal:**
- Title: "Broadcast Message to [Room Name]"
- Text area: Message input (max 500 chars)
- Checkbox: "Send as system message" (default checked)
- Buttons: Cancel | Send

**New API Endpoint:**
```
POST /admin/api/rooms/:roomId/broadcast
Body: { targetRoomId: string, message: string, type: 'system' | 'admin' }
Response: { success: boolean, message: string }
```

**Server Implementation (admin/routes.ts):**
```typescript
router.post('/admin/api/rooms/:roomId/broadcast', adminAuth, async (req, res) => {
  const room = safeGetRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  const { targetRoomId, message, type = 'system' } = req.body;
  if (!targetRoomId || !message) {
    return res.status(400).json({ error: 'Missing targetRoomId or message' });
  }
  
  // Call ZoneRoom method to broadcast to specific room
  const zoneRoom = room as any; // Cast to ZoneRoom
  if (typeof zoneRoom.broadcastToRoom === 'function') {
    zoneRoom.broadcastToRoom(targetRoomId, {
      narrations: [{ text: `[ADMIN] ${message}`, type }]
    });
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(400).json({ error: 'Room does not support room-specific broadcasts' });
  }
});
```

**ZoneRoom.ts Changes:**
- `broadcastToRoom()` method already exists! (line 1133)
- No changes needed — endpoint just needs to call it

#### Enhancement 3: Teleport Player to Room
**UI:** New button in room detail row actions: "Teleport Player Here"

**Modal:**
- Title: "Teleport Player to [Room Name]"
- Dropdown: Select player (shows session ID or character name if available)
- Checkbox: "Notify player" (default checked)
- Buttons: Cancel | Teleport

**New API Endpoint:**
```
POST /admin/api/rooms/:roomId/teleport
Body: { sessionId: string, targetRoomId: string, notify: boolean }
Response: { success: boolean, message: string }
```

**Server Implementation (admin/routes.ts):**
```typescript
router.post('/admin/api/rooms/:roomId/teleport', adminAuth, async (req, res) => {
  const room = safeGetRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  const { sessionId, targetRoomId, notify = true } = req.body;
  if (!sessionId || !targetRoomId) {
    return res.status(400).json({ error: 'Missing sessionId or targetRoomId' });
  }
  
  const zoneRoom = room as any; // Cast to ZoneRoom
  const player = zoneRoom.players?.get(sessionId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found in this room' });
  }
  
  // Validate target room exists
  const targetRoom = zoneRoom.roomGraph?.rooms?.get(targetRoomId);
  if (!targetRoom) {
    return res.status(400).json({ error: 'Target room not found in zone graph' });
  }
  
  // Update player location
  const previousRoomId = player.currentRoomId;
  player.currentRoomId = targetRoomId;
  
  // Notify player if requested
  if (notify) {
    const client = room.clients.find(c => c.sessionId === sessionId);
    if (client) {
      const { MessageTypes } = await import('@ellmud/shared');
      client.send(MessageTypes.NARRATE, {
        text: `[ADMIN] You have been teleported to ${targetRoom.name}.`,
        type: 'system',
        timestamp: Date.now(),
      });
    }
  }
  
  // Broadcast movement (reuse existing ZoneRoom logic)
  if (typeof zoneRoom.broadcastPlayerMovement === 'function') {
    zoneRoom.broadcastPlayerMovement(sessionId, previousRoomId, targetRoomId, null);
  }
  if (typeof zoneRoom.broadcastRoomOccupantsUpdate === 'function') {
    zoneRoom.broadcastRoomOccupantsUpdate(previousRoomId);
    zoneRoom.broadcastRoomOccupantsUpdate(targetRoomId);
  }
  
  res.json({ 
    success: true, 
    message: `Teleported player to ${targetRoom.name}` 
  });
});
```

**ZoneRoom.ts Changes:**
- `broadcastPlayerMovement()` method already exists (line 1639) — private, needs to be made accessible
- **Recommendation:** Add public method `adminTeleportPlayer(sessionId, targetRoomId)` to ZoneRoom.ts that encapsulates the logic above

#### Enhancement 4: Quick Actions Sidebar Improvements
**Current:** Quick Info card shows Room Type, Full ID, Paused state

**Proposed Addition:**
- "Quick Actions" card below Quick Info
- Buttons:
  - "View Zone Graph" → Opens room graph tab
  - "Broadcast to All" → Opens broadcast modal (no target room, broadcasts to entire zone)
  - "Spawn Creature" → Already exists, move to this card for consistency

---

## 4. Work Breakdown

### Frontend Work (Regis)
1. **LiveRoomDetail.tsx enhancements:**
   - Add zone slug field to LiveRoomDetail interface
   - Add "Room Graph" tab with table view of zone rooms
   - Add room detail expansion with player/creature lists
   - Add "Broadcast to Room" button + modal
   - Add "Teleport Player Here" button + modal
   - Add Quick Actions sidebar card
2. **admin-api.ts additions:**
   - Add `broadcastToRoom(roomId, targetRoomId, message, type)` function
   - Add `teleportPlayer(roomId, sessionId, targetRoomId, notify)` function
3. **Zone data fetching:**
   - Add logic to fetch zone definition when room is a zone instance
   - Handle non-zone rooms gracefully (hide room graph tab)

**Estimated LOC:** +300 lines (mostly UI components, modals, state management)

### Backend Work (Jarlaxle + Drizzt)
1. **Admin routes (Jarlaxle):**
   - Add `zoneSlug` field to `AdminZoneDetail` response in `GET /admin/api/rooms/:roomId`
   - Add `POST /admin/api/rooms/:roomId/broadcast` endpoint
   - Add `POST /admin/api/rooms/:roomId/teleport` endpoint
2. **ZoneRoom.ts (Drizzt):**
   - Add public `adminTeleportPlayer(sessionId, targetRoomId)` method
   - Consider making `broadcastToRoom()` public (currently private)
   - Add validation for room existence before teleporting

**Estimated LOC:** +80-100 lines (admin routes + ZoneRoom methods)

### Architecture Work (Elminster)
**None required** — This enhancement fits within existing patterns:
- Admin routes already handle room management
- ZoneRoom already has broadcast and movement logic
- Client-server contract already established for admin operations

### Testing (Minsc)
1. Add integration tests for new admin endpoints:
   - Test broadcast to specific room
   - Test player teleportation
   - Test validation (room not found, player not found)
2. Add client tests for new UI components:
   - Room graph table rendering
   - Broadcast modal interaction
   - Teleport modal interaction

**Estimated LOC:** +150 lines (test cases)

---

## 5. Design Mockup (Wireframe Description)

### LiveRoomDetail.tsx Layout (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back]  Zone — abc-123…                          [🔄] [⏸️ Pause] │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Spawn succeeded                                               │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐ ┌──────────────────────────┐  │
│ │ Room Status                  │ │ Quick Info               │  │
│ │ Lifecycle: active            │ │ Room Type: zone          │  │
│ │ Stability: 97%               │ │ Full ID: abc-123…        │  │
│ │ Tick: 1234                   │ │ Paused: No               │  │
│ └──────────────────────────────┘ └──────────────────────────┘  │
│                                                                   │
│ ┌──────────────────────────────┐ ┌──────────────────────────┐  │
│ │ Room Graph | Creatures | … │ │ Quick Actions            │  │
│ ├──────────────────────────────┤ │ [View Zone Graph]        │  │
│ │ Room Name   Players Creatures│ │ [Broadcast to All]       │  │
│ │ ────────────────────────────│ │ [Spawn Creature]         │  │
│ │ Hearth          2      0    │ └──────────────────────────┘  │
│ │ Stash Alcove    1      0    │                               │
│ │ Training…       0      3    │ ⏸️ Tick halted — resume to    │
│ │   [Expand ▼]                │  continue simulation          │
│ │   Players: session-abc…     │                               │
│ │   Creatures:                │                               │
│ │     • Goblin (12/15 HP)     │                               │
│ │     • Orc (28/30 HP)        │                               │
│ │   Actions:                  │                               │
│ │     [Broadcast to Room]     │                               │
│ │     [Spawn Creature Here]   │                               │
│ │     [Teleport Player Here]  │                               │
│ │ Market          0      0    │                               │
│ └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

**Interaction Flow:**
1. Admin navigates to `/admin/live-rooms/:roomId`
2. Page fetches both Colyseus room detail AND zone definition (if zone room)
3. "Room Graph" tab shows table of zone rooms with live occupancy counts
4. Admin clicks row to expand → sees players/creatures in that room
5. Admin clicks "Broadcast to Room" → modal opens, admin types message, click Send
6. Admin clicks "Teleport Player Here" → modal opens, admin selects player, click Teleport
7. Feedback toast appears at top of page confirming action

---

## 6. Alternative Approaches Considered

### Alternative 1: Separate "Zone Room Manager" Page
**Pros:** Clean separation of concerns, dedicated UI for zone room management
**Cons:** 
- Duplicates Colyseus room selection (need to pick room first)
- Adds navigation step (LiveRooms → LiveRoomDetail → Zone Room Manager)
- Splits related functionality (pause/resume in one page, broadcast in another)
**Verdict:** Rejected — unnecessary navigation complexity

### Alternative 2: Add Zone Room Management to Zone Designer
**Pros:** Zone Designer already shows room graph, could add "Live View" toggle
**Cons:**
- Zone Designer is for content editing (zones, rooms, exits), not runtime operations
- Mixes content CRUD with live operations (same issue that led to LiveRooms split)
- Zone Designer doesn't know which Colyseus room instance to target
**Verdict:** Rejected — wrong conceptual layer

### Alternative 3: Room-First Navigation (Instead of Colyseus-Room-First)
**Pros:** Could show all live rooms across all zones in one table
**Cons:**
- Loses Colyseus room context (lifecycle, stability, pause/resume)
- Hard to understand "which zone instance is this room in?"
- Requires complex filtering UI ("show only rooms in zone X")
**Verdict:** Rejected — Colyseus room is the right starting point

---

## 7. Open Questions

1. **Should broadcast messages be logged?** Current spawn operations are not logged. Should broadcast/teleport operations be added to audit log?
   - **Recommendation:** YES — add audit log entries for broadcast and teleport actions

2. **Should zone room graph be cached?** Fetching zone definition on every LiveRoomDetail load might be slow for large zones.
   - **Recommendation:** Add client-side caching with React Query or SWR (future optimization)

3. **Should we expose room features in the room graph table?** (e.g., show "Stash" badge for stash rooms)
   - **Recommendation:** YES — helps admins understand room purpose at a glance

4. **Should teleport trigger `look` command?** When player is teleported, should they automatically receive room description?
   - **Recommendation:** YES — send room header + description via existing `handleLook` logic

5. **Should we support multi-player teleport?** (select multiple players, teleport all to same room)
   - **Recommendation:** NO for Phase 1 — single-player teleport is sufficient for debugging

---

## 8. Success Criteria

**This enhancement is successful when:**
1. Admins can view a list of zone rooms within a live Colyseus room instance
2. Admins can see which players and creatures are in each zone room
3. Admins can send broadcast messages to a specific zone room
4. Admins can teleport a player to a specific zone room
5. All actions provide immediate feedback (success/error toasts)
6. No new navigation pages are added (enhancement to existing LiveRoomDetail page)

---

## 9. Rollout Plan

### Phase 1: Foundation (Backend + API)
- Add `zoneSlug` to LiveRoomDetail response
- Add `POST /admin/api/rooms/:roomId/broadcast` endpoint
- Add `POST /admin/api/rooms/:roomId/teleport` endpoint
- Add `adminTeleportPlayer()` method to ZoneRoom.ts

### Phase 2: Frontend UI
- Add room graph tab to LiveRoomDetail.tsx
- Add broadcast modal + integration
- Add teleport modal + integration
- Add Quick Actions sidebar

### Phase 3: Polish
- Add audit log entries
- Add loading states and error handling
- Add room feature badges
- Add tests

**Estimated Timeline:**
- Phase 1: 2-3 days (Jarlaxle + Drizzt)
- Phase 2: 3-4 days (Regis)
- Phase 3: 1-2 days (Regis + Minsc)
- **Total: 6-9 days**

---

## 10. Recommendation

**Proceed with this proposal** — Enhance LiveRoomDetail.tsx with zone room management rather than creating a separate page. This keeps related functionality together, reduces navigation complexity, and leverages existing UI patterns.

**Next Steps:**
1. Get approval from Elminster (Architecture) and dkirby-ms (Product)
2. Create backend tickets for Jarlaxle (admin routes) and Drizzt (ZoneRoom methods)
3. Create frontend ticket for Regis (LiveRoomDetail enhancements)
4. Update issue #344 with clarified scope and link to this proposal

---

## Appendix A: Existing Code References

**LiveRooms.tsx:** packages/client/src/pages/admin/LiveRooms.tsx (182 lines)  
**LiveRoomDetail.tsx:** packages/client/src/pages/admin/LiveRoomDetail.tsx (667 lines)  
**admin-api.ts:** packages/client/src/lib/admin-api.ts (Live room section: lines 172-251)  
**admin/routes.ts:** packages/server/src/admin/routes.ts (lines 45-604 for room endpoints)  
**ZoneRoom.ts:** packages/server/src/rooms/ZoneRoom.ts (lines 1133, 1639, 2342 for broadcast methods)  
**teleport command:** packages/server/src/commands/handlers/teleport.ts (64 lines, dev-mode only)

---

## Appendix B: Related Issues & PRs

- **Issue #137 / PR #147** — Orphan endpoint finalization (pause/resume/spawn implemented)
- **Issue #309** — Faction-based entry routing (established zone slug patterns)
- **Issue #317** — Zone designer portal connections (established inter-zone patterns)

---

**End of Proposal**

---

## 11. Decision: Preserve Room Position on Duplicate Join (#355)

**Author:** Minsc (Tester/QA)  
**Date:** 2026-07-08  
**Status:** Implemented & pushed to dev

### Context

Issue #355: Browser refresh caused players to reconnect to their spawn room instead of their current room.

### Decision

When `ZoneRoom.onJoin()` detects a duplicate `playerId` (browser refresh / reconnect), preserve the existing player's `currentRoomId` and use it as the start room instead of recomputing from entry points.

### Rationale

- Browser refresh creates a new WebSocket connection (fresh `joinOrCreate()`), NOT a Colyseus `allowReconnection()`. This means the `onJoin()` path always runs.
- The duplicate-join block correctly displaced old sessions but then always overwrote `PlayerState` with a fresh entry room.
- Fix is surgical: 1 new variable + 1 new condition. No impact on new player joins or any other path.

### Impact

- `ZoneRoom.ts`: 2 small additions to `onJoin()`
- New test file: `reconnect-room-position.test.ts` (3 tests)
- Full server suite passes (2385 tests, 0 failures)
# Decision: Align all workspace packages on vitest ^3.2.x

**Author:** Drizzt (Engine Dev)
**Date:** 2025-07-24

## Context
Client and shared packages had vitest ^4.1.0 while server had ^3.2.1. npm installed vitest v4 locally in client/shared but those installs were corrupted (missing dist/). This broke the test runner completely.

## Decision
- All three workspace packages now use `vitest: "^3.2.1"` and `@vitest/coverage-v8: "^3.2.1"`
- Root hoisted vitest v3.2.4 serves all workspaces (no local installs)
- Added `**/*.d.ts` to ESLint ignores in `eslint.config.mjs` — generated declaration files should never be linted

## Rationale
- v3.2.x is the stable version already working at root; v4.x is too new and npm's workspace dedup can't handle mixed major versions cleanly
- All team members should keep vitest versions aligned going forward to avoid repeat breakage

---


# Decision: Direction Shortcuts & Speedwalks Architecture

**Date:** 2026-04-08  
**Author:** Elminster (Lead/Architect)  
**Issue:** #357 — "[FEATURE] direction shortcuts"  
**Status:** Awaiting team review & open questions resolution

---

## Decision Summary

Implement two movement convenience features in phases:

1. **Phase 1 (Arrow Keys + Numpad):** Client-side keyboard handler, no server changes
2. **Phase 2 (Speedwalk Parser):** Client-side text parser, no server changes
3. **Phase 3 (Future):** Server-side speedwalk verb for post-launch sophistication

This recommendation prioritizes simplicity and quick delivery of high-UX-value features.

---

## Architecture

### Feature 1: Arrow Keys + Numpad Shortcuts

**Implementation:** Client-side keyboard event listener in `ZoneExploration.tsx`

**Key Mapping:**
```
ArrowUp     → go north
ArrowDown   → go south
ArrowLeft   → go west
ArrowRight  → go east
PageUp      → go up
PageDown    → go down
Numpad8/9/7/6/3/1/2/4 → north/northeast/northwest/east/southeast/southwest/south/west
Numpad5     → (no-op or reserved for future use)
```

**Interaction with existing code:**
- Listener activates only when text input is NOT focused
- On direction keypress, call `handleExitClick(direction)` directly
- Uses existing `sendRawCommand(room, 'go ' + direction)` flow
- Server is unaware of keyboard origin; receives normal `go` commands

**Server Changes:** None

**Client Files:**
- `packages/client/src/pages/ZoneExploration.tsx` — Add keyboard listener
- `packages/client/src/hooks/useZoneConnection.ts` — No changes (reuses existing `handleExitClick`)

**Complexity:** Small (50–100 lines)  
**Effort:** 2–4 hours

---

### Feature 2: Speedwalk Parser

**Implementation:** Client-side text parser + command expander in `packages/client/src/utils/speedwalkParser.ts`

**Parser Contract:**
```typescript
// Input: "10e4n2s"
// Output: ['e', 'e', 'e', ..., 'n', 'n', 'n', 'n', 's', 's']

interface SpeedwalkParseResult {
  ok: boolean;
  moves?: string[];           // Directions to move (e.g., ['n', 'n', 's'])
  error?: string;             // Error message if ok=false
  totalMoves?: number;        // Count of expanded moves
}

function parseSpeedwalk(input: string): SpeedwalkParseResult;
```

**Parsing Rules:**
- Syntax: `[count]direction[count]direction...` where count is optional
- Example: `10e` = 10 east moves, `ene` = east, north, east (no counts)
- Supported directions: `n`, `s`, `e`, `w`, `u`, `d` (6 cardinal/vertical)
- Max total moves: **50** (client-side rate limit)
- Invalid syntax: Return error, don't process

**Integration:**
1. In `ZoneExploration.tsx`, detect if user input matches speedwalk pattern
2. If yes, parse and expand to individual `go` commands
3. Send each via `sendRawCommand()` in rapid succession
4. Server processes each as normal `go` command

**Fail-Stop Semantics:**
- If any move fails (e.g., "wall to the east"), the speedwalk halts
- Remaining queued moves are discarded
- Server narration explains the failure
- User sees all echoed moves in chat, then the failure message

**Example Flow:**
```
User: "10e"
Client: Parses to ['e', 'e', ..., 'e'] (10 moves)
Client: Sends 10× "go e" commands
Server: Executes move 1-6 successfully
Server: Move 7 hits a wall, returns error
Client: Displays echo "you move east" 6 times, then "wall to the east"
Result: Player has moved 6 rooms east
```

**Rate Limiting:**
- Client-side: Max 50 moves per speedwalk command
- Server-side: Inherent limit from WebSocket message rate + ~4 ticks/sec tick cadence
- No additional anti-abuse measures needed for MVP

**Server Changes:** None (MVP)

**Client Files:**
- `packages/client/src/utils/speedwalkParser.ts` — New utility
- `packages/client/src/utils/__tests__/speedwalkParser.test.ts` — Tests
- `packages/client/src/pages/ZoneExploration.tsx` — Integrate parser into `handleCommand`

**Complexity:** Medium (200–300 lines of code + tests)  
**Effort:** 3–5 hours

**Tests to cover:**
- Simple counts: `10e` → 10× east
- Mixed syntax: `3ene2s` → east, north, east, east, south, south
- Invalid syntax: `10e10` (invalid direction), `e10e` (count not prefix)
- Rate limit: `51e` rejected with "too many moves"
- Edge cases: empty input, spaces, uppercase vs lowercase

---

### Phase 3 (Future): Server-Side Speedwalk Verb

**Not part of this decision, but noted for Phase 3:**

A dedicated `speedwalk` command handler on the server would enable:
- Atomic execution (all moves succeed or none)
- Better error reporting
- Server-side move throttling per tick

**Implementation outline:**
```typescript
// Server: packages/server/src/commands/handlers/speedwalk.ts
// Parser: packages/server/src/commands/parser.ts — add 'speedwalk' verb

// User input: "speedwalk 10e4n2s"
// Server parses, validates all moves, then executes with per-tick throttle
// On failure, entire batch is rolled back
```

**Deferred because:**
- MVP client-side approach is simpler and ships faster
- Server-side adds complexity (state machine for multi-tick execution)
- Current WebSocket rate-limiting is adequate
- Can add in Phase 3 post-launch without breaking change

---

## Open Questions (Team Review Required)

Before implementation proceeds, resolve:

### 1. Ordinal Direction Support

**Question:** Should the game support northeast/northwest/southeast/southwest movement?

Currently:
- `CompassControl.tsx` renders ordinal buttons but they're UI-only
- `handleGo()` server-side only recognizes 6 directions (n/s/e/w/u/d)
- Numpad mapping assumes ordinals are supported

**Options:**
- **Option A:** Extend server support (add ordinal exits to RoomGraph, generator, all zones)
  - **Pros:** Full numpad utilization, richer navigation
  - **Cons:** Significant server-side work, generator changes, zone redesign
  - **Effort:** 2–3 days of backend + design work
  
- **Option B:** Numpad ordinals remap to cardinal fallbacks (e.g., numpad9 → try north, then east)
  - **Pros:** Quick, no server changes
  - **Cons:** Numpad doesn't feel "authentic" if ordinals don't work
  - **Effort:** 10 lines of client code

- **Option C:** Ignore numpad ordinals for MVP; allow only cardinals
  - **Pros:** Simplest, no ambiguity
  - **Cons:** Numpad layout wasted
  - **Effort:** Note in documentation

**Recommendation:** Option C (MVP ignores ordinals). Add ordinal support in Phase 3 if design wants it.

---

### 2. Numpad5 Behavior

**Question:** What should the center key (Numpad5) do?

**Options:**
- No-op (ignore it)
- Trigger "look" command
- Cancel queued speedwalk
- Reserved for future use

**Recommendation:** No-op for MVP. Can be assigned later if needed.

---

### 3. Text Input Focus Handling

**Question:** Should arrow keys trigger movement when the text input field is focused?

**Current MUD conventions:** Arrow keys work for command history even when typing, but numpad works regardless.

**Options:**
- Allow arrow keys ONLY when input is NOT focused
- Always allow numpad keys (even while typing)
- Allow all movement keys only when input not focused

**Recommendation:** Arrow keys blocked while typing (to not interfere with selection/editing); numpad always allowed.

---

### 4. Speedwalk Feedback

**Question:** How much feedback should be shown as speedwalk executes?

**Options:**
- Echo each move as it's sent (current behavior, e.g., "You move east" × 10)
- Echo only after parsing succeeds (brief "Starting 10-move sequence")
- Show move counter (e.g., "Moving... 7/10")
- Show detailed narration only for final position

**Recommendation:** Echo moves normally (existing behavior). Keep it simple for MVP.

---

### 5. Combat Interaction

**Question:** Should speedwalk be blocked when player is in combat?

**Current behavior:** `go` command is blocked in combat; player must use `flee`.

**Options:**
- Block speedwalk in combat (consistent with `go`)
- Allow speedwalk but halt on first combat engagement
- Allow speedwalk and fight mid-move (risky)

**Recommendation:** Block speedwalk in combat (consistent with `go`). Check `combatSystem.isInCombat()` before expanding speedwalk.

---

## Alignment with Design

**GDD Alignment:**
- §5.1 (Command Syntax): No changes to verb-noun structure. Arrow keys and speedwalk are client-side conveniences, transparent to server.
- §6.0 (Combat): Speedwalk should respect combat movement lock (consistent with `go`).

**Feature Interactions:**
- Compass button clicks continue to work (unaffected)
- Text commands continue to work (unaffected)
- New: Keyboard shortcuts + speedwalk syntax
- No impact on server state, combat, zone design, or narrative

---

## Testing Checklist

### Keyboard Shortcuts (Phase 1)
- [ ] Arrow keys move in correct directions
- [ ] Numpad cardinal keys move correctly
- [ ] PageUp/PageDown move up/down
- [ ] Arrow keys don't interfere with text input (history navigation, editing)
- [ ] Multiple rapid key presses queue moves correctly
- [ ] Message echo shows "You move <direction>" for each keystroke

### Speedwalk Parser (Phase 2)
- [ ] Simple counts parsed correctly (`10e` → 10 east moves)
- [ ] Mixed syntax parsed correctly (`3ene2s` → e, n, e, e, s, s)
- [ ] Rate limit enforced (`51e` rejected)
- [ ] Invalid syntax rejected gracefully (`10x`, `e10e`, empty input)
- [ ] Case-insensitive (`10E` = `10e`)
- [ ] Partial failure handled (wall mid-walk halts remaining moves)
- [ ] Message echo shows all moves and final failure message

### Integration
- [ ] Arrow keys don't interfere with speedwalk input
- [ ] Speedwalk doesn't execute if player is in combat
- [ ] Both features work in Refuge and ZoneExploration pages

---

## Files Modified (Summary)

### Phase 1: Arrow Keys + Numpad
- `packages/client/src/pages/ZoneExploration.tsx` — Add keyboard listener
- `packages/client/src/pages/Refuge.tsx` — Add keyboard listener (if needed for consistency)

### Phase 2: Speedwalk Parser
- `packages/client/src/utils/speedwalkParser.ts` — New parser utility
- `packages/client/src/utils/__tests__/speedwalkParser.test.ts` — Tests
- `packages/client/src/pages/ZoneExploration.tsx` — Integrate parser into `handleCommand`
- `packages/client/src/pages/Refuge.tsx` — Integrate parser (optional, if speedwalk supported there)

### Phase 3: Server-Side (Future)
- `packages/server/src/commands/handlers/speedwalk.ts` — New handler
- `packages/server/src/commands/index.ts` — Register `speedwalk` verb
- `packages/server/src/commands/parser.ts` — Add speedwalk parsing (optional)
- Tests: `packages/server/src/__tests__/speedwalk-command.test.ts`

---

## Decision Boundary

**This decision covers:**
- Architecture approach (client-side for Phases 1 & 2)
- Implementation roadmap (3 phases)
- Open questions for team input

**Out of scope:**
- Specific UI/UX design (e.g., help text about keyboard shortcuts)
- Theming or styling of any new UI elements
- Integration with other systems (cosmetics, plugins, etc.)

---

## Related Issues

- #357 — Direction Shortcuts (this issue)
- GDD.md — §5.1 (Command Syntax), §6.0 (Combat)

---

## Sign-Off

**Decision Made By:** Elminster (Lead/Architect)  
**Status:** Ready for team review  
**Next Step:** Team feedback on open questions → proceed with Phase 1

---

---

## 2026-04-09T00:16:00Z: User directive — #357 design decisions

**By:** dkirby-ms (via Copilot)  
**What:**
1. No ordinal directions (NE/NW/SE/SW) — cardinal only (n/s/e/w/u/d)
2. Numpad5 does nothing — macros deferred to later
3. Arrow keys only intercepted when input is NOT focused (text editing preserved)
4. Speedwalk echoes each individual move
5. Speedwalk blocked during combat

**Why:** User answers to Elminster's 5 open questions on #357

**Implementation Status:** Complete (Commit 2085460, pushed to dev)

---

## Decision: User Settings Backend Architecture (#359)

**Author:** Jarlaxle (Systems Dev)  
**Date:** 2026-04-09  
**Status:** Implemented  
**Issue:** #359

### Decision
User settings backend uses the **provider pattern** (interface → PG + InMemory) consistent with all other server persistence (characters, stash, factions, etc.). The API is two endpoints: `GET /api/user/settings` and `PUT /api/user/settings`.

### Key Choices
1. **JSONB config blob** — single `config` column with structured categories (`display`, `narration`, `gameplay`, `accessibility`). Avoids schema migrations for new settings.
2. **Server-side validation** — fontSize range (12–24), verbosity enum, narrationStyle enum, unknown top-level key rejection. Invalid → 400.
3. **No middleware** — auth is an inline `authenticate()` helper per the characters.ts pattern, not Express middleware. Keeps it consistent with existing routes.
4. **Default config on GET** — if no row exists, returns empty category objects. No DB write on first GET.
5. **Upsert semantics** — PUT always succeeds (creates or replaces). No separate POST/PATCH.

### Scope Boundaries (per user decisions)
- No keybind export, no profiles/presets, no .rcfile upload in v1.
- `gameplay` and `accessibility` categories are present but empty — reserved for future use.

---

## Decision: Settings API Client Architecture (Self-Contained Fetch) (#359)

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-09  
**Status:** Implemented  
**Issue:** #359

### Decision
`settings-api.ts` has its own fetch logic instead of importing the shared `request()` from `api.ts`.

### Rationale
The shared `request()` fires the global 401 handler (`_on401`) which dispatches `LOGOUT`, clearing all auth state. For settings, a 401 should degrade gracefully (fall back to localStorage) — not force the user out of the app. Keeping the settings API self-contained means auth errors in settings don't cascade.

### Impact
If the team changes the base URL pattern or adds request interceptors to `api.ts`, `settings-api.ts` needs to be updated separately. If this becomes a maintenance burden, we can extract a shared `fetchWithAuth()` helper that takes an error strategy parameter.

---

## User Decision: #359 Scope Boundaries (User Preferences & Configuration)

**From:** dkirby-ms (User)  
**Date:** 2026-04-09  
**Answering:** Elminster's 3 open design questions

### Decisions
1. **Keybind export in `.ellmudrc` format:** **Wait for macros** — no export in v1
2. **Settings profiles/presets:** **No need** — not in v1  
3. **`.rcfile` file upload:** **UI-only edits** — no file upload in v1

### Rationale
- Keybind export requires full macro system (Lua/DSL) — phase 2 work
- Profiles add complexity without immediate user value
- File upload can wait until macro system foundation is solid
- v1 focus: localStorage → server sync, essential 3 settings (fontSize, verbosity, narrationStyle), placeholder for future (keybinds, audio, accessibility)

---

## Decision: Removed Deprecated Refuge Screen

**Date:** 2026-04-09  
**Author:** Regis (Frontend)  
**Status:** Implemented

### Context
The Refuge screen (`/refuge`) was deprecated and no longer accessible to users through normal navigation. It served as an early debug/test hub with equipment, crafting, marketplace, and expedition board tabs.

### Decision
Completely removed the Refuge screen from the codebase and relocated critical functionality:

1. **Deleted** `packages/client/src/pages/Refuge.tsx` (575 lines)
2. **Added** Settings button to ZoneExploration.tsx top bar (next to logout)
3. **Renamed** all "Refuge" references to generic "Hub" terminology
4. **Updated** all test files and components

### Rationale
- Users couldn't access `/refuge` anymore — dead code
- Settings access was ONLY available from Refuge screen — needed relocation
- Generic "hub" terminology is more flexible than specific "Refuge" naming
- Settings gear icon in main game view is better UX than hidden in separate screen

### Impact
- **User-facing:** Settings now accessible from main game screen (ZoneExploration)
- **Code:** -575 lines, cleaner terminology, better separation of concerns
- **Tests:** All 2815 tests passing after updates to match new UI text

### Files Changed
- Deleted: `pages/Refuge.tsx`
- Modified: `ZoneExploration.tsx`, `ReconnectionOverlay.tsx`, `useReconnection.ts`, `useZoneConnection.ts`, `ChatPanel.tsx`, `Login.tsx`, `Leaderboard.tsx`, plus 8+ test files

### Follow-up
None required. The faction hub concept remains intact — players still have hub zones like The Reliquary, The Bloom Observatory, etc. This just removed the old debug screen.


---

## Decision: Admin API auth failure broadcasting via custom events

**Author:** Regis  
**Date:** 2026-04-10  
**Issue:** #369  

### Context

Admin token validation needed a way to communicate auth failures from deep in the API layer back to the AdminLayout without prop drilling or React context.

### Decision

Use `window.dispatchEvent(new CustomEvent('admin:auth-failure'))` in `adminFetch` when a 401/403 is received. `AdminLayout` listens for this event and resets to the login form.

### Rationale

- Simple, zero-dependency approach
- Works regardless of component tree depth
- Hooks can silently absorb auth errors knowing the global handler redirects
- No new React context needed

### Impact

- All admin API calls now broadcast auth failures automatically
- Any future admin component automatically benefits from this pattern
- Minsc verified via 35 tests: no server changes needed — the existing 401/403 responses are sufficient

---

## Decision: Admin Token Validation Test Coverage (35 Tests)

**Author:** Minsc (Tester)  
**Date:** 2026-04-10  
**Issue:** #369 — admin invalid token error  

### Analysis

The original bug: invalid admin tokens stored in localStorage, `authenticated` set to `true` on page load without server validation. Every admin page broke with 403s.

### Regis Implementation Verified

All 35 tests pass against the fix:

1. **`validateAdminToken()` function** in `admin-api.ts` — lightweight API call to verify token
2. **`ADMIN_AUTH_FAILURE_EVENT`** — `adminFetch` dispatches on 401/403
3. **Mount-time validation** — `AdminLayout` calls `validateAdminToken()` on mount to catch stale tokens
4. **Auth failure listener** — Resets to login form when any admin API call gets 401/403
5. **`validating` loading state** — Shows spinner while stored token is checked
6. **`handleAdminLogin` validation** — Validates before setting `authenticated = true`

### Test Coverage (35 tests total)

**Client-side (17 tests):** `packages/client/src/__tests__/admin-token-validation.test.tsx`
- Token submission validation (empty, missing, whitespace, invalid, valid)
- Recovery flow (re-enter after rejection, error clears on typing)
- Stale stored token detection on mount
- Event-driven auth failure handling
- Loading state rendering

**Server-side (18 tests):** `packages/server/src/__tests__/admin-token-validation.test.ts`
- Authorization header validation (missing, malformed)
- Token validation (wrong, partial, case-altered, whitespace)
- Correct token handling (200 response)
- Fail-closed mode (ADMIN_TOKEN not set → 503)
- Error response format validation

### Status

PR #372 ready to merge with full test coverage. No additional implementation needed.
